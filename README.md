# StoneDesk

StoneDesk is a mobile-first dispatch and ledger application for granite quarry operations. Supervisors record stone measurements, calculate square footage and pricing, manage payments, and generate PDF/Excel invoices and transit slips.

## Stack and storage

- React + Vite, Tailwind CSS v4, daisyUI
- Node.js + Express
- MongoDB with Mongoose models in `Backend/models/`
- Application-managed password authentication and cookie sessions stored in MongoDB
- Logo files stored in `Backend/uploads/` (override with `UPLOAD_DIR`)

`Backend/utils/db.js` manages MongoDB connections. `Backend/utils/prisma.js` is an active Mongoose-backed compatibility adapter used by routes and controllers; it does not require the Prisma client. Documents use string UUID identifiers, and organization-owned records are scoped by `organizationId`.

## Setup

Install Node.js 22+ and provide a MongoDB Atlas cluster or local MongoDB instance. From the project root:

```sh
npm --prefix Backend ci
npm --prefix Frontend ci
```

Copy `.env.example` to `.env` and configure `DATABASE_URL`:

```env
DATABASE_URL=mongodb://127.0.0.1:27017/stonedesk
PORT=5000
APP_ORIGIN=http://localhost:5173
```

For Atlas, use your `mongodb+srv://.../stonedesk` URI. Keep credentials server-side. The backend loads root `.env` followed by `Backend/.env`; values in the latter override the root file and existing environment variables.

Optional local settings:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: distributed authentication rate limiting. Local development falls back to memory; production requires working Redis for rate-limited authentication requests.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: password reset email delivery.
- `UPLOAD_DIR`: writable logo storage directory; use persistent storage in production.

Check database connectivity without changing data:

```sh
npm --prefix Backend run db:check
```

## Local development

Run these in separate terminals from the project root:

```sh
npm --prefix Backend run dev
npm --prefix Frontend run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/uploads` to `http://127.0.0.1:5000`. Set `API_PROXY_TARGET` when using another backend port. Frontend environment overrides such as `VITE_API_BASE_URL` belong in `Frontend/.env`; never place database credentials there.

## Unified server

Set `APP_ORIGIN=http://localhost:5000` when using the example `PORT=5000`, then run:

```sh
npm run build
npm start
```

Open `http://localhost:5000`. The root server serves the API and `Frontend/dist`. It builds the frontend automatically only when `dist/index.html` is missing; rebuild after frontend changes. Without `PORT`, the unified server defaults to 3000 and the standalone backend defaults to 5000. Match `APP_ORIGIN` to the browser URL.

## Mock API

```sh
npm --prefix Backend run mock
```

The mock runs on port 5001 and persists to `Backend/mock/mock-data.json`, with no database connection. Set `API_PROXY_TARGET=http://127.0.0.1:5001` before starting Vite to use it.

Seeded users: `admin@example.test` and `dispatcher@example.test`, password `StoneDesk@2026`.

## Project structure

```text
Backend/    Express API, Mongoose models, tests and JSON-file mock
Frontend/   React client, invoice exports and tests
docs/       Architecture, workflows, design and deployment notes
server.js   Unified production/preview server
```

## Checks

```sh
npm --prefix Frontend test
npm --prefix Frontend run lint
npm run build
```

`npm test` runs both backend and frontend suites. Backend integration tests write data: use only a disposable MongoDB database. The current helper uses `DATABASE_URL`, not `TEST_DATABASE_URL`, and does not enforce isolation; ensure both root and backend environment files point to the disposable database before running them.

See [deployment notes](docs/deployment.md) and [architecture](docs/ARCHITECTURE.md).
