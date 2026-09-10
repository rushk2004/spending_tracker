/** Plaid EU is documented as an alternative in README. Primary bank sync is TrueLayer. */
export function isPlaidConfigured() {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}
