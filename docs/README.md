# Bills App — Developer Docs

## What is this?

A social bill-tracking app — Instagram meets expense tracking. Users post photos of purchases/bills, AI auto-tags prices and categories, and the community can comment, like, and tip with virtual coins.

**Stack:** Next.js 16 + Django 6 + AWS S3 + OpenAI GPT-4.1 + Clerk Auth + PostgreSQL

---

## Docs Index

| Doc | What it covers |
|-----|---------------|
| [Local Development](start-fullstack-dev.md) | Run frontend + backend locally with one command |
| [Architecture](architecture.md) | System design, models, API flow, tech decisions |
| [Deployment](deployment.md) | Deploy to Coolify (backend) + Vercel (frontend) |
| [API Reference](api-reference.md) | All endpoints, schemas, how to use from any client |

### Other references

| Resource | Location |
|----------|----------|
| Swagger UI (live) | `http://127.0.0.1:8000/api/docs/` (local) or your deployed backend `/api/docs/` |
| OpenAPI spec | `backend/bills_api/openapi.json` |
| Backend tests | `backend/social/tests.py` — run with `uv run python manage.py test social -v2` |

### Brainstorm / Design drafts

Early-stage brainstorms and design notes live in [`docs/rough/`](rough/) — not operational docs.

---

## Quick Start (30 seconds)

```bash
pnpm install
cd backend && uv pip install -r requirements.txt && cd ..
pnpm run dev:all
```

Frontend: `http://localhost:3000` | Backend: `http://localhost:8000` | Swagger: `http://localhost:8000/api/docs/`
