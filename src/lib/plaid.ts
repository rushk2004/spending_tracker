/** Optional Plaid EU stub — primary bank sync is GoCardless Bank Account Data. */
export function isPlaidConfigured() {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}
