import json
import os
import re
import threading
import uuid
from collections import Counter
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

import boto3
import openai
from botocore.config import Config as BotoConfig
from django.db import connection, transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Comment, Like, Post, PostImage, Profile

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_BUCKET = os.getenv("AWS_S3_BUCKET_NAME", "super-rag")
S3_PREFIX = "bills-app/uploads"
OPENAI_MODEL = "gpt-4.1"
DAILY_COINS = 100

ANALYSIS_PROMPT = """You are the AI engine of "Bills" — a social spending/bill-tracking app.
Analyze this image and return ONLY a valid JSON object (no markdown, no code fences):

{{
  "amount": <number in INR, always provide an estimate even for non-monetary>,
  "original_amount": <number or null if no discount visible>,
  "currency": "<detected currency code, default INR>",
  "category": "<one of: food, shopping, travel, entertainment, transport, utilities, health, education, other>",
  "location": "<city, country if detectable, else empty string>",
  "tags": ["<relevant hashtags like #steal, #expensive, #worthit, #memory, #foodie, #flex>"],
  "is_bill": <true if a bill/receipt/invoice is visible in the image>,
  "is_monetary": <true if spending/money/purchase is involved>,
  "description": "<one-line description>",
  "confidence": <0.0 to 1.0>
}}

Rules:
- If a bill/receipt is visible, extract the exact total. High confidence.
- If user suggests a price, compare with any visible bill. Trust the bill.
- If no bill visible, add #no-bill tag and estimate based on context.
- If not monetary at all, add #non-monetary but still assign a fun rupee value.
- For currency conversion to INR, use approximate current rates.

User caption: "{caption}"
User suggested price: {suggested_price}"""


# ── Helpers ──────────────────────────────────────────────────────────────

def _s3():
    return boto3.client(
        "s3", region_name=AWS_REGION,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        config=BotoConfig(signature_version="s3v4"),
    )


def _presigned_get(key: str, ttl: int = 86400) -> str:
    if not key:
        return ""
    return _s3().generate_presigned_url(
        "get_object", Params={"Bucket": AWS_BUCKET, "Key": key}, ExpiresIn=ttl,
    )


def _resolve_avatar(raw: str) -> str:
    if not raw or raw.startswith("http"):
        return raw
    try:
        return _presigned_get(raw, ttl=86400)
    except Exception:
        return ""


def _analyze_with_gpt(image_url: str, caption: str = "", suggested_price: str = "none") -> dict:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"error": "no_api_key", "amount": 0, "tags": [], "confidence": 0}
    client = openai.OpenAI(api_key=api_key)
    prompt = ANALYSIS_PROMPT.format(caption=caption or "none", suggested_price=suggested_price or "none")
    try:
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]}],
            response_format={"type": "json_object"},
            max_tokens=600,
        )
        return json.loads(resp.choices[0].message.content)
    except Exception as e:
        return {"error": str(e), "amount": 0, "tags": [], "confidence": 0}


def _refresh_coins(profile: Profile):
    today = date.today()
    if profile.last_coin_refresh != today:
        profile.coins += DAILY_COINS
        profile.last_coin_refresh = today
        profile.save(update_fields=["coins", "last_coin_refresh"])


def _resolve_image(img) -> str:
    """Resolve a PostImage or s3_key/image_url pair to a displayable URL."""
    if hasattr(img, "s3_key"):
        if img.s3_key:
            try:
                return _presigned_get(img.s3_key)
            except Exception:
                return img.image_url or ""
        return img.image_url or ""
    return str(img) if img else ""


def _to_decimal(value):
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError, TypeError):
            return None
    text = str(value).strip()
    if not text:
        return None
    cleaned = (
        text.replace(",", "")
        .replace("₹", "")
        .replace("$", "")
        .replace("INR", "")
        .replace("Rs.", "")
        .replace("Rs", "")
        .strip()
    )
    try:
        return Decimal(cleaned)
    except (InvalidOperation, ValueError, TypeError):
        match = re.search(r"-?\d+(?:\.\d+)?", cleaned)
        if not match:
            return None
        try:
            return Decimal(match.group(0))
        except (InvalidOperation, ValueError, TypeError):
            return None


def _amount_from_caption(text: str):
    if not text:
        return None
    explicit = re.findall(r"(?:₹|Rs\.?|INR|\$)\s*([0-9][0-9,]*(?:\.\d+)?)", text, flags=re.IGNORECASE)
    if explicit:
        parsed = [_to_decimal(x) for x in explicit]
        values = [x for x in parsed if x is not None and x > 0]
        if values:
            return max(values)
    return None


def _aggregate_analyses(analyses: list[dict], caption: str, image_count_submitted: int) -> dict:
    valid = [a for a in analyses if isinstance(a, dict) and not a.get("error")]
    if valid:
        amount_total = Decimal("0")
        original_total = Decimal("0")
        has_original = False
        tags = []
        category_candidates = []
        currency = "INR"
        location = ""
        confidence_vals = []
        descriptions = []
        is_bill = False
        is_monetary = False

        for a in valid:
            if a.get("currency"):
                currency = str(a["currency"])
            if a.get("location") and not location:
                location = str(a["location"])
            if isinstance(a.get("category"), str) and a["category"]:
                category_candidates.append(a["category"])
            if isinstance(a.get("description"), str) and a["description"]:
                descriptions.append(a["description"])
            if isinstance(a.get("tags"), list):
                tags.extend([str(t) for t in a["tags"] if t])
            if a.get("is_bill"):
                is_bill = True
            if a.get("is_monetary"):
                is_monetary = True

            try:
                c = float(a["confidence"]) if a.get("confidence") is not None else None
                if c is not None:
                    confidence_vals.append(c)
            except (TypeError, ValueError):
                pass

            if a.get("amount") is not None:
                parsed_amount = _to_decimal(a.get("amount"))
                if parsed_amount is not None and parsed_amount > 0:
                    amount_total += parsed_amount
            if a.get("original_amount") is not None:
                parsed_original = _to_decimal(a.get("original_amount"))
                if parsed_original is not None and parsed_original > 0:
                    original_total += parsed_original
                    has_original = True

        deduped_tags = list(dict.fromkeys(tags))
        category = Counter(category_candidates).most_common(1)[0][0] if category_candidates else "other"
        confidence = (sum(confidence_vals) / len(confidence_vals)) if confidence_vals else 0
        if amount_total <= 0:
            caption_amount = _amount_from_caption(caption)
            if caption_amount is not None and caption_amount > 0:
                amount_total = caption_amount
        return {
            "status": "done",
            "amount": float(amount_total),
            "original_amount": float(original_total) if has_original else None,
            "currency": currency or "INR",
            "category": category,
            "location": location,
            "tags": deduped_tags,
            "is_bill": is_bill,
            "is_monetary": is_monetary,
            "description": descriptions[0] if descriptions else "Combined analysis from multiple images",
            "confidence": confidence,
            "image_count_analyzed": len(valid),
            "image_count_submitted": image_count_submitted,
        }

    caption_amount = _amount_from_caption(caption)
    if caption_amount is not None and caption_amount > 0:
        return {
            "status": "done",
            "amount": float(caption_amount),
            "original_amount": None,
            "currency": "INR",
            "category": "other",
            "location": "",
            "tags": [],
            "is_bill": False,
            "is_monetary": True,
            "description": "Amount inferred from caption",
            "confidence": 0,
            "image_count_analyzed": 0,
            "image_count_submitted": image_count_submitted,
        }

    # Keep the first error payload so frontend can surface a meaningful reason.
    return analyses[0] if analyses else {"error": "analysis_failed", "amount": 0, "tags": [], "confidence": 0}


def _serialize_post(post: Post, liked_ids: set | None = None) -> dict:
    post_images = list(post.images.all())
    if post_images:
        images = [_resolve_image(pi) for pi in post_images]
    else:
        legacy = ""
        if post.s3_key:
            try:
                legacy = _presigned_get(post.s3_key)
            except Exception:
                legacy = post.image_url
        elif post.image_url:
            legacy = post.image_url
        images = [legacy] if legacy else []

    return {
        "id": post.id,
        "profile": {
            "handle": post.profile.handle,
            "display_name": post.profile.display_name,
            "avatar_url": _resolve_avatar(post.profile.avatar_url),
        },
        "images": images,
        "image_url": images[0] if images else "",
        "caption": post.caption,
        "amount": str(post.amount) if post.amount is not None else None,
        "original_amount": str(post.original_amount) if post.original_amount is not None else None,
        "category": post.category,
        "tag": post.tag,
        "location": post.location,
        "ai_analysis": post.ai_analysis or {},
        "tips_total": post.tips_total,
        "likes": post.likes,
        "liked_by_me": (post.id in liked_ids) if liked_ids is not None else False,
        "comments": max(post.post_comments.count(), post.comments),
        "created_at": post.created_at.isoformat(),
    }


def _serialize_profile(profile: Profile) -> dict:
    return {
        "handle": profile.handle,
        "display_name": profile.display_name,
        "avatar_url": _resolve_avatar(profile.avatar_url),
        "bio": profile.bio,
        "country": profile.country,
        "preferred_currency": profile.preferred_currency,
        "coins": profile.coins,
        "followers": profile.followers,
        "is_verified": profile.is_verified,
        "posts_count": profile.posts.count(),
    }


def _build_comment_tree(post_id: int) -> list:
    comments = Comment.objects.filter(post_id=post_id).select_related("profile").order_by("created_at")
    nodes = {}
    roots = []
    for c in comments:
        node = {
            "id": c.id,
            "profile": {"handle": c.profile.handle, "display_name": c.profile.display_name},
            "text": c.text,
            "parent_id": c.parent_id,
            "edited_at": c.edited_at.isoformat() if c.edited_at else None,
            "created_at": c.created_at.isoformat(),
            "replies": [],
        }
        nodes[c.id] = node
        if c.parent_id and c.parent_id in nodes:
            nodes[c.parent_id]["replies"].append(node)
        else:
            roots.append(node)
    return roots


def _seed_if_empty():
    if Profile.objects.exists():
        return
    seed = [
        {
            "handle": "priya_deals", "display_name": "Priya Sharma",
            "bio": "Deal hunter extraordinaire. If it's 70% off, I'm there.",
            "country": "India", "preferred_currency": "INR", "followers": 2340,
            "posts": [{
                "caption": "Got this jacket for 70% off! Myntra end-of-season sale is no joke",
                "image": "https://picsum.photos/seed/jacket-deal/900/1100",
                "amount": "899.00", "original_amount": "2999.00", "category": "shopping",
                "tag": "#steal #shopping #deal", "location": "Bangalore, India",
                "likes": 234, "comments": 45,
                "ai_analysis": {"amount": 899, "original_amount": 2999, "currency": "INR",
                    "category": "shopping", "location": "Bangalore, India",
                    "tags": ["#steal", "#shopping", "#deal", "#myntra"],
                    "is_bill": False, "is_monetary": True,
                    "description": "Jacket purchase at 70% discount", "confidence": 0.9},
            }],
        },
        {
            "handle": "angry_commuter", "display_name": "Arjun Mehta",
            "bio": "Documenting the absurdity of urban pricing.",
            "country": "India", "preferred_currency": "INR", "followers": 12470, "is_verified": True,
            "posts": [{
                "caption": "Rs 500 for PARKING?! Bangalore malls are out of control",
                "image": "https://picsum.photos/seed/parking-rage/900/1100",
                "amount": "500.00", "category": "transport",
                "tag": "#outrage #parking #expensive", "location": "Bangalore, India",
                "likes": 1247, "comments": 89,
                "ai_analysis": {"amount": 500, "currency": "INR", "category": "transport",
                    "location": "Bangalore, India",
                    "tags": ["#outrage", "#parking", "#expensive", "#ripoff"],
                    "is_bill": False, "is_monetary": True,
                    "description": "Overpriced mall parking fee", "confidence": 0.95},
            }],
        },
        {
            "handle": "foodie_raj", "display_name": "Rajesh Kumar",
            "bio": "Every meal is a memory. Collecting receipts of joy.",
            "country": "India", "preferred_currency": "INR", "followers": 8920,
            "posts": [
                {
                    "caption": "First date spot. Best 1200 rupees I ever spent.",
                    "image": "https://picsum.photos/seed/first-date/900/1100",
                    "amount": "1200.00", "category": "food",
                    "tag": "#memory #food #worthit", "location": "Mumbai, India",
                    "likes": 892, "comments": 67,
                    "ai_analysis": {"amount": 1200, "currency": "INR", "category": "food",
                        "location": "Mumbai, India",
                        "tags": ["#memory", "#food", "#worthit", "#date"],
                        "is_bill": False, "is_monetary": True,
                        "description": "Restaurant dinner — first date", "confidence": 0.85},
                },
            ],
        },
        {
            "handle": "metro_saver", "display_name": "Sneha Patel",
            "bio": "Frugal living, maximum vibes.",
            "country": "India", "preferred_currency": "INR", "followers": 5600,
            "posts": [{
                "caption": "Switched from Uber to metro. Rs 30 vs Rs 480. Same destination.",
                "image": "https://picsum.photos/seed/metro-save/900/1100",
                "amount": "30.00", "original_amount": "480.00", "category": "transport",
                "tag": "#steal #savings #metro", "location": "Delhi, India",
                "likes": 1567, "comments": 123,
                "ai_analysis": {"amount": 30, "original_amount": 480, "currency": "INR",
                    "category": "transport", "location": "Delhi, India",
                    "tags": ["#steal", "#savings", "#metro", "#lifehack"],
                    "is_bill": False, "is_monetary": True,
                    "description": "Metro vs Uber cost comparison", "confidence": 0.92},
            }],
        },
    ]
    with transaction.atomic():
        for idx, item in enumerate(seed):
            profile = Profile.objects.create(
                handle=item["handle"], display_name=item["display_name"],
                bio=item.get("bio", ""), country=item.get("country", ""),
                preferred_currency=item.get("preferred_currency", "INR"),
                followers=item.get("followers", 0), is_verified=item.get("is_verified", False),
            )
            for pidx, p in enumerate(item["posts"]):
                Post.objects.create(
                    profile=profile, image_url=p["image"], caption=p["caption"],
                    amount=Decimal(p["amount"]) if p.get("amount") else None,
                    original_amount=Decimal(p["original_amount"]) if p.get("original_amount") else None,
                    category=p.get("category", "other"), tag=p.get("tag", ""),
                    location=p.get("location", ""), ai_analysis=p.get("ai_analysis", {}),
                    likes=p["likes"], comments=p["comments"],
                    created_at=now() - timedelta(hours=(idx * 4 + pidx + 1)),
                )


# ── Profile endpoints ────────────────────────────────────────────────────

@require_http_methods(["GET"])
def my_profile(request):
    clerk_id = request.GET.get("clerk_id", "")
    if not clerk_id:
        return JsonResponse({"error": "clerk_id is required"}, status=400)
    _seed_if_empty()
    try:
        profile = Profile.objects.get(clerk_user_id=clerk_id)
        _refresh_coins(profile)
        return JsonResponse({"profile": _serialize_profile(profile)})
    except Profile.DoesNotExist:
        return JsonResponse({"profile": None}, status=404)


@csrf_exempt
@require_http_methods(["POST"])
def create_profile(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    handle = (body.get("handle") or "").strip().lower()
    if not handle:
        return JsonResponse({"error": "handle is required"}, status=400)
    if not handle.replace("_", "").replace("-", "").isalnum():
        return JsonResponse({"error": "Handle must be alphanumeric (underscores/hyphens ok)"}, status=400)
    if Profile.objects.filter(handle=handle).exists():
        return JsonResponse({"error": "That handle is already taken"}, status=409)

    clerk_user_id = body.get("clerk_user_id", "")
    if clerk_user_id and Profile.objects.filter(clerk_user_id=clerk_user_id).exclude(clerk_user_id="").exists():
        return JsonResponse({"error": "Profile already exists for this account"}, status=409)

    profile = Profile.objects.create(
        handle=handle,
        display_name=body.get("display_name", "").strip() or handle.replace("_", " ").title(),
        bio=body.get("bio", "").strip(),
        avatar_url=body.get("avatar_url", ""),
        country=body.get("country", "").strip(),
        preferred_currency=body.get("preferred_currency", "INR"),
        clerk_user_id=clerk_user_id,
        last_coin_refresh=date.today(),
    )
    return JsonResponse({"profile": _serialize_profile(profile)}, status=201)


@csrf_exempt
@require_http_methods(["PATCH"])
def update_profile(request, handle):
    profile = get_object_or_404(Profile, handle=handle)
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    for field in ("bio", "display_name", "avatar_url", "country", "preferred_currency"):
        if field in body:
            val = body[field].strip() if isinstance(body[field], str) else body[field]
            setattr(profile, field, val)
    profile.save()
    return JsonResponse({"profile": _serialize_profile(profile)})


# ── Feed endpoints ───────────────────────────────────────────────────────

def _my_liked_ids(handle: str, posts) -> set:
    if not handle:
        return set()
    prof = Profile.objects.filter(handle=handle).first()
    if not prof:
        return set()
    return set(Like.objects.filter(profile=prof, post__in=posts).values_list("post_id", flat=True))


@require_http_methods(["GET"])
def main_feed(request):
    _seed_if_empty()
    my_handle = request.GET.get("my_handle", "")
    posts = list(Post.objects.select_related("profile").order_by("-created_at")[:40])
    liked = _my_liked_ids(my_handle, posts)
    return JsonResponse({"items": [_serialize_post(p, liked) for p in posts]})


@require_http_methods(["GET"])
def profile_feed(request, handle):
    _seed_if_empty()
    my_handle = request.GET.get("my_handle", "")
    profile = get_object_or_404(Profile, handle=handle)
    posts = list(profile.posts.select_related("profile").all())
    liked = _my_liked_ids(my_handle, posts)
    return JsonResponse({
        "profile": _serialize_profile(profile),
        "items": [_serialize_post(p, liked) for p in posts],
    })


# ── S3 presigned upload ─────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def presign_upload(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    filename = body.get("filename", "upload.jpg")
    content_type = body.get("content_type", "image/jpeg")
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    s3_key = f"{S3_PREFIX}/{uuid.uuid4().hex}.{ext}"
    url = _s3().generate_presigned_url(
        "put_object",
        Params={"Bucket": AWS_BUCKET, "Key": s3_key, "ContentType": content_type},
        ExpiresIn=600,
    )
    return JsonResponse({"upload_url": url, "s3_key": s3_key})


# ── Post CRUD ────────────────────────────────────────────────────────────

def _analyze_post_background(post_id: int, image_url: str | list[str], caption: str):
    """Run GPT analysis in a background thread. Updates the post when done."""
    try:
        image_urls = [image_url] if isinstance(image_url, str) else [u for u in image_url if u]
        if not image_urls:
            return

        analyses = []
        for url in image_urls:
            analyses.append(_analyze_with_gpt(url, caption))
        analysis = _aggregate_analyses(analyses, caption, len(image_urls))

        post = Post.objects.get(id=post_id)
        post.ai_analysis = analysis
        if analysis.get("amount") and not analysis.get("error"):
            parsed_amount = _to_decimal(analysis.get("amount"))
            if parsed_amount is not None:
                post.amount = parsed_amount
        if analysis.get("original_amount"):
            parsed_original = _to_decimal(analysis.get("original_amount"))
            if parsed_original is not None:
                post.original_amount = parsed_original
        if analysis.get("category"):
            post.category = analysis["category"]
        if analysis.get("location"):
            post.location = analysis["location"]
        if analysis.get("tags"):
            post.tag = " ".join(analysis["tags"])
        post.save()
    except Exception:
        try:
            post = Post.objects.get(id=post_id)
            post.ai_analysis = {"error": "analysis_failed", "amount": 0, "tags": [], "confidence": 0}
            post.save(update_fields=["ai_analysis"])
        except Exception:
            pass
    finally:
        connection.close()


@csrf_exempt
@require_http_methods(["POST"])
def create_post(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    handle = (body.get("handle") or "").strip()
    if not handle:
        return JsonResponse({"error": "handle is required"}, status=400)

    profile, _ = Profile.objects.get_or_create(
        handle=handle, defaults={"display_name": handle.replace("_", " ").title()},
    )

    s3_keys = body.get("s3_keys", [])
    if not s3_keys and body.get("s3_key"):
        s3_keys = [body["s3_key"]]

    post = Post.objects.create(
        profile=profile,
        s3_key=s3_keys[0] if s3_keys else "",
        image_url=body.get("image_url", ""),
        caption=body.get("caption", ""),
    )

    for i, key in enumerate(s3_keys):
        PostImage.objects.create(post=post, s3_key=key, order=i)

    image_urls_for_analysis = []
    if s3_keys:
        for key in s3_keys:
            try:
                image_urls_for_analysis.append(_presigned_get(key, ttl=300))
            except Exception:
                continue
    elif post.image_url:
        image_urls_for_analysis = [post.image_url]

    if image_urls_for_analysis:
        post.ai_analysis = {"status": "pending"}
        post.save(update_fields=["ai_analysis"])
        t = threading.Thread(
            target=_analyze_post_background,
            args=(post.id, image_urls_for_analysis, post.caption),
            daemon=True,
        )
        t.start()

    return JsonResponse({"post": _serialize_post(post)}, status=201)


@csrf_exempt
def post_detail(request, post_id):
    """GET to poll status, DELETE to remove."""
    post = get_object_or_404(Post, id=post_id)

    if request.method == "GET":
        return JsonResponse({"post": _serialize_post(post)})

    if request.method == "DELETE":
        s3 = _s3()
        for img in post.images.all():
            if img.s3_key:
                try:
                    s3.delete_object(Bucket=AWS_BUCKET, Key=img.s3_key)
                except Exception:
                    pass
        if post.s3_key:
            try:
                s3.delete_object(Bucket=AWS_BUCKET, Key=post.s3_key)
            except Exception:
                pass
        post.delete()
        return JsonResponse({"deleted": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ── Comments (threaded) ─────────────────────────────────────────────────

@csrf_exempt
def post_comments(request, post_id):
    post = get_object_or_404(Post, id=post_id)

    if request.method == "GET":
        return JsonResponse({"comments": _build_comment_tree(post_id)})

    if request.method == "POST":
        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        handle = (body.get("handle") or "").strip()
        text = (body.get("text") or "").strip()
        if not handle or not text:
            return JsonResponse({"error": "handle and text required"}, status=400)

        profile = get_object_or_404(Profile, handle=handle)
        parent_id = body.get("parent_id")
        parent = None
        if parent_id:
            parent = Comment.objects.filter(id=parent_id, post=post).first()

        comment = Comment.objects.create(post=post, profile=profile, parent=parent, text=text)
        return JsonResponse({
            "comment": {
                "id": comment.id,
                "profile": {"handle": profile.handle, "display_name": profile.display_name},
                "text": comment.text,
                "parent_id": comment.parent_id,
                "created_at": comment.created_at.isoformat(),
                "replies": [],
            }
        }, status=201)

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ── Tipping ──────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def tip_post(request, post_id):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    from_handle = (body.get("from_handle") or "").strip()
    amount = max(1, min(int(body.get("amount", 1)), 50))

    post = get_object_or_404(Post, id=post_id)
    from_profile = get_object_or_404(Profile, handle=from_handle)
    to_profile = post.profile

    if from_profile.id == to_profile.id:
        return JsonResponse({"error": "Can't tip yourself"}, status=400)
    if from_profile.coins < amount:
        return JsonResponse({"error": "Not enough coins"}, status=400)

    with transaction.atomic():
        from_profile.coins -= amount
        to_profile.coins += amount
        post.tips_total += amount
        from_profile.save(update_fields=["coins"])
        to_profile.save(update_fields=["coins"])
        post.save(update_fields=["tips_total"])

    return JsonResponse({"tipped": amount, "your_coins": from_profile.coins, "post_tips": post.tips_total})


# ── Likes ────────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def toggle_like(request, post_id):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    handle = (body.get("handle") or "").strip()
    profile = get_object_or_404(Profile, handle=handle)
    post = get_object_or_404(Post, id=post_id)

    like, created = Like.objects.get_or_create(profile=profile, post=post)
    if not created:
        like.delete()
        post.likes = max(0, post.likes - 1)
    else:
        post.likes += 1
    post.save(update_fields=["likes"])

    return JsonResponse({"liked": created, "likes": post.likes})


# ── Comment edit ─────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["PATCH"])
def edit_comment(request, comment_id):
    comment = get_object_or_404(Comment, id=comment_id)
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    handle = (body.get("handle") or "").strip()
    if handle != comment.profile.handle:
        return JsonResponse({"error": "Not your comment"}, status=403)

    text = (body.get("text") or "").strip()
    if not text:
        return JsonResponse({"error": "text required"}, status=400)

    comment.text = text
    comment.edited_at = now()
    comment.save(update_fields=["text", "edited_at"])

    return JsonResponse({
        "comment": {
            "id": comment.id,
            "text": comment.text,
            "edited_at": comment.edited_at.isoformat(),
        }
    })
