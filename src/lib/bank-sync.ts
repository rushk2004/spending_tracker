import { format, subDays } from "date-fns";
import { prisma } from "./prisma";
import {
  decryptSecret,
  deleteRequisition,
  fetchAccountDetails,
  fetchAccountMetadata,
  fetchBalances,
  fetchTransactions,
  getRequisition,
  isGoCardlessConfigured,
  mapAccountType,
  pickBalanceAmount,
  transactionDate,
  transactionDescription,
  transactionExternalId,
  transactionMerchant,
} from "./gocardless";

export async function syncBankConnection(connectionId: string, userId: string) {
  const conn = await prisma.bankConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new Error("Connection not found");
  if (conn.userId !== userId) throw new Error("Unauthorized");

  if (conn.provider !== "gocardless") {
    throw new Error(`Unsupported bank provider: ${conn.provider}`);
  }
  if (!isGoCardlessConfigured()) {
    throw new Error("GoCardless is not configured");
  }

  const requisitionId = decryptSecret(conn.accessTokenEnc);
  const requisition = await getRequisition(requisitionId);
  const accountIds = requisition.accounts || [];

  if (!accountIds.length) {
    await prisma.bankConnection.update({
      where: { id: conn.id },
      data: { status: requisition.status === "LN" ? "active" : "pending", lastSyncedAt: new Date() },
    });
    return { accounts: 0, transactions: 0 };
  }

  const dateFrom = format(subDays(new Date(), 90), "yyyy-MM-dd");
  let txCount = 0;
  const institutionName = conn.institutionName || "Connected bank";
  let institutionId = conn.institutionId || requisition.institution_id || null;

  for (const accountId of accountIds) {
    const [meta, details, balances, txs] = await Promise.all([
      fetchAccountMetadata(accountId).catch(() => null),
      fetchAccountDetails(accountId).catch(() => null),
      fetchBalances(accountId),
      fetchTransactions(accountId, dateFrom),
    ]);

    if (meta?.institution_id) institutionId = meta.institution_id;
    const bal = pickBalanceAmount(balances);
    const iban = details?.iban || meta?.iban || "";
    const last4 = iban ? iban.replace(/\s/g, "").slice(-4) : null;
    const type = mapAccountType(details?.cashAccountType, details?.product);
    const nickname =
      details?.name ||
      details?.product ||
      meta?.owner_name ||
      `${institutionName} ${type === "checking" ? "Current" : type}`;

    let account = await prisma.account.findFirst({
      where: { userId, externalId: accountId },
    });

    if (account) {
      account = await prisma.account.update({
        where: { id: account.id },
        data: {
          nickname,
          type,
          last4,
          balance: bal.amount,
          currency: bal.currency || details?.currency || "GBP",
          bankConnectionId: conn.id,
        },
      });
    } else {
      account = await prisma.account.create({
        data: {
          userId,
          nickname,
          type,
          last4,
          balance: bal.amount,
          currency: bal.currency || details?.currency || "GBP",
          externalId: accountId,
          bankConnectionId: conn.id,
        },
      });
    }

    const allTx = [...txs.booked, ...txs.pending];
    for (const t of allTx) {
      const externalId = transactionExternalId(t, accountId);
      const existing = await prisma.transaction.findFirst({
        where: { userId, externalId },
      });
      if (existing) continue;

      const rawAmount = parseFloat(t.transactionAmount.amount);
      if (Number.isNaN(rawAmount)) continue;

      await prisma.transaction.create({
        data: {
          userId,
          accountId: account.id,
          type: rawAmount >= 0 ? "income" : "expense",
          amount: Math.abs(rawAmount),
          date: transactionDate(t),
          description: transactionDescription(t),
          merchant: transactionMerchant(t),
          externalId,
        },
      });
      txCount++;
    }
  }

  await prisma.bankConnection.update({
    where: { id: conn.id },
    data: {
      lastSyncedAt: new Date(),
      institutionName,
      institutionId,
      status: "active",
    },
  });

  return { accounts: accountIds.length, transactions: txCount };
}

export async function revokeBankConnection(connectionId: string, userId: string) {
  const conn = await prisma.bankConnection.findFirst({
    where: { id: connectionId, userId },
  });
  if (!conn) return;

  if (conn.provider === "gocardless" && isGoCardlessConfigured()) {
    try {
      const requisitionId = decryptSecret(conn.accessTokenEnc);
      await deleteRequisition(requisitionId);
    } catch {
      // ignore revoke errors
    }
  }

  await prisma.account.updateMany({
    where: { bankConnectionId: conn.id },
    data: { bankConnectionId: null },
  });
  await prisma.bankConnection.delete({ where: { id: conn.id } });
}
