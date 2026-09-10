# Shortly — URL Shortening Service

A complete implementation of the [roadmap.sh URL Shortening Service project](https://roadmap.sh/projects/url-shortening-service), with a responsive management dashboard and a PostgreSQL-backed REST API.

## Included

- Random, collision-resistant short codes and optional custom aliases
- URL creation, retrieval, editing, deletion, and statistics
- HTTP 302 redirects with atomic visit tracking
- Search, active/archived filters, sorting, pagination, and CSV export
- Per-link insights and daily click analytics (UTC)
- Archiving/reactivating links, clipboard sharing, and browser-local workspace preferences
- In-app API documentation and source ZIP download
- PostgreSQL persistence, Drizzle schema, optional seed data, and automated API smoke tests

## Stack & prerequisites

Next.js App Router, React, TypeScript, PostgreSQL, Drizzle ORM, Tailwind CSS, and Lucide icons. Use **Node.js 22+**, npm, and **PostgreSQL 15+** (or Docker Compose).

## Local setup

1. Extract the ZIP and open a terminal in its `shortly` folder.
2. Install dependencies: `npm ci`
3. Copy the environment template: `cp .env.example .env` (Windows PowerShell: `Copy-Item .env.example .env`).
4. Start PostgreSQL: `docker compose up -d` (or set `DATABASE_URL` in `.env` to your own database).
5. Wait for PostgreSQL to be healthy, then apply the schema: `npx drizzle-kit push`
6. Optionally add seven example links: `npx tsx scripts/seed.ts`
7. Start the application: `npm run dev`
8. Open **http://localhost:3000**.

The optional seed is idempotent and does not overwrite existing aliases. All example links start with zero clicks; there is no fabricated analytics data. One example starts archived so both states can be explored.

For a production build: `npx next typegen`, `npx tsc --noEmit`, `npm run build`, then `npm start`.

## REST API

The API uses JSON request and response bodies. All timestamps are ISO 8601. This project intentionally uses one shared workspace and has **no authentication**, as allowed by the roadmap brief.

| Method | Endpoint | Purpose | Success |
| --- | --- | --- | --- |
| POST | `/shorten` | Create a short link | 201 |
| GET | `/shorten` | List links and daily activity | 200 |
| GET | `/shorten/:shortCode` | Retrieve destination and record one access | 200 |
| PUT | `/shorten/:shortCode` | Update URL, title, and/or archived state | 200 |
| DELETE | `/shorten/:shortCode` | Delete link and associated visits | 204 |
| GET | `/shorten/:shortCode/stats` | Get metadata and access count without recording access | 200 |
| GET | `/s/:shortCode` | Record a visit and redirect to the destination | 302 |
| GET | `/api/health` | Verify database connectivity | 200 |

### Create

```sh
curl -X POST http://localhost:3000/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/some/long/path","title":"My example","shortCode":"my-example"}'
```

Only `url` is required. `title` is optional (up to 120 characters) and defaults to the destination hostname. `shortCode` is optional (3–32 letters, numbers, underscores, or hyphens). Omit it to generate a cryptographically random code.

Example response:

```json
{
  "id": 1,
  "url": "https://example.com/some/long/path",
  "shortCode": "my-example",
  "title": "My example",
  "accessCount": 0,
  "archived": false,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

### Update and inspect

```sh
curl -X PUT http://localhost:3000/shorten/my-example \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/new-destination","title":"New title"}'
curl http://localhost:3000/shorten/my-example/stats
curl -i http://localhost:3000/s/my-example
curl -X DELETE http://localhost:3000/shorten/my-example
```

To archive, send `{"archived":true}` to the update endpoint. Archived links return 404 on redirect and tracked retrieval. Metadata remains accessible through the stats endpoint. Reactivate with `{"archived":false}`.

### Validation and errors

- **400**: malformed JSON, invalid/unsupported URL, invalid title, invalid alias, or empty update.
- **404**: missing link, or an archived link requested through a tracked endpoint.
- **409**: requested custom alias already exists.
- **503**: database unavailable, or random code generation exhausted collision retries (extremely unlikely).
- Error format: `{"error":"A readable explanation."}`.
- URLs must use HTTP or HTTPS and a dotted hostname, be at most 4,096 characters, and contain no embedded credentials. The service does not fetch destination contents.

### Click semantics

Both `GET /shorten/:code` and `GET /s/:code` independently record an access. Do not call both for a single redirect flow: use `/s/:code` to redirect automatically, or retrieve the original URL and navigate directly to it. Listing links and reading stats do not increment counts. Redirects and tracked retrieval responses are not cached.

Click counters and visit rows are written in one database transaction. Deleting a link cascades its visit history; workspace totals consequently represent currently retained links. Analytics measure requests, not unique people (bots and repeated visits count). Timeseries are grouped in UTC.

## Tests

With the server running and the schema applied:

```sh
node scripts/test-api.mjs
```

To target another deployment:

```sh
BASE_URL=https://your-shortly-host.example node scripts/test-api.mjs
```

The smoke test checks health, invalid JSON/URLs, creation, custom alias uniqueness, retrieval, update, redirects, concurrent atomic increments, statistics, archive/reactivate behavior, listing, deletion, and 404 responses. It creates a temporary test link and removes it in a cleanup block.

### Browser interaction test

With the development or production server running and example links seeded:

```sh
npx playwright install --with-deps chromium
node scripts/test-ui.mjs
```

This test checks desktop rendering, link creation and editing, archive/delete controls, analytics, API documentation, ZIP download, and mobile navigation. Run `python3 scripts/package-source.py` first so the downloadable ZIP is present. Screenshots are saved in `artifacts/`. Like the API test, it removes its temporary link afterward.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on `http://localhost:3000` |
| `npm run build` | Create an optimized production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npx drizzle-kit push` | Apply the Drizzle schema to the configured database |
| `npx tsx scripts/seed.ts` | Add the optional sample links |

## Source ZIP

The delivered preview includes `/downloads/shortly-source.zip`, also accessible from **API & docs** and **Settings**. It contains the application source, lockfile, configs, scripts, documentation, Docker Compose file, and `.env.example`.

The ZIP intentionally excludes `.env` and other local secrets, `node_modules`, `.next`, `.git`, database contents, logs, and generated archives. Fresh installations reproduce the schema using Drizzle and may load the optional examples.

To regenerate the download after editing source, run `python3 scripts/package-source.py`. Python 3 is only needed for packaging, not for running the app.

## Project structure

```text
src/app/                    App Router pages, styles, and layout
src/app/shorten/             RESTful CRUD and statistics route handlers
src/app/s/[code]/            Tracked redirects
src/app/api/health/          Database health endpoint
src/components/dashboard.tsx Interactive dashboard
src/db/                     PostgreSQL client and Drizzle schema
src/lib/links.ts             Shared validation and database operations
scripts/seed.ts             Optional example data
scripts/test-api.mjs        End-to-end API smoke test
scripts/package-source.py   Source archive generator
```

## Before public deployment

This is an end-to-end educational, single-workspace application, **not a hardened public SaaS**. Anybody who can access it can manage all links. Add authentication and per-user authorization, rate limits, abuse reporting and destination screening, request-size limits, audit logging, and monitoring before opening it to untrusted users. Use HTTPS, a restricted PostgreSQL role, a strong database password, SSL where required, and managed backups. The Docker credentials in `.env.example` are for local development only. Consider retention policies for visit events and use Drizzle migrations for controlled production schema changes. Browser preferences are localStorage-only, and the displayed account is a demo identity, not a login system.

Fonts use Google Fonts with system-font fallbacks. No external API credentials are needed.
