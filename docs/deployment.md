# StoneDesk Deployment Guide

## Unified Deployment (Frontend + MongoDB Backend)

StoneDesk can run as a unified service or as decoupled frontend/backend services.

### Prerequisites

- Node.js >= 22
- MongoDB Atlas cluster URI or self-hosted MongoDB instance (`mongodb://` or `mongodb+srv://`)
- Upstash Redis for production authentication rate limiting (optional locally)

### Environment Variables

Configure the following environment variables in `.env` or in your host dashboard:

| Variable                                                        | Required      | Description                                                                   |
| --------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                                                  | Yes           | MongoDB connection URI (`mongodb+srv://...`)                                  |
| `NODE_ENV`                                                      | Yes (in prod) | Set to `production`                                                           |
| `APP_ORIGIN`                                                    | Yes (in prod) | Exact frontend URL for CORS validation (e.g. `https://stonedesk.example.com`) |
| `PORT`                                                          | No            | Listening port (unified default: 3000; standalone: 5000)                                                |
| `UPSTASH_REDIS_REST_URL`                                        | Yes (in prod) | Upstash Redis REST URL for distributed rate limiting                          |
| `UPSTASH_REDIS_REST_TOKEN`                                      | Yes (in prod) | Upstash Redis REST token                                                      |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | No            | SMTP credentials for password reset emails                                    |

### Build & Run Unified Server

Install dependencies with `npm --prefix Backend ci` and `npm --prefix Frontend ci`. Set `APP_ORIGIN` to the frontend URL, including the port for local unified hosting. Logos require persistent writable storage via `UPLOAD_DIR` (default: `Backend/uploads`).

1. Build the frontend:
   ```bash
   npm run build
   ```
2. Start the unified server:
   ```bash
   npm start
   ```
   The backend serves API routes on `/api/*` and static SPA client pages with security headers from `Frontend/dist`.

