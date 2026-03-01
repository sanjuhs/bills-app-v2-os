# Architecture

## System Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Next.js 16  │────▶│  Django 6    │────▶│ PostgreSQL│
│  (Vercel)    │     │  (Coolify)   │     │ (VPS)    │
│              │     │              │────▶│ AWS S3   │
│  Clerk Auth  │     │  OpenAI GPT  │     └──────────┘
└──────────────┘     └──────────────┘
```

- **Frontend** (Next.js): Renders UI, handles auth via Clerk, uploads images directly to S3 via presigned URLs
- **Backend** (Django): Plain views (no DRF), handles business logic, calls OpenAI for image analysis
- **Storage**: S3 for images, PostgreSQL for structured data
- **Auth**: Clerk on frontend — backend identifies users by `clerk_id` or `handle` (no session/cookie auth)

## Data Models

### Profile
User identity. Linked to Clerk via `clerk_user_id`.

| Field | Type | Notes |
|-------|------|-------|
| handle | slug (unique) | e.g. `sanjay` |
| display_name | string | |
| avatar_url | string | S3 key, presigned on read |
| bio | text | |
| country | string | |
| preferred_currency | string | Default `INR` |
| coins | int | Virtual currency, +100/day |
| clerk_user_id | string | Links to Clerk |

### Post
A bill/purchase share.

| Field | Type | Notes |
|-------|------|-------|
| profile | FK → Profile | |
| s3_key | string | Primary image (legacy, also in PostImage) |
| caption | text | |
| amount | decimal | Set by AI or manually |
| ai_analysis | JSON | Full GPT analysis result |
| likes | int | Denormalized counter |
| tips_total | int | Total coins tipped |

### PostImage
Multiple images per post (carousel).

| Field | Type | Notes |
|-------|------|-------|
| post | FK → Post | |
| s3_key | string | |
| order | int | 0-indexed display order |

### Comment
Threaded comments (Reddit-style). Self-referencing `parent` FK.

### Like
`(profile, post)` unique together. Toggleable.

## API Flow

### Creating a post (multi-image + AI analysis)
```
1. Frontend selects N files
2. For each file: POST /api/media/presign/ → get upload_url + s3_key
3. For each file: PUT file to upload_url (direct S3)
4. POST /api/posts/ with {handle, s3_keys: [...], caption}
5. Backend creates Post + PostImage rows
6. Backend spawns thread → GPT analyzes first image
7. Returns immediately with ai_analysis: {status: "pending"}
8. Frontend polls GET /api/posts/<id>/ every 3s
9. When analysis done, frontend updates post in-place
```

### Image URL resolution
All S3 keys are presigned on read (24h TTL). Avatars, post images — the backend never returns raw S3 keys to the frontend.

## Key Design Decisions

- **No DRF**: Plain Django views + JsonResponse. Lighter, no serializer overhead. Swagger via static OpenAPI spec.
- **Thread-based async**: GPT analysis runs in a daemon thread (not Celery). Good enough for current scale, zero infra overhead.
- **Denormalized counters**: `Post.likes` and `Post.comments` are counters updated on write. Avoids COUNT queries on read.
- **Presigned URLs everywhere**: Frontend never gets raw S3 credentials. Upload and download both use presigned URLs.
- **No session auth on API**: Stateless. Any client (web, Flutter, etc.) can use the API by passing `handle` or `clerk_id`.
