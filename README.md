# Shortly

A full-stack URL shortener built with Next.js, PostgreSQL, and Drizzle ORM. Create custom short links, track redirects, and manage click analytics from a responsive dashboard.

## Features

- Generate random short links or choose a custom alias
- Create, edit, archive, and delete links
- Track redirects and view click analytics
- Search, filter, sort, paginate, and export links as CSV
- REST API with validation and health checks
- PostgreSQL persistence with Drizzle ORM

## Tech stack

Next.js, React, TypeScript, PostgreSQL, Drizzle ORM, Tailwind CSS, and Lucide.

## Run locally

Requirements: Node.js 22+, npm, and PostgreSQL 15+.

```powershell
npm ci
Copy-Item .env.example .env
```

Update `DATABASE_URL` in `.env` with your PostgreSQL credentials, then run:

```powershell
npx drizzle-kit push
npx tsx scripts/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm start` | Start the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |
| `node scripts/test-api.mjs` | Run API smoke tests |
| `node scripts/test-ui.mjs` | Run browser smoke tests |

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/shorten` | Create a short link |
| `GET` | `/shorten` | List links and activity |
| `GET` | `/shorten/:code` | Retrieve a destination and track access |
| `PUT` | `/shorten/:code` | Update a link |
| `DELETE` | `/shorten/:code` | Delete a link |
| `GET` | `/shorten/:code/stats` | Get link statistics |
| `GET` | `/s/:code` | Redirect to a destination |

## Note

This is a single-workspace educational project. Add authentication, authorization, rate limiting, abuse prevention, monitoring, and a restricted database role before deploying it publicly.
