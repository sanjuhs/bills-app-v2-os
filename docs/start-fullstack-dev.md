# Start both servers with one command

Use one command to run Django API and Next.js UI at the same time.

## 1) Install project deps once

Install frontend dependencies:
```bash
pnpm install
```

Install backend dependencies (recommended with uv):
```bash
cd backend
uv pip install -r requirements.txt
cd ..
```

## 2) Run both apps from project root

```bash
pnpm run dev:all
```

This starts:
- Django backend at `http://127.0.0.1:8000`
- Next.js frontend at `http://127.0.0.1:3000`

## 3) What the command does

The new script is `scripts/dev.sh`.
- Boots Django with `manage.py runserver` first (background).
- Boots Next.js in the same terminal.
- Exits both cleanly when you stop (Ctrl+C).
- Automatically sets frontend env var `NEXT_PUBLIC_DJANGO_API_URL` so your frontend points to the local Django server.

## 4) Optional custom ports

Override ports with environment variables:
```bash
BACKEND_PORT=9000 FRONTEND_PORT=3100 pnpm run dev:all
```

## 5) If backend uses `uv` or normal python

The script will use `uv` if installed. If not, it falls back to `python`.

## 6) API Documentation (Swagger)

- Swagger UI: `http://127.0.0.1:8000/api/docs/`
- OpenAPI spec: `http://127.0.0.1:8000/api/openapi.json`

Use these to explore all endpoints. The same API works with any frontend (Flutter, React Native, etc.) — see `docs/deployment.md` for details.

## 7) Run tests

```bash
cd backend && uv run python manage.py test social -v2
```

## 8) Useful fallback

- Django logs go to `backend-dev.log`
- Make sure PostgreSQL/SQLite DB is ready as configured
- If ports are busy, run the command with custom ports as shown above.
