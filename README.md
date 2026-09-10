# SpendWise — Personal Finance

Production-oriented personal finance app for **UK/EU** banking: connect **Revolut, Monzo, Starling** and other providers via **GoCardless Bank Account Data** (formerly Nordigen), see **together** totals and **per-account** balance + period spending, with email login that works from any device.

Stack: **Next.js App Router · TypeScript · Tailwind · Prisma · Postgres · Auth.js · GoCardless**

## Features

1. **Auth** — email/password (bcrypt) + optional Google & X (Twitter) via Auth.js; JWT sessions; protected routes; per-user isolation.
2. **Accounts** — auto-created from bank sync, or manual CRUD (checking/savings/credit) as fallback.
3. **Transactions** — CRUD + filters/search + CSV import; balances update for manual entries.
4. **Money dashboard** — together: total balance, period spend, period income, cashflow; each account: balance + period spend/income + % share bars; category pie; cashflow chart; period selector.
5. **Account detail** — `/accounts/[id]` with balance and period activity.
6. **Categories** — defaults on signup + custom.
7. **GoCardless Connect Bank** — searchable GB (and EU) institution list → bank authorise → sync balances & transactions. Sync shows last synced time, spinner, and clear success/errors. Manual + CSV remain secondary fallbacks.
8. **Developer extras** — optional sample data lives under **Settings** only (not in the primary Connect bank path).

## Quick start

```bash
cp .env.example .env
# set AUTH_SECRET (openssl rand -base64 32)
# set DATABASE_URL to Postgres
# set GoCardless SECRET_ID / SECRET_KEY (see below)

npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000 → register → **Connect your bank** → pick Revolut (or any GB bank).

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run db:push` | Push Prisma schema |
| `npm run db:seed` | Info seed |
| `npm run db:generate` | Generate Prisma Client |

## Environment variables

See `.env.example`.

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `AUTH_SECRET` | Yes | Encrypts sessions + bank linkage secrets at rest |
| `AUTH_URL` / `NEXTAUTH_URL` | Recommended | e.g. `https://YOUR_DOMAIN` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google social login |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | No | X social login |
| `GOCARDLESS_SECRET_ID` | Yes for real banks | Bank Account Data portal → User secrets |
| `GOCARDLESS_SECRET_KEY` | Yes for real banks | Bank Account Data portal → User secrets |
| `GOCARDLESS_REDIRECT_URI` | Recommended | Defaults to `AUTH_URL` + `/api/gocardless/callback` |

Without GoCardless secrets, the UI shows a clear empty state with a link to the portal — it does **not** push mock Revolut/Monzo/Starling as the primary path.

## GoCardless Bank Account Data setup

1. Open the [Bank Account Data portal](https://bankaccountdata.gocardless.com/) and create an account (free tier available).
2. Create **User secrets** (`secret_id` + `secret_key`).
3. Set environment variables:

```bash
GOCARDLESS_SECRET_ID=...
GOCARDLESS_SECRET_KEY=...
GOCARDLESS_REDIRECT_URI=https://YOUR_DOMAIN/api/gocardless/callback
AUTH_URL=https://YOUR_DOMAIN
```

Local redirect example: `http://localhost:3000/api/gocardless/callback`.

4. Redeploy / restart the app, sign in, click **Connect your bank**, search for **Revolut** (or Monzo, Starling, etc.), and authorise in the bank.

### Connect flow

1. User opens the searchable institution list (GB + common EU countries).
2. Selecting a bank creates a GoCardless **requisition** and redirects to the bank / GoCardless authorise UI.
3. Callback hits `/api/gocardless/callback` → requisition is stored **encrypted** (AES-256-GCM with `AUTH_SECRET`) → accounts, balances, and transactions are pulled.
4. **Sync now** refreshes all active GoCardless connections; last synced time is shown on the Connect card.

App-level access tokens are obtained from `secret_id` / `secret_key` and refreshed server-side; end-user bank access is represented by the requisition ID.

## Social login setup

### Google

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth client (Web).
2. Redirect: `https://YOUR_DOMAIN/api/auth/callback/google`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### X (Twitter)

1. [X Developer Portal](https://developer.x.com/) → OAuth 2.0.
2. Callback: `https://YOUR_DOMAIN/api/auth/callback/twitter`
3. Set `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET`.

## CSV import

```
date,amount,type,category,merchant,description,account
2026-08-03,86.42,expense,Groceries,Whole Foods,Weekly groceries,Everyday Checking
```

See `sample-transactions.csv`.

## Deploy on Vercel

1. Import the GitHub repo.
2. Use **Postgres** (Neon/Supabase/Vercel Postgres).
3. Set env vars: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL=https://YOUR_DOMAIN`, GoCardless secrets + redirect URI, optional Google/X.
4. Build: `prisma generate && prisma db push && next build`.
5. Ensure `GOCARDLESS_REDIRECT_URI` matches your production domain callback.

## License

MIT
