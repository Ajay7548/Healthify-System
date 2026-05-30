# Healthcare Dashboard

A small but production-minded healthcare dashboard. Patients sign in to see their
latest health report and trends; admins search patients, drill into a record, and
bulk-import reports from CSV. Built as a React SPA backed by a separate Express
REST API and MongoDB.

- **Frontend** — React 19 + Vite (SPA)
- **Backend** — Node.js + Express 5 (REST API)
- **Database** — MongoDB + Mongoose
- **Auth** — JWT access + refresh tokens with rotation and reuse-detection

> Plain JavaScript throughout (ESM), in a pnpm monorepo with a shared validation
> package so the client and server can't drift apart.

## Live demo

|         | URL                               |
| ------- | --------------------------------- |
| Web app | `https://<your-app>.vercel.app`   |
| API     | `https://<your-api>.onrender.com` |

> **Cold start:** the API runs on Render's free tier and sleeps after ~15 minutes
> idle, so the first request after a nap can take 30–60s while it wakes. Subsequent
> requests are fast. (A $7/mo Render instance removes the sleep entirely.)

## Demo accounts

`pnpm --filter @hc/api db:seed` creates the accounts below. **Passwords are
case-sensitive.** The seed is idempotent — re-running it never changes them.

**Admin** — sees the Admin Portal (patient search, detail, CSV upload):

| Email                   | Password    |
| ----------------------- | ----------- |
| `admin@healthcare.test` | `Admin123!` |

**Featured patients** — Patient Portal, each with ~6 months of report history:

| Email                          | Password      | Notes                                                           |
| ------------------------------ | ------------- | --------------------------------------------------------------- |
| `jane.doe@healthcare.test`     | `Patient123!` | Healthy, in-range readings                                      |
| `john.smith@healthcare.test`   | `Patient123!` | Borderline-high readings (HIGH flags + crossed reference lines) |
| `maria.garcia@healthcare.test` | `Patient123!` | Healthy                                                         |

**Filler patients** — ~27 more patients so the admin list paginates and search has
results. All use password `Patient123!` and are emailed `firstname.lastname@healthcare.test`
(e.g. `liam.johnson@healthcare.test`, `olivia.williams@healthcare.test`). A few are
intentionally **inactive** to exercise the status filter.

> The admin email/password come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in
> `apps/api/.env` — the values above are the `.env.example` defaults. If you changed
> them, your admin login matches what you set. The shared patient password is a demo
> convenience (and is flagged as such in the seed).

## What it does

**Patient portal**

- Email/password login with protected routes
- Dashboard with the latest report (per-metric values, reference ranges, flags,
  and change-since-last)
- Interactive trend chart per metric, with the reference range drawn in
- Full, paginated report history
- Responsive across phone, tablet and desktop

**Admin portal**

- Patient search (debounced) with role/status filters, sortable, paginated
- Patient detail with their report history
- CSV upload with a first-rows preview, an inserted/skipped/failed summary, and the
  exact failing rows; idempotent re-imports; an audit log of every upload

## Architecture

See **[docs/architecture.md](docs/architecture.md)** for the system topology and
the auth and CSV-ingestion flows (diagrams render on GitHub).

In one line: the browser loads the SPA from a CDN; the SPA calls the Express API
over HTTPS with a Bearer access token; the API validates, authorizes and talks to
MongoDB. A short access token plus a rotating, server-side-hashed refresh token
gives revocable sessions without cookies.

## Project structure

```
health-care-project/
├─ apps/
│  ├─ web/                  # React + Vite SPA
│  │  └─ src/
│  │     ├─ app/            # router, providers, route guards, query client
│  │     ├─ features/       # vertical slices: auth, reports, admin, uploads
│  │     ├─ components/     # ui/ primitives + common/ (DataState, Pagination…)
│  │     ├─ layouts/        # AuthLayout, AppShell (responsive nav)
│  │     ├─ lib/            # api-client (single-flight refresh), token-store
│  │     └─ pages/          # one component per route
│  └─ api/                  # Express REST API — the only backend
│     └─ src/
│        ├─ config/         # env (Zod, fail-fast), logger, db
│        ├─ middleware/     # authenticate, requireRole, validate, errors, upload…
│        ├─ modules/        # feature-first: auth, users, reports, uploads, health
│        ├─ common/         # errors, response envelope, pagination, password, dedupe
│        └─ db/seed.js      # idempotent seed (admin + demo patients + history)
├─ packages/
│  └─ shared/               # @hc/shared — Zod schemas shared by both apps
├─ seed/                    # sample CSVs (clean + intentionally broken)
├─ docs/architecture.md     # diagrams + design notes
├─ docker-compose.yml       # one-command local backend (Mongo + API + browser)
└─ .github/workflows/ci.yml # lint -> test -> build
```

The API follows a conventional layering — **routes → controllers → services →
repositories** — so HTTP concerns, business logic and data access stay separate and
testable.

## Running locally

**Prerequisites:** Node ≥ 20.19, pnpm 10, and either a local MongoDB on `:27017`
or Docker.

```bash
pnpm install
```

### Option A — local MongoDB (fastest for development)

```bash
cp apps/api/.env.example apps/api/.env     # defaults point at localhost:27017
cp apps/web/.env.example apps/web/.env
pnpm --filter @hc/api db:seed              # admin + demo patients with history
pnpm dev                                   # API on :4000, web on :5173
```

Open http://localhost:5173 and sign in with a demo account above.

### Option B — Docker (no local Node/Mongo needed for the backend)

```bash
docker compose up --build                  # Mongo + seeded API + DB browser
pnpm --filter @hc/web dev                  # the SPA, proxying /api to the API
```

- API: http://localhost:4000 · Web: http://localhost:5173 · DB browser: http://localhost:8081
- Mongo's port isn't published, so this won't clash with a local mongod.

## Environment

The API validates its environment at startup and refuses to boot on anything
missing or malformed. See [`.env.example`](.env.example) for the annotated list.
Only `VITE_`-prefixed variables reach the browser bundle — never put secrets there.

## API reference

Base path `/api/v1`. Every response uses one envelope:
`{ success, data, meta? }` or `{ success: false, error: { code, message, details? }, requestId }`.

| Method | Path                       | Access        | Purpose                                      |
| ------ | -------------------------- | ------------- | -------------------------------------------- |
| POST   | `/auth/login`              | public        | email + password → token pair                |
| POST   | `/auth/refresh`            | refresh token | rotate tokens (reuse-detected)               |
| POST   | `/auth/logout`             | refresh token | revoke the session                           |
| GET    | `/auth/me`                 | auth          | current user                                 |
| GET    | `/me/reports/latest`       | auth          | latest report                                |
| GET    | `/me/reports`              | auth          | paginated history (`?page&pageSize&from&to`) |
| GET    | `/me/reports/:id`          | auth          | one report (ownership-scoped)                |
| GET    | `/admin/users`             | admin         | search/filter/sort/paginate patients         |
| GET    | `/admin/users/:id`         | admin         | patient detail + report count                |
| GET    | `/admin/users/:id/reports` | admin         | a patient's paginated reports                |
| POST   | `/admin/reports/upload`    | admin         | import CSV → batch summary                   |
| GET    | `/admin/uploads` / `/:id`  | admin         | import audit log                             |
| GET    | `/healthz`, `/readyz`      | public        | liveness / readiness                         |

### CSV format

One row per report; header required. A sample lives in [`seed/sample-reports.csv`](seed/sample-reports.csv).

```csv
email,report_date,source,hr,systolic,diastolic,glucose,cholesterol
jane.doe@healthcare.test,2026-05-15,acme-lab,71,119,77,90,182
```

Each row is validated independently: a bad email, non-ISO date or out-of-range
value fails just that row and is reported back with its line number. Re-importing
the same file is a no-op (rows are deduplicated by patient + date + source).

## Testing & CI

```bash
pnpm lint      # ESLint across the workspace
pnpm test      # Vitest — API integration (in-memory MongoDB) + web component tests
pnpm build     # production build
```

GitHub Actions runs all three on every push and pull request.

## Deployment

Three independent pieces. The whole thing runs on free tiers.

1. **Database — MongoDB Atlas.** Create a free M0 cluster, add a database user, and
   allow network access (`0.0.0.0/0` for the demo). Copy the SRV connection string.
2. **API — Render.** New → Blueprint, point it at this repo ([`render.yaml`](render.yaml)
   is picked up automatically). Set the three secrets it asks for: `MONGODB_URI`
   (Atlas), `CORS_ORIGIN` (your Vercel URL), and `SEED_ADMIN_PASSWORD`. JWT secrets
   are generated for you. The pre-deploy step seeds the demo data.
3. **Web — Vercel.** Import the repo, set **Root Directory** to `apps/web`, and add
   `VITE_API_BASE_URL = https://<your-api>.onrender.com/api/v1`. [`vercel.json`](apps/web/vercel.json)
   handles the SPA rewrite.

Finally, set the API's `CORS_ORIGIN` to the Vercel URL and redeploy.

## Design decisions & trade-offs

- **Tokens in the `Authorization` header (localStorage), not cookies.** This keeps
  cross-origin deployment simple — no `SameSite`/CSRF gymnastics between Vercel and
  Render. The cost is XSS exposure, which I bound with short-lived access tokens and
  a strict dependency footprint; refresh rotation + server-side hashes still give
  revocation. The more XSS-resistant alternative is an httpOnly refresh cookie.
- **MongoDB without multi-document transactions.** A standalone `mongod` (and the
  local dev setup) can't do them. By embedding metrics inside each report, every
  write is a single document, and a unique `(userId, dedupeKey)` index makes CSV
  re-imports idempotent without transactions.
- **bcrypt for password hashing.** Pure JS, so the Docker image and Render build
  have no native-module surprises. argon2id would be the pick for a high-security
  production system; hashing is isolated in one module to make that a one-file swap.
- **Substring search via indexed regex.** Fine at this scale and great for
  typeahead; MongoDB Atlas Search would be the path once the patient table grows.

## What I'd do with more time

- Move the refresh token to an httpOnly cookie behind a shared parent domain.
- Add Atlas Search (or a denormalized search field) for large-scale patient search.
- End-to-end tests (Playwright) for the login → dashboard and upload flows.
- An audit trail for admin actions and per-request OpenAPI docs.
- Stream very large CSVs and process them in a background job with progress.
