# Cricket Dues Tracker

Next.js app that tracks cricket match fees per player in a spreadsheet-style grid. Public read view; admin can manage players, add sessions, and toggle paid/unpaid.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Turso (libSQL) via `@libsql/client`
- HTTP-only `admin_session` cookie (JWT via `jose`)
- `bcryptjs` for password hashing

## Setup

### 1. Turso database

1. Install the [Turso CLI](https://docs.turso.tech/cli) and sign in.
2. Create a database:

```bash
turso db create cricket-dues
turso db show cricket-dues --url
turso db tokens create cricket-dues
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | libSQL URL from Turso |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `AUTH_SECRET` | Long random string used to sign JWTs |
| `NEXT_PUBLIC_APP_URL` | Public site URL for WhatsApp dues links (e.g. `https://your-app.vercel.app`) |

### 3. Install & seed

```bash
npm install
npm run seed
```

Seed creates tables (`players`, `sessions`, `dues`, `admin_users`) and upserts admin:

- Username: `arslan344`
- Password: `cricketaA!`

### 4. Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Login at `/login`.

## Features

- **Public `/`**: sticky player column + sticky session headers (`12 Jul · Rs 2400`), muted rose unpaid / sage paid cells, unpaid totals column
- **Admin**: player CRUD (soft deactivate / reactivate, optional WhatsApp phone), add payment (date default today, ceil-split among checked active players), toggle cell paid, mark all paid for a date
- **WhatsApp (admin-assisted)**: after adding a payment, open pre-filled `wa.me` links per player who has a phone number
- Currency shown as **Rs** integers only

## Deploy on Vercel

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Add the same env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`.
4. Deploy. Run `npm run seed` once against production (locally with production env, or via a one-off script) so tables and the admin user exist.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run seed` | Create schema + seed admin |

## Schema

See `src/lib/schema.sql`.
