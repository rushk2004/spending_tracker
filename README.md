# SpendWise — Personal Finance

Production-oriented personal finance app for **UK/EU** banking: connect **Revolut, Monzo, Starling** and other providers via **TrueLayer Open Banking (live)**, see **together** totals and **per-account** balance + period spending, with email login that works from any device.

Stack: **Next.js App Router · TypeScript · Tailwind · Prisma · Postgres · Auth.js · TrueLayer**

## Features

1. **Auth** — email/password (bcrypt) + optional Google & X (Twitter) via Auth.js; JWT sessions; protected routes; per-user isolation.
2. **Accounts** — auto-created from bank sync, or manual CRUD (checking/savings/credit) as fallback.
3. **Transactions** — CRUD + filters/search + CSV import; balances update for manual entries.
4. **Money dashboard** — together: total balance, period spend, period income, cashflow; each account: balance + period spend/income + % share bars; category pie; cashflow chart; period selector.
5. **Account detail** — `/accounts/[id]` with balance and period activity.
6. **Categories** — defaults on signup + custom.
7. **TrueLayer Connect Bank** — real Open Banking authorize flow when credentials are set (`TRUELAYER_ENV=live`). Sync shows last synced time, spinner, and clear success/errors. Manual + CSV remain secondary fallbacks.
8. **Developer extras** — optional sample data lives under **Settings** only (not in the primary Connect bank path).

## Quick start

```bash
cp .env.example .env
# set AUTH_SECRET (openssl rand -base64 32)
# set DATABASE_URL to Postgres
# set TrueLayer live Client ID/Secret (see below)

npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000 → register → **Connect your bank**.

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
| `AUTH_SECRET` | Yes | Encrypts sessions + bank tokens at rest |
| `AUTH_URL` / `NEXTAUTH_URL` | Recommended | e.g. `https://YOUR_DOMAIN` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google social login |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | No | X social login |
| `TRUELAYER_CLIENT_ID` | Yes for real banks | TrueLayer Console → Application |
| `TRUELAYER_CLIENT_SECRET` | Yes for real banks | TrueLayer Console → Application |
| `TRUELAYER_ENV` | Recommended | **`live`** (default). Use `sandbox` only for TrueLayer console mock providers while developing. |
| `TRUELAYER_REDIRECT_URI` | Yes for bank connect | Must match Console redirect URI exactly |

Without TrueLayer credentials, the UI shows a clear **Connect your bank** empty state explaining how to add live credentials — it does **not** push mock Revolut/Monzo/Starling as the primary path.

## TrueLayer live setup (real UK/EU banks)

1. Create an application in the [TrueLayer Console](https://console.truelayer.com/).
2. Use the **Live** environment (not Sandbox) for production banks such as Revolut, Monzo, Starling, and Open Banking high-street providers.
3. Enable **Data API** products: accounts, balance, transactions (and cards if needed).
4. Copy your **Client ID** and **Client Secret**.
5. Add redirect URIs (exact match required):
   - Local: `http://localhost:3000/api/truelayer/callback`
   - Production: `https://YOUR_DOMAIN/api/truelayer/callback`
6. Set environment variables:

```bash
TRUELAYER_CLIENT_ID=...
TRUELAYER_CLIENT_SECRET=...
TRUELAYER_ENV=live
TRUELAYER_REDIRECT_URI=https://YOUR_DOMAIN/api/truelayer/callback
AUTH_URL=https://YOUR_DOMAIN
```

7. Redeploy / restart the app, sign in, and click **Connect your bank**.

Coverage of specific banks depends on your TrueLayer plan and provider availability (`providers=uk-ob-all`).

### Advanced: TrueLayer sandbox

For TrueLayer’s own mock providers during integration testing, set `TRUELAYER_ENV=sandbox` and use sandbox credentials/redirects from the Console. This is a **dev note only** — the product UI defaults to live messaging.

### Connect flow

1. User clicks **Connect your bank**.
2. Browser redirects to TrueLayer Auth → user selects institution → authorises in bank website/app.
3. Callback hits `/api/truelayer/callback` → code exchanged for tokens → tokens stored **encrypted** (AES-256-GCM with `AUTH_SECRET`).
4. Accounts, balances, and transactions are pulled into Prisma models.
5. **Sync now** refreshes all active TrueLayer connections; last synced time is shown on the Connect card.

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
3. Set env vars: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL=https://YOUR_DOMAIN`, TrueLayer live vars, optional Google/X.
4. Build: `prisma generate && prisma db push && next build`.
5. Register TrueLayer + OAuth callback URLs for the production domain.

## License

MIT
