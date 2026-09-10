export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isTwitterConfigured() {
  return Boolean(
    (process.env.TWITTER_CLIENT_ID || process.env.AUTH_TWITTER_ID) &&
      (process.env.TWITTER_CLIENT_SECRET || process.env.AUTH_TWITTER_SECRET)
  );
}

export function getOAuthAvailability() {
  return {
    google: isGoogleConfigured(),
    twitter: isTwitterConfigured(),
  };
}
