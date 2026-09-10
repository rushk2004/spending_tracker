# SpendWise — Personal Spending Tracker

Emma-style money overview for **UK/EU** banking: connect Revolut, Monzo, Starling and more via **TrueLayer Open Banking**, see **together** totals and **per-account** balance + period spending, with email/social login that works from any device.

Stack: **Next.js App Router · TypeScript · Tailwind · Prisma · SQLite (local) / Postgres (prod) · Auth.js · TrueLayer**

## Features

1. **Auth** — email/password (bcrypt) + optional Google & X (Twitter) via Auth.js; JWT sessions; protected routes; per-user isolation. Same email across credentials + OAuth links to one user when possible.
2. **Accounts** — manual CRUD (checking/savings/credit) **or** auto-created from bank sync.
3. **Transactions** — CRUD + filters/search + CSV import; balances update for manual entries.
4. **Money dashboard (Emma-style)** — together: total balance, period spend, period income, cashflow; each bank: balance + period spend + % of spend; category pie; cashflow bars; period selector (this month / last month / last 30 days).
5. **Account detail** — `/accounts/[id]` with balance and period activity.
6. **Categories** — defaults on signup + custom.
7. **TrueLayer Connect Bank (required sync path)** — pick institution → authorize in bank app/web → return → accounts, balances, transactions sync. Sandbox/mock demo works without production keys. Manual + CSV remain fallbacks.
8. **Demo data** button for empty workspaces.

## Quick start

```bash
cp .env.example .env
# set AUTH_SECRET (openssl rand -base64 32)

npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000 → register → **Connect bank** → **Try sandbox banks** (Revolut/Monzo/Starling) or load demo data.

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
| `DATABASE_URL` | Yes | `file:./dev.db` locally; Postgres on Vercel |
| `AUTH_SECRET` | Yes | Encrypts sessions + bank tokens at rest |
| `AUTH_URL` / `NEXTAUTH_URL` | Recommended | e.g. `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google social login |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | No | X social login |
| `TRUELAYER_CLIENT_ID` / `TRUELAYER_CLIENT_SECRET` | For live OB | TrueLayer console |
| `TRUELAYER_ENV` | No | `sandbox` (default) or `live` |
| `TRUELAYER_REDIRECT_URI` | Recommended | Must match console redirect URI |

Without TrueLayer credentials, **Try sandbox banks** still runs a full local authorize→sync simulation so Connect Bank is never a dead end.

## TrueLayer setup (UK/EU Open Banking)

1. Create an app in the [TrueLayer Console](https://console.truelayer.com/).
2. Enable **Data API** products: accounts, balance, transactions (and cards if needed).
3. Add redirect URIs:
   - Local: `http://localhost:3000/api/truelayer/callback`
   - Vercel: `https://YOUR_DOMAIN/api/truelayer/callback`
4. Copy **Client ID** and **Client Secret** into `.env` / Vercel env.
5. Set `TRUELAYER_ENV=sandbox` while testing; use TrueLayer’s mock bank providers in sandbox.
6. Set `TRUELAYER_ENV=live` for production UK/EU banks (Revolut, Monzo, Starling, high-street, etc.). Coverage depends on your TrueLayer plan and provider availability.

### Connect flow (what we ship)

1. User clicks **Connect with TrueLayer** (or picks a sandbox bank).
2. Browser redirects to TrueLayer Auth → user selects institution → authorizes in bank website/app (OAuth).
3. Callback hits `/api/truelayer/callback` → code exchanged for tokens → tokens stored **encrypted** (AES-256-GCM with `AUTH_SECRET`).
4. `/data/v1/accounts`, balances, and transactions are pulled and mapped into `Account` + `Transaction`.
5. **Sync now** refreshes on demand; `/api/truelayer/webhook` is a stub for TrueLayer data webhooks / periodic jobs in production.

### Production upgrade notes

- Move `DATABASE_URL` to Postgres; set Prisma `provider = "postgresql"`.
- Use `TRUELAYER_ENV=live` and production redirect URIs.
- Register webhook URL `https://YOUR_DOMAIN/api/truelayer/webhook` in TrueLayer console.
- Optionally schedule a cron (Vercel Cron) that POSTs `/api/truelayer/sync` for each user connection.

### Plaid EU (alternative)

Plaid also supports UK/EU institutions. This app’s **working** Connect Bank path is TrueLayer. You can evaluate Plaid EU later; env placeholders are listed in `.env.example` for reference only.

## Social login setup

### Google

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth client (Web).
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` and `https://YOUR_DOMAIN/api/auth/callback/google`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### X (Twitter)

1. [X Developer Portal](https://developer.x.com/) → Project/App → User authentication OAuth 2.0.
2. Callback: `http://localhost:3000/api/auth/callback/twitter` and production equivalent.
3. Set `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET`.
4. Request email permission; if X does not return email, linking cannot complete (error shown on login).

### Account linking

If a user already registered with email/password and later signs in with Google/X using the **same email**, we link to the existing user (`allowDangerousEmailAccountLinking`). Limitation: providers that omit email cannot be linked safely; OAuth-only users can later set a password via register with the same email.

## CSV import

```
date,amount,type,category,merchant,description,account
2026-08-03,86.42,expense,Groceries,Whole Foods,Weekly groceries,Everyday Checking
```

See `sample-transactions.csv`.

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial SpendWise app"
gh repo create spending_tracker --private --source=. --remote=origin --push
```

Do not commit `.env`.

## Deploy on Vercel

1. Import the GitHub repo.
2. Use **Postgres** (Neon/Supabase/Vercel Postgres). Change Prisma datasource `provider` to `postgresql`.
3. Set env vars: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL=https://YOUR_DOMAIN`, optional Google/X/TrueLayer.
4. Build command: `prisma generate && prisma db push && next build` (or run `db push` once against prod).
5. Add TrueLayer + OAuth callback URLs for the production domain.

## License

MIT
