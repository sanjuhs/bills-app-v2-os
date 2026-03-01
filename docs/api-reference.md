# API Reference

Base URL: `/api/`

Interactive docs: `/api/docs/` (Swagger UI)
OpenAPI spec: `/api/openapi.json`

---

## Profiles

### `GET /api/profiles/me/?clerk_id=<clerk_id>`
Get current user's profile by Clerk ID. Returns 404 if not onboarded.

### `POST /api/profiles/`
Create profile during onboarding.
```json
{ "handle": "sanjay", "display_name": "Sanjay", "bio": "", "country": "India", "preferred_currency": "INR", "clerk_user_id": "user_xxx" }
```

### `PATCH /api/profiles/<handle>/`
Update profile fields (bio, display_name, avatar_url, country, preferred_currency).

---

## Feed

### `GET /api/feeds/main/?my_handle=<handle>`
Main feed. `my_handle` is optional — when provided, each post includes `liked_by_me: true/false`.

### `GET /api/feeds/profile/<handle>/?my_handle=<handle>`
Single profile's feed. Returns `{profile, items}`.

---

## Posts

### `POST /api/posts/`
Create a post. Multi-image via `s3_keys` array.
```json
{ "handle": "sanjay", "s3_keys": ["bills-app/uploads/abc.jpg", "bills-app/uploads/def.jpg"], "caption": "Dinner at Truffles" }
```
If images are present, AI analysis runs async. Response includes `ai_analysis: {status: "pending"}`.

### `GET /api/posts/<id>/`
Poll post status (for AI analysis completion).

### `DELETE /api/posts/<id>/`
Delete post + S3 images.

---

## Media Upload

### `POST /api/media/presign/`
Get a presigned S3 upload URL.
```json
{ "filename": "photo.jpg", "content_type": "image/jpeg" }
```
Response: `{ "upload_url": "https://s3...", "s3_key": "bills-app/uploads/xxx.jpg" }`

Then `PUT` the file body to `upload_url` with the same `Content-Type` header.

---

## Likes

### `POST /api/posts/<id>/like/`
Toggle like on/off.
```json
{ "handle": "sanjay" }
```
Response: `{ "liked": true, "likes": 235 }`

---

## Comments

### `GET /api/posts/<id>/comments/`
Returns threaded comment tree.

### `POST /api/posts/<id>/comments/`
Create comment. Use `parent_id` for replies.
```json
{ "handle": "sanjay", "text": "Great deal!", "parent_id": null }
```

### `PATCH /api/comments/<id>/`
Edit own comment.
```json
{ "handle": "sanjay", "text": "Updated comment" }
```

---

## Tips

### `POST /api/posts/<id>/tip/`
Tip coins to a post author.
```json
{ "from_handle": "sanjay", "amount": 1 }
```

---

## Using from Flutter / Mobile / Other Clients

1. **Auth**: Use Clerk's SDK to get `clerk_id`. Pass it to `GET /api/profiles/me/?clerk_id=xxx`.
2. **Image upload**: Call presign → PUT to S3 → pass `s3_keys` to create post.
3. **Identity**: All write endpoints use `handle` (string) to identify the acting user.
4. **No cookies/sessions**: API is fully stateless. Send JSON, get JSON.
