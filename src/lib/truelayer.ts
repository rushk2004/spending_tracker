import { encrypt, decrypt } from "./crypto";

export type TrueLayerEnv = "sandbox" | "live";

export function getTrueLayerEnv(): TrueLayerEnv {
  return process.env.TRUELAYER_ENV === "live" ? "live" : "sandbox";
}

export function isTrueLayerConfigured() {
  return Boolean(process.env.TRUELAYER_CLIENT_ID && process.env.TRUELAYER_CLIENT_SECRET);
}

export function getTrueLayerStatus() {
  return {
    configured: isTrueLayerConfigured(),
    env: getTrueLayerEnv(),
    mockAvailable: true,
    redirectUri: getRedirectUri(),
  };
}

export function getAuthBase() {
  return getTrueLayerEnv() === "live"
    ? "https://auth.truelayer.com"
    : "https://auth.truelayer-sandbox.com";
}

export function getApiBase() {
  return getTrueLayerEnv() === "live"
    ? "https://api.truelayer.com"
    : "https://api.truelayer-sandbox.com";
}

export function getRedirectUri() {
  return (
    process.env.TRUELAYER_REDIRECT_URI ||
    `${process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/truelayer/callback`
  );
}

export function buildConnectUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.TRUELAYER_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    scope: "info accounts balance cards transactions offline_access",
    providers: "uk-ob-all uk-oauth-all",
    state,
    // Sandbox mock bank is available in console; users can also pick Revolut/Monzo etc. in live
  });
  return `${getAuthBase()}/?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.TRUELAYER_CLIENT_ID!,
    client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
    redirect_uri: getRedirectUri(),
    code,
  });
  const res = await fetch(`${getAuthBase()}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.TRUELAYER_CLIENT_ID!,
    client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
    refresh_token: refreshToken,
  });
  const res = await fetch(`${getAuthBase()}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

async function tlFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TrueLayer API ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export type TLAccount = {
  account_id: string;
  display_name?: string;
  account_type?: string;
  currency?: string;
  account_number?: { number?: string; iban?: string };
  provider?: { display_name?: string; provider_id?: string };
};

export type TLBalance = {
  currency?: string;
  available?: number;
  current?: number;
};

export type TLTransaction = {
  transaction_id: string;
  timestamp: string;
  description?: string;
  amount: number;
  currency?: string;
  transaction_type?: string;
  merchant_name?: string;
};

export async function fetchAccounts(accessToken: string) {
  const data = await tlFetch<{ results: TLAccount[] }>("/data/v1/accounts", accessToken);
  return data.results || [];
}

export async function fetchBalance(accessToken: string, accountId: string) {
  const data = await tlFetch<{ results: TLBalance[] }>(
    `/data/v1/accounts/${accountId}/balance`,
    accessToken
  );
  return data.results?.[0];
}

export async function fetchTransactions(accessToken: string, accountId: string, fromIso: string) {
  const data = await tlFetch<{ results: TLTransaction[] }>(
    `/data/v1/accounts/${accountId}/transactions?from=${encodeURIComponent(fromIso)}`,
    accessToken
  );
  return data.results || [];
}

export function encryptToken(token: string) {
  return encrypt(token);
}

export function decryptToken(enc: string) {
  return decrypt(enc);
}

export function mapAccountType(tlType?: string): "checking" | "savings" | "credit" {
  const t = (tlType || "").toLowerCase();
  if (t.includes("sav")) return "savings";
  if (t.includes("credit") || t.includes("card")) return "credit";
  return "checking";
}

/** Local sandbox demo data when TrueLayer credentials are absent or mock connect is used */
export function buildMockBankBundle(institution: "revolut" | "monzo" | "starling" = "revolut") {
  const names = {
    revolut: { id: "revolut", name: "Revolut" },
    monzo: { id: "monzo", name: "Monzo" },
    starling: { id: "starling", name: "Starling" },
  }[institution];

  const checkingId = `mock-${institution}-current`;
  const savingsId = `mock-${institution}-savings`;
  const now = Date.now();

  return {
    institution: names,
    accounts: [
      {
        account_id: checkingId,
        display_name: `${names.name} Current`,
        account_type: "TRANSACTION",
        currency: "GBP",
        account_number: { number: institution === "monzo" ? "12345678" : "87654321" },
        balance: 1842.55,
      },
      {
        account_id: savingsId,
        display_name: `${names.name} Savings`,
        account_type: "SAVINGS",
        currency: "GBP",
        account_number: { number: "11223344" },
        balance: 5200,
      },
    ],
    transactions: [
      {
        account_id: checkingId,
        transaction_id: `mock-tx-${now}-1`,
        timestamp: new Date(now - 86400000 * 1).toISOString(),
        description: "TESCO STORES",
        amount: -32.4,
        merchant_name: "Tesco",
      },
      {
        account_id: checkingId,
        transaction_id: `mock-tx-${now}-2`,
        timestamp: new Date(now - 86400000 * 2).toISOString(),
        description: "PRET A MANGER",
        amount: -8.5,
        merchant_name: "Pret A Manger",
      },
      {
        account_id: checkingId,
        transaction_id: `mock-tx-${now}-3`,
        timestamp: new Date(now - 86400000 * 3).toISOString(),
        description: "SALARY ACME LTD",
        amount: 2800,
        merchant_name: "Acme Ltd",
      },
      {
        account_id: checkingId,
        transaction_id: `mock-tx-${now}-4`,
        timestamp: new Date(now - 86400000 * 5).toISOString(),
        description: "TFL TRAVEL CHARGE",
        amount: -4.8,
        merchant_name: "TfL",
      },
      {
        account_id: checkingId,
        transaction_id: `mock-tx-${now}-5`,
        timestamp: new Date(now - 86400000 * 7).toISOString(),
        description: "NETFLIX.COM",
        amount: -15.99,
        merchant_name: "Netflix",
      },
      {
        account_id: savingsId,
        transaction_id: `mock-tx-${now}-6`,
        timestamp: new Date(now - 86400000 * 4).toISOString(),
        description: "INTEREST PAID",
        amount: 12.3,
        merchant_name: names.name,
      },
    ],
  };
}
