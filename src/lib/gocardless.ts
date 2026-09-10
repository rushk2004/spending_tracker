import { encrypt, decrypt } from "./crypto";

const API_BASE = "https://bankaccountdata.gocardless.com";

type TokenCache = {
  access: string;
  refresh: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

export function isGoCardlessConfigured() {
  return Boolean(process.env.GOCARDLESS_SECRET_ID && process.env.GOCARDLESS_SECRET_KEY);
}

export function getRedirectUri() {
  return (
    process.env.GOCARDLESS_REDIRECT_URI ||
    `${process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/gocardless/callback`
  );
}

export function getGoCardlessStatus() {
  return {
    configured: isGoCardlessConfigured(),
    redirectUri: getRedirectUri(),
    portalUrl: "https://bankaccountdata.gocardless.com/",
  };
}

export function encryptSecret(value: string) {
  return encrypt(value);
}

export function decryptSecret(enc: string) {
  return decrypt(enc);
}

async function requestToken(path: "/api/v2/token/new/" | "/api/v2/token/refresh/", body: Record<string, string>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GoCardless token ${path}: ${text}`);
  }
  return res.json() as Promise<{
    access: string;
    access_expires: number;
    refresh: string;
    refresh_expires: number;
  }>;
}

export async function getAccessToken(): Promise<string> {
  if (!isGoCardlessConfigured()) {
    throw new Error("GoCardless is not configured");
  }

  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.access;
  }

  if (tokenCache?.refresh) {
    try {
      const refreshed = await requestToken("/api/v2/token/refresh/", {
        refresh: tokenCache.refresh,
      });
      tokenCache = {
        access: refreshed.access,
        refresh: refreshed.refresh || tokenCache.refresh,
        expiresAt: Date.now() + (refreshed.access_expires || 86400) * 1000,
      };
      return tokenCache.access;
    } catch {
      tokenCache = null;
    }
  }

  const created = await requestToken("/api/v2/token/new/", {
    secret_id: process.env.GOCARDLESS_SECRET_ID!,
    secret_key: process.env.GOCARDLESS_SECRET_KEY!,
  });
  tokenCache = {
    access: created.access,
    refresh: created.refresh,
    expiresAt: Date.now() + (created.access_expires || 86400) * 1000,
  };
  return tokenCache.access;
}

async function gcFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const access = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${access}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GoCardless API ${path}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type GCInstitution = {
  id: string;
  name: string;
  bic?: string;
  logo?: string;
  countries?: string[];
  transaction_total_days?: string;
};

export type GCRequisition = {
  id: string;
  status: string;
  link: string;
  reference?: string;
  institution_id?: string;
  accounts: string[];
};

export type GCAccountDetails = {
  id?: string;
  iban?: string;
  currency?: string;
  ownerName?: string;
  name?: string;
  product?: string;
  cashAccountType?: string;
  resourceId?: string;
};

export type GCBalance = {
  balanceAmount: { amount: string; currency: string };
  balanceType?: string;
  referenceDate?: string;
};

export type GCTransaction = {
  transactionId?: string;
  internalTransactionId?: string;
  bookingDate?: string;
  valueDate?: string;
  bookingDateTime?: string;
  valueDateTime?: string;
  transactionAmount: { amount: string; currency: string };
  remittanceInformationUnstructured?: string;
  remittanceInformationUnstructuredArray?: string[];
  creditorName?: string;
  debtorName?: string;
  proprietaryBankTransactionCode?: string;
};

const DEFAULT_COUNTRIES = ["gb", "ie", "de", "fr", "nl", "es", "it", "pt", "at", "be", "fi", "se", "no", "dk", "pl"];

export async function listInstitutions(countries: string[] = ["gb"]) {
  const unique = new Map<string, GCInstitution>();
  for (const country of countries) {
    const rows = await gcFetch<GCInstitution[]>(
      `/api/v2/institutions/?country=${encodeURIComponent(country.toLowerCase())}`
    );
    for (const row of rows || []) {
      if (!unique.has(row.id)) unique.set(row.id, row);
    }
  }
  return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listInstitutionsGbPlusEu() {
  // Prefer GB first fetch; include common EU/EEA codes for Revolut/etc availability
  return listInstitutions(DEFAULT_COUNTRIES);
}

export async function createEndUserAgreement(institutionId: string) {
  return gcFetch<{ id: string }>("/api/v2/agreements/enduser/", {
    method: "POST",
    body: JSON.stringify({
      institution_id: institutionId,
      max_historical_days: 90,
      access_valid_for_days: 90,
      access_scope: ["balances", "details", "transactions"],
    }),
  });
}

export async function createRequisition(opts: {
  institutionId: string;
  reference: string;
  agreementId?: string;
}) {
  const body: Record<string, string> = {
    redirect: getRedirectUri(),
    institution_id: opts.institutionId,
    reference: opts.reference,
    user_language: "EN",
  };
  if (opts.agreementId) body.agreement = opts.agreementId;

  return gcFetch<GCRequisition>("/api/v2/requisitions/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getRequisition(requisitionId: string) {
  return gcFetch<GCRequisition>(`/api/v2/requisitions/${requisitionId}/`);
}

export async function deleteRequisition(requisitionId: string) {
  try {
    await gcFetch(`/api/v2/requisitions/${requisitionId}/`, { method: "DELETE" });
  } catch {
    // Best-effort revoke
  }
}

export async function fetchAccountMetadata(accountId: string) {
  return gcFetch<{
    id: string;
    created?: string;
    last_accessed?: string;
    iban?: string;
    institution_id?: string;
    status?: string;
    owner_name?: string;
  }>(`/api/v2/accounts/${accountId}/`);
}

export async function fetchAccountDetails(accountId: string) {
  const data = await gcFetch<{ account: GCAccountDetails }>(`/api/v2/accounts/${accountId}/details/`);
  return data.account;
}

export async function fetchBalances(accountId: string) {
  const data = await gcFetch<{ balances: GCBalance[] }>(`/api/v2/accounts/${accountId}/balances/`);
  return data.balances || [];
}

export async function fetchTransactions(accountId: string, dateFrom?: string) {
  const qs = dateFrom ? `?date_from=${encodeURIComponent(dateFrom)}` : "";
  const data = await gcFetch<{
    transactions: { booked?: GCTransaction[]; pending?: GCTransaction[] };
  }>(`/api/v2/accounts/${accountId}/transactions/${qs}`);
  return {
    booked: data.transactions?.booked || [],
    pending: data.transactions?.pending || [],
  };
}

export function pickBalanceAmount(balances: GCBalance[]): { amount: number; currency: string } {
  const preferred = ["interimAvailable", "expected", "closingBooked", "openingBooked", "interimBooked"];
  for (const type of preferred) {
    const match = balances.find((b) => b.balanceType === type);
    if (match) {
      return {
        amount: parseFloat(match.balanceAmount.amount),
        currency: match.balanceAmount.currency || "GBP",
      };
    }
  }
  const first = balances[0];
  if (!first) return { amount: 0, currency: "GBP" };
  return {
    amount: parseFloat(first.balanceAmount.amount),
    currency: first.balanceAmount.currency || "GBP",
  };
}

export function mapAccountType(cashAccountType?: string, product?: string): "checking" | "savings" | "credit" {
  const t = `${cashAccountType || ""} ${product || ""}`.toLowerCase();
  if (t.includes("svg") || t.includes("sav")) return "savings";
  if (t.includes("credit") || t.includes("card") || t.includes("ccrd")) return "credit";
  return "checking";
}

export function transactionExternalId(t: GCTransaction, accountId: string) {
  return (
    t.transactionId ||
    t.internalTransactionId ||
    `gc-${accountId}-${t.bookingDate || t.valueDate || "na"}-${t.transactionAmount.amount}-${(
      t.remittanceInformationUnstructured ||
      t.creditorName ||
      t.debtorName ||
      ""
    ).slice(0, 40)}`
  );
}

export function transactionDate(t: GCTransaction): Date {
  const raw = t.bookingDateTime || t.valueDateTime || t.bookingDate || t.valueDate;
  return raw ? new Date(raw) : new Date();
}

export function transactionDescription(t: GCTransaction): string | null {
  if (t.remittanceInformationUnstructured) return t.remittanceInformationUnstructured;
  if (t.remittanceInformationUnstructuredArray?.length) {
    return t.remittanceInformationUnstructuredArray.join(" ");
  }
  return null;
}

export function transactionMerchant(t: GCTransaction): string | null {
  return t.creditorName || t.debtorName || null;
}
