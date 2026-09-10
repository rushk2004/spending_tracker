import { subDays } from "date-fns";
import { prisma } from "./prisma";
import {
  decryptToken,
  encryptToken,
  fetchAccounts,
  fetchBalance,
  fetchTransactions,
  mapAccountType,
  refreshAccessToken,
  isTrueLayerConfigured,
  buildMockBankBundle,
} from "./truelayer";

async function getValidAccessToken(connectionId: string) {
  const conn = await prisma.bankConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new Error("Connection not found");

  if (conn.provider === "mock") {
    return { conn, accessToken: "mock" };
  }

  let accessToken = decryptToken(conn.accessTokenEnc);
  const needsRefresh =
    conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 60_000 && conn.refreshTokenEnc;

  if (needsRefresh && isTrueLayerConfigured() && conn.refreshTokenEnc) {
    const refreshed = await refreshAccessToken(decryptToken(conn.refreshTokenEnc));
    accessToken = refreshed.access_token;
    await prisma.bankConnection.update({
      where: { id: conn.id },
      data: {
        accessTokenEnc: encryptToken(refreshed.access_token),
        refreshTokenEnc: refreshed.refresh_token
          ? encryptToken(refreshed.refresh_token)
          : conn.refreshTokenEnc,
        expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      },
    });
  }

  return { conn, accessToken };
}

export async function syncBankConnection(connectionId: string, userId: string) {
  const { conn, accessToken } = await getValidAccessToken(connectionId);
  if (conn.userId !== userId) throw new Error("Unauthorized");

  if (conn.provider === "mock") {
    return syncMockConnection(conn.id, userId, conn.institutionId || "revolut");
  }

  const tlAccounts = await fetchAccounts(accessToken);
  const fromIso = subDays(new Date(), 90).toISOString();
  let txCount = 0;

  for (const tla of tlAccounts) {
    const bal = await fetchBalance(accessToken, tla.account_id);
    const balance = bal?.current ?? bal?.available ?? 0;
    const last4 = tla.account_number?.number?.slice(-4) || null;
    const type = mapAccountType(tla.account_type);
    const nickname =
      tla.display_name ||
      `${tla.provider?.display_name || conn.institutionName || "Bank"} ${type}`;

    let account = await prisma.account.findFirst({
      where: { userId, externalId: tla.account_id },
    });

    if (account) {
      account = await prisma.account.update({
        where: { id: account.id },
        data: {
          nickname,
          type,
          last4,
          balance,
          currency: tla.currency || "GBP",
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
          balance,
          currency: tla.currency || "GBP",
          externalId: tla.account_id,
          bankConnectionId: conn.id,
        },
      });
    }

    const txs = await fetchTransactions(accessToken, tla.account_id, fromIso);
    for (const t of txs) {
      const existing = await prisma.transaction.findFirst({
        where: { userId, externalId: t.transaction_id },
      });
      if (existing) continue;
      const amount = Math.abs(t.amount);
      const txType = t.amount >= 0 ? "income" : "expense";
      await prisma.transaction.create({
        data: {
          userId,
          accountId: account.id,
          type: txType,
          amount,
          date: new Date(t.timestamp),
          description: t.description || null,
          merchant: t.merchant_name || null,
          externalId: t.transaction_id,
        },
      });
      txCount++;
    }

    // Recompute balance from TrueLayer balance (source of truth), already set above
  }

  // Prefer provider display name from first account
  const institutionName =
    tlAccounts[0]?.provider?.display_name || conn.institutionName || "Connected bank";

  await prisma.bankConnection.update({
    where: { id: conn.id },
    data: {
      lastSyncedAt: new Date(),
      institutionName,
      institutionId: tlAccounts[0]?.provider?.provider_id || conn.institutionId,
      status: "active",
    },
  });

  return { accounts: tlAccounts.length, transactions: txCount };
}

async function syncMockConnection(connectionId: string, userId: string, institutionId: string) {
  const inst = (["revolut", "monzo", "starling"].includes(institutionId)
    ? institutionId
    : "revolut") as "revolut" | "monzo" | "starling";
  const bundle = buildMockBankBundle(inst);
  let txCount = 0;

  for (const a of bundle.accounts) {
    let account = await prisma.account.findFirst({
      where: { userId, externalId: a.account_id },
    });
    const type = mapAccountType(a.account_type);
    if (account) {
      account = await prisma.account.update({
        where: { id: account.id },
        data: {
          nickname: a.display_name,
          type,
          last4: a.account_number.number.slice(-4),
          balance: a.balance,
          currency: a.currency,
          bankConnectionId: connectionId,
        },
      });
    } else {
      account = await prisma.account.create({
        data: {
          userId,
          nickname: a.display_name,
          type,
          last4: a.account_number.number.slice(-4),
          balance: a.balance,
          currency: a.currency,
          externalId: a.account_id,
          bankConnectionId: connectionId,
        },
      });
    }

    for (const t of bundle.transactions.filter((x) => x.account_id === a.account_id)) {
      const existing = await prisma.transaction.findFirst({
        where: { userId, externalId: t.transaction_id },
      });
      if (existing) continue;
      await prisma.transaction.create({
        data: {
          userId,
          accountId: account.id,
          type: t.amount >= 0 ? "income" : "expense",
          amount: Math.abs(t.amount),
          date: new Date(t.timestamp),
          description: t.description,
          merchant: t.merchant_name,
          externalId: t.transaction_id,
        },
      });
      txCount++;
    }
  }

  await prisma.bankConnection.update({
    where: { id: connectionId },
    data: {
      lastSyncedAt: new Date(),
      institutionName: bundle.institution.name,
      institutionId: bundle.institution.id,
      status: "active",
    },
  });

  return { accounts: bundle.accounts.length, transactions: txCount };
}

export async function createMockConnection(userId: string, institution: "revolut" | "monzo" | "starling") {
  const bundle = buildMockBankBundle(institution);
  const conn = await prisma.bankConnection.create({
    data: {
      userId,
      provider: "mock",
      accessTokenEnc: encryptToken(`mock-${institution}`),
      institutionId: bundle.institution.id,
      institutionName: bundle.institution.name,
      status: "active",
    },
  });
  const result = await syncMockConnection(conn.id, userId, institution);
  return { connectionId: conn.id, ...result };
}
