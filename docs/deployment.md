# Deployment Guide

**Target setup:**
- Backend → **Coolify** on VPS (`145.223.18.249`, `coolify.sanjayprasadhs.com`)
- Frontend → **Vercel**
- Database → **PostgreSQL** (already running on VPS)
- Storage → **AWS S3** (existing bucket)

---

## 1. Backend on Coolify

### Prerequisites
- Coolify dashboard accessible at `https://coolify.sanjayprasadhs.com`
- PostgreSQL running on VPS (already at `145.223.18.249:5432`)
- Git repo pushed to GitHub

### Step-by-step

#### A. Create new resource in Coolify

1. Go to **Coolify dashboard** → **Projects** → pick or create a project
2. Click **+ New** → **Application**
3. Source: **GitHub** → select the `bills-app` repo
4. **Build Pack**: Docker
5. **Base Directory**: `/backend`
6. **Dockerfile Location**: `/backend/Dockerfile`
7. **Port**: `8000`

#### B. Set environment variables

In Coolify → Application → **Environment Variables**, add:

```
DATABASE_URL=postgres://postgres:qgnR9hQ3ovxmUy15QE50kz2j01BVJkSbP8k5CIvW51H75BiDcEc5skt6a1O8hOaR@host.docker.internal:5432/bills_app?sslmode=disable
DJANGO_SECRET_KEY=<generate a random 50+ char string>
DEBUG=false
ALLOWED_HOSTS=145.223.18.249,api.sanjayprasadhs.com,srv692730.hstgr.cloud
AWS_ACCESS_KEY_ID=<from .env>
AWS_SECRET_ACCESS_KEY=<from .env>
AWS_S3_BUCKET_NAME=super-rag
AWS_REGION=us-east-1
OPENAI_API_KEY=<from .env>
```

**Important:** For `DATABASE_URL`, use `host.docker.internal` instead of `145.223.18.249` if PostgreSQL runs on the same machine — this resolves to the host from inside Docker. If that doesn't work, use the actual IP.

**Tip:** Create a separate database for bills: SSH into VPS and run:
```bash
ssh root@145.223.18.249
docker exec -it <postgres-container> psql -U postgres -c "CREATE DATABASE bills_app;"
```

Or if PostgreSQL is running directly:
```bash
psql -U postgres -c "CREATE DATABASE bills_app;"
```

#### C. Set up domain (optional but recommended)

In Coolify → Application → **Settings**:
1. Add domain: `api.sanjayprasadhs.com` (or whatever subdomain you want)
2. Coolify auto-provisions SSL via Let's Encrypt
3. Alternatively, just use `http://145.223.18.249:8000` directly

#### D. Deploy

1. Click **Deploy** in Coolify
2. Watch build logs — Dockerfile will install deps, collect static
3. Once running, the app is live at your configured domain/port

#### E. Run migrations (first time only)

In Coolify → Application → **Terminal** (or SSH into the container):

```bash
python manage.py migrate
```

Or via Coolify's **Execute Command** feature:
```bash
python manage.py migrate --no-color
```

#### F. Verify

```bash
curl https://api.sanjayprasadhs.com/api/hello/
# or
curl http://145.223.18.249:8000/api/hello/
```

Should return: `{"message": "Hello world from Bills API"}`

Swagger: `https://api.sanjayprasadhs.com/api/docs/`

---

## 2. Frontend on Vercel

### Step-by-step

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. **Framework Preset**: Next.js (auto-detected)
4. **Root Directory**: `.` (the repo root, not `backend/`)

### Environment variables

In Vercel → Project → **Settings → Environment Variables**:

```
NEXT_PUBLIC_DJANGO_API_URL=https://api.sanjayprasadhs.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2FzdWFsLXdoYWxlLTEwLmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_qvfzhYkAnO7jnC6RezSQl9VquYZllxvEsoVKpSgLy1
```

Replace `api.sanjayprasadhs.com` with whatever domain/IP your Coolify backend is on.

### Deploy

Click Deploy. Vercel will run `pnpm install && pnpm build`.

---

## 3. S3 CORS Configuration

Your S3 bucket needs to allow uploads from both local dev and production. Go to **AWS Console → S3 → super-rag → Permissions → CORS**:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": [
      "https://your-app.vercel.app",
      "https://yourdomain.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": []
  }
]
```

Replace with your actual Vercel domain.

---

## 4. Clerk Configuration

In [Clerk Dashboard](https://dashboard.clerk.com):

1. Go to **Domains** → add your Vercel production domain
2. Go to **Paths** → ensure redirect URLs include your production domain

---

## 5. Post-deployment Checklist

- [ ] Backend responds at `/api/hello/`
- [ ] Swagger loads at `/api/docs/`
- [ ] Frontend loads, Clerk login works
- [ ] Create a post with image — upload succeeds, AI analysis completes
- [ ] Profile picture uploads and displays
- [ ] Comments, likes, tips all work
- [ ] Run backend tests: `python manage.py test social -v2`

---

## 6. Using the API from Other Frontends

The API is stateless and client-agnostic. Build a Flutter app, React Native app, or CLI tool — same endpoints:

1. **Auth flow**: Use Clerk SDK → get `clerk_id` → `GET /api/profiles/me/?clerk_id=xxx`
2. **Upload images**: `POST /api/media/presign/` → `PUT` to S3 → pass `s3_keys` to `POST /api/posts/`
3. **All endpoints**: See [API Reference](api-reference.md) or Swagger at `/api/docs/`

---

## Troubleshooting

**Container can't reach PostgreSQL:**
- Try `host.docker.internal` in DATABASE_URL
- Or use the Docker bridge IP: `docker inspect bridge | grep Gateway`
- Or use `172.17.0.1` (default Docker host)

**CORS errors on frontend:**
- Check S3 CORS allows your Vercel domain
- Check Django CORS middleware allows the origin (currently allows `*`)

**Migrations not applied:**
- SSH into container or use Coolify terminal: `python manage.py migrate`
