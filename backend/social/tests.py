"""
Comprehensive tests for social app API endpoints.
Uses django.test.TestCase and self.client. All views use JsonResponse and @csrf_exempt.
"""
import json
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase

from .models import Comment, Like, Post, PostImage, Profile
from .views import _aggregate_analyses, _amount_from_caption, _to_decimal


class ProfileTests(TestCase):
    """Profile creation, duplicate handle rejection, get my_profile by clerk_id, PATCH update."""

    def setUp(self):
        self.client = self.client_class(enforce_csrf_checks=False)

    def test_create_profile(self):
        """Creating a profile returns 201 with serialized profile."""
        resp = self.client.post(
            "/api/profiles/",
            data=json.dumps({
                "handle": "alice_dev",
                "display_name": "Alice Developer",
                "bio": "Code enthusiast",
                "clerk_user_id": "clerk_123",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        data = json.loads(resp.content)
        self.assertIn("profile", data)
        prof = data["profile"]
        self.assertEqual(prof["handle"], "alice_dev")
        self.assertEqual(prof["display_name"], "Alice Developer")
        self.assertEqual(prof["bio"], "Code enthusiast")
        self.assertEqual(prof["coins"], 100)
        self.assertEqual(Profile.objects.filter(handle="alice_dev").count(), 1)

    def test_duplicate_handle_rejected(self):
        """Creating a profile with an existing handle returns 409."""
        Profile.objects.create(
            handle="taken_handle",
            display_name="First",
            clerk_user_id="clerk_a",
        )
        resp = self.client.post(
            "/api/profiles/",
            data=json.dumps({
                "handle": "taken_handle",
                "display_name": "Second",
                "clerk_user_id": "clerk_b",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 409)
        data = json.loads(resp.content)
        self.assertIn("error", data)
        self.assertIn("already taken", data["error"].lower())
        self.assertEqual(Profile.objects.filter(handle="taken_handle").count(), 1)

    def test_get_my_profile_by_clerk_id(self):
        """GET profiles/me/?clerk_id=X returns the profile for that clerk user."""
        Profile.objects.create(
            handle="bob_user",
            display_name="Bob",
            clerk_user_id="clerk_xyz",
        )
        resp = self.client.get("/api/profiles/me/?clerk_id=clerk_xyz")
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertIn("profile", data)
        self.assertEqual(data["profile"]["handle"], "bob_user")

    def test_get_my_profile_missing_clerk_id_returns_400(self):
        """GET profiles/me/ without clerk_id returns 400."""
        resp = self.client.get("/api/profiles/me/")
        self.assertEqual(resp.status_code, 400)
        data = json.loads(resp.content)
        self.assertIn("error", data)

    def test_get_my_profile_not_found_returns_404(self):
        """GET profiles/me/ with unknown clerk_id returns 404."""
        resp = self.client.get("/api/profiles/me/?clerk_id=nonexistent")
        self.assertEqual(resp.status_code, 404)
        data = json.loads(resp.content)
        self.assertEqual(data.get("profile"), None)

    def test_update_profile_via_patch(self):
        """PATCH profiles/<handle>/ updates allowed fields."""
        Profile.objects.create(
            handle="charlie",
            display_name="Charlie Old",
            bio="Old bio",
            clerk_user_id="clerk_c",
        )
        resp = self.client.patch(
            "/api/profiles/charlie/",
            data=json.dumps({
                "display_name": "Charlie New",
                "bio": "Updated bio",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertEqual(data["profile"]["display_name"], "Charlie New")
        self.assertEqual(data["profile"]["bio"], "Updated bio")
        profile = Profile.objects.get(handle="charlie")
        self.assertEqual(profile.display_name, "Charlie New")


class PostTests(TestCase):
    """Post creation, multi-image PostImage entries, get detail, delete, feed."""

    def setUp(self):
        self.client = self.client_class(enforce_csrf_checks=False)

    def test_create_post(self):
        """Creating a post returns 201 with serialized post."""
        Profile.objects.create(handle="dave", display_name="Dave")
        resp = self.client.post(
            "/api/posts/",
            data=json.dumps({
                "handle": "dave",
                "caption": "My first post",
                "image_url": "https://example.com/img.jpg",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        data = json.loads(resp.content)
        self.assertIn("post", data)
        post_data = data["post"]
        self.assertEqual(post_data["caption"], "My first post")
        self.assertEqual(Post.objects.filter(profile__handle="dave").count(), 1)

    def test_create_post_with_multiple_s3_keys_creates_post_images(self):
        """Creating a post with s3_keys creates PostImage entries."""
        Profile.objects.create(handle="eve", display_name="Eve")
        s3_keys = ["bills-app/uploads/key1.jpg", "bills-app/uploads/key2.png"]
        resp = self.client.post(
            "/api/posts/",
            data=json.dumps({
                "handle": "eve",
                "caption": "Multi-image post",
                "s3_keys": s3_keys,
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        post = Post.objects.get(profile__handle="eve")
        images = list(post.images.order_by("order"))
        self.assertEqual(len(images), 2)
        self.assertEqual(images[0].s3_key, s3_keys[0])
        self.assertEqual(images[1].s3_key, s3_keys[1])
        self.assertEqual(images[0].order, 0)
        self.assertEqual(images[1].order, 1)

    def test_create_post_with_five_s3_keys_does_not_fail(self):
        """Creating a post with 5 images should succeed and preserve order."""
        Profile.objects.create(handle="multi5", display_name="Multi Five")
        s3_keys = [
            "bills-app/uploads/key1.jpg",
            "bills-app/uploads/key2.jpg",
            "bills-app/uploads/key3.jpg",
            "bills-app/uploads/key4.jpg",
            "bills-app/uploads/key5.jpg",
        ]
        resp = self.client.post(
            "/api/posts/",
            data=json.dumps({
                "handle": "multi5",
                "caption": "5 photo upload",
                "s3_keys": s3_keys,
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        post = Post.objects.get(profile__handle="multi5")
        images = list(post.images.order_by("order"))
        self.assertEqual(len(images), 5)
        self.assertEqual([img.s3_key for img in images], s3_keys)
        self.assertEqual([img.order for img in images], [0, 1, 2, 3, 4])

    def test_get_post_detail(self):
        """GET posts/<id>/ returns post detail."""
        profile = Profile.objects.create(handle="frank", display_name="Frank")
        post = Post.objects.create(
            profile=profile,
            caption="Detail test",
            amount=Decimal("99.99"),
        )
        resp = self.client.get(f"/api/posts/{post.id}/")
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertEqual(data["post"]["id"], post.id)
        self.assertEqual(data["post"]["caption"], "Detail test")
        self.assertEqual(data["post"]["amount"], "99.99")

    @patch("social.views._s3")
    def test_delete_post(self, mock_s3):
        """DELETE posts/<id>/ removes the post."""
        mock_s3.return_value = MagicMock()
        profile = Profile.objects.create(handle="grace", display_name="Grace")
        post = Post.objects.create(profile=profile, caption="To delete")
        post_id = post.id
        resp = self.client.delete(f"/api/posts/{post_id}/")
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertTrue(data.get("deleted"))
        self.assertFalse(Post.objects.filter(id=post_id).exists())

    def test_feed_returns_posts(self):
        """GET feeds/main/ returns posts."""
        profile = Profile.objects.create(handle="henry", display_name="Henry")
        Post.objects.create(profile=profile, caption="Feed post 1")
        Post.objects.create(profile=profile, caption="Feed post 2")
        resp = self.client.get("/api/feeds/main/")
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertIn("items", data)
        items = data["items"]
        self.assertGreaterEqual(len(items), 2)
        captions = [p["caption"] for p in items]
        self.assertIn("Feed post 1", captions)
        self.assertIn("Feed post 2", captions)

    def test_profile_feed_returns_profile_posts(self):
        """GET feeds/profile/<handle>/ returns profile and its posts."""
        profile = Profile.objects.create(handle="iris", display_name="Iris")
        Post.objects.create(profile=profile, caption="Iris post")
        resp = self.client.get("/api/feeds/profile/iris/")
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertEqual(data["profile"]["handle"], "iris")
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["caption"], "Iris post")


class LikeTests(TestCase):
    """Toggle like on/off, liked_by_me in feed, like count increments/decrements."""

    def setUp(self):
        self.client = self.client_class(enforce_csrf_checks=False)

    def test_toggle_like_on(self):
        """POST like creates a like and increments count."""
        profile = Profile.objects.create(handle="james", display_name="James")
        post = Post.objects.create(profile=profile, caption="Like me")
        resp = self.client.post(
            f"/api/posts/{post.id}/like/",
            data=json.dumps({"handle": "james"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertTrue(data["liked"])
        self.assertEqual(data["likes"], 1)
        post.refresh_from_db()
        self.assertEqual(post.likes, 1)
        self.assertTrue(Like.objects.filter(profile=profile, post=post).exists())

    def test_toggle_like_off(self):
        """POST like when already liked removes like and decrements count."""
        profile = Profile.objects.create(handle="kate", display_name="Kate")
        post = Post.objects.create(profile=profile, caption="Unlike me", likes=1)
        Like.objects.create(profile=profile, post=post)
        resp = self.client.post(
            f"/api/posts/{post.id}/like/",
            data=json.dumps({"handle": "kate"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertFalse(data["liked"])
        self.assertEqual(data["likes"], 0)
        post.refresh_from_db()
        self.assertEqual(post.likes, 0)
        self.assertFalse(Like.objects.filter(profile=profile, post=post).exists())

    def test_liked_by_me_in_feed(self):
        """Feed includes liked_by_me true when my_handle has liked the post."""
        liker = Profile.objects.create(handle="liker", display_name="Liker")
        author = Profile.objects.create(handle="author", display_name="Author")
        post = Post.objects.create(profile=author, caption="Liked post")
        Like.objects.create(profile=liker, post=post)
        post.likes = 1
        post.save()
        resp = self.client.get("/api/feeds/main/?my_handle=liker")
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        post_item = next((p for p in data["items"] if p["id"] == post.id), None)
        self.assertIsNotNone(post_item)
        self.assertTrue(post_item["liked_by_me"])

    def test_liked_by_me_false_when_not_liked(self):
        """Feed includes liked_by_me false when my_handle has not liked the post."""
        viewer = Profile.objects.create(handle="viewer", display_name="Viewer")
        author = Profile.objects.create(handle="author2", display_name="Author2")
        post = Post.objects.create(profile=author, caption="Not liked")
        resp = self.client.get("/api/feeds/main/?my_handle=viewer")
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        post_item = next((p for p in data["items"] if p["id"] == post.id), None)
        self.assertIsNotNone(post_item)
        self.assertFalse(post_item["liked_by_me"])


class CommentTests(TestCase):
    """Create comment, threaded reply, edit own comment (edited_at), cannot edit others."""

    def setUp(self):
        self.client = self.client_class(enforce_csrf_checks=False)

    def test_create_comment(self):
        """POST comments creates a top-level comment."""
        profile = Profile.objects.create(handle="mike", display_name="Mike")
        post = Post.objects.create(profile=profile, caption="Comment here")
        resp = self.client.post(
            f"/api/posts/{post.id}/comments/",
            data=json.dumps({
                "handle": "mike",
                "text": "Great post!",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        data = json.loads(resp.content)
        self.assertIn("comment", data)
        self.assertEqual(data["comment"]["text"], "Great post!")
        self.assertIsNone(data["comment"].get("parent_id"))
        comment = Comment.objects.get(post=post)
        self.assertEqual(comment.text, "Great post!")
        self.assertIsNone(comment.parent_id)

    def test_create_threaded_reply(self):
        """POST comments with parent_id creates a reply."""
        author = Profile.objects.create(handle="nancy", display_name="Nancy")
        replier = Profile.objects.create(handle="oscar", display_name="Oscar")
        post = Post.objects.create(profile=author, caption="Thread")
        parent = Comment.objects.create(post=post, profile=author, text="Parent")
        resp = self.client.post(
            f"/api/posts/{post.id}/comments/",
            data=json.dumps({
                "handle": "oscar",
                "text": "Reply to parent",
                "parent_id": parent.id,
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        data = json.loads(resp.content)
        self.assertEqual(data["comment"]["parent_id"], parent.id)
        self.assertEqual(data["comment"]["text"], "Reply to parent")
        reply = Comment.objects.get(post=post, parent=parent)
        self.assertEqual(reply.profile.handle, "oscar")

    def test_edit_own_comment_sets_edited_at(self):
        """PATCH comment with own handle updates text and sets edited_at."""
        profile = Profile.objects.create(handle="paul", display_name="Paul")
        post = Post.objects.create(profile=profile, caption="Post")
        comment = Comment.objects.create(post=post, profile=profile, text="Original")
        self.assertIsNone(comment.edited_at)
        resp = self.client.patch(
            f"/api/comments/{comment.id}/",
            data=json.dumps({
                "handle": "paul",
                "text": "Edited text",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertEqual(data["comment"]["text"], "Edited text")
        self.assertIsNotNone(data["comment"]["edited_at"])
        comment.refresh_from_db()
        self.assertIsNotNone(comment.edited_at)
        self.assertEqual(comment.text, "Edited text")

    def test_cannot_edit_others_comment_returns_403(self):
        """PATCH comment with different handle returns 403."""
        owner = Profile.objects.create(handle="owner", display_name="Owner")
        other = Profile.objects.create(handle="other", display_name="Other")
        post = Post.objects.create(profile=owner, caption="Post")
        comment = Comment.objects.create(post=post, profile=owner, text="Mine")
        resp = self.client.patch(
            f"/api/comments/{comment.id}/",
            data=json.dumps({
                "handle": "other",
                "text": "Hacked",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 403)
        data = json.loads(resp.content)
        self.assertIn("error", data)
        self.assertIn("Not your comment", data["error"])
        comment.refresh_from_db()
        self.assertEqual(comment.text, "Mine")


class TipTests(TestCase):
    """Tip a post, coins transfer, cannot tip own post, insufficient coins."""

    def setUp(self):
        self.client = self.client_class(enforce_csrf_checks=False)

    def test_tip_post_coins_transfer(self):
        """Tipping deducts coins from tipper and adds to author."""
        tipper = Profile.objects.create(handle="tipper", display_name="Tipper", coins=200)
        author = Profile.objects.create(handle="author", display_name="Author", coins=50)
        post = Post.objects.create(profile=author, caption="Tip me")
        resp = self.client.post(
            f"/api/posts/{post.id}/tip/",
            data=json.dumps({
                "from_handle": "tipper",
                "amount": 25,
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertEqual(data["tipped"], 25)
        self.assertEqual(data["your_coins"], 175)
        self.assertEqual(data["post_tips"], 25)
        tipper.refresh_from_db()
        author.refresh_from_db()
        post.refresh_from_db()
        self.assertEqual(tipper.coins, 175)
        self.assertEqual(author.coins, 75)
        self.assertEqual(post.tips_total, 25)

    def test_cannot_tip_own_post(self):
        """Tipping own post returns 400."""
        profile = Profile.objects.create(handle="self_tipper", display_name="Self", coins=100)
        post = Post.objects.create(profile=profile, caption="My post")
        resp = self.client.post(
            f"/api/posts/{post.id}/tip/",
            data=json.dumps({
                "from_handle": "self_tipper",
                "amount": 10,
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        data = json.loads(resp.content)
        self.assertIn("error", data)
        self.assertIn("tip yourself", data["error"].lower())
        profile.refresh_from_db()
        self.assertEqual(profile.coins, 100)

    def test_cannot_tip_with_insufficient_coins(self):
        """Tipping more than available coins returns 400."""
        tipper = Profile.objects.create(handle="poor", display_name="Poor", coins=5)
        author = Profile.objects.create(handle="rich", display_name="Rich", coins=100)
        post = Post.objects.create(profile=author, caption="Tip me")
        resp = self.client.post(
            f"/api/posts/{post.id}/tip/",
            data=json.dumps({
                "from_handle": "poor",
                "amount": 50,
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        data = json.loads(resp.content)
        self.assertIn("error", data)
        self.assertIn("Not enough coins", data["error"])
        tipper.refresh_from_db()
        author.refresh_from_db()
        self.assertEqual(tipper.coins, 5)
        self.assertEqual(author.coins, 100)


class PresignTests(TestCase):
    """Presign upload endpoint returns upload_url and s3_key."""

    def setUp(self):
        self.client = self.client_class(enforce_csrf_checks=False)

    @patch("social.views._s3")
    def test_presign_returns_upload_url_and_s3_key(self, mock_s3):
        """POST media/presign/ returns 200 with upload_url and s3_key."""
        mock_s3.return_value.generate_presigned_url.return_value = "https://s3.example.com/presigned"
        resp = self.client.post(
            "/api/media/presign/",
            data=json.dumps({
                "filename": "photo.png",
                "content_type": "image/png",
            }),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.content)
        self.assertIn("upload_url", data)
        self.assertIn("s3_key", data)
        self.assertTrue(data["upload_url"].startswith("https://"))
        self.assertIn("bills-app/uploads/", data["s3_key"])
        self.assertTrue(data["s3_key"].endswith(".png"))


class AnalysisAggregationTests(TestCase):
    """Parsing + multi-image amount aggregation behavior."""

    def test_to_decimal_parses_common_money_formats(self):
        self.assertEqual(_to_decimal("1,299.50"), Decimal("1299.50"))
        self.assertEqual(_to_decimal("₹2,499"), Decimal("2499"))
        self.assertEqual(_to_decimal("INR 300"), Decimal("300"))
        self.assertEqual(_to_decimal("Rs. 75"), Decimal("75"))

    def test_amount_from_caption_extracts_currency_amount(self):
        self.assertEqual(_amount_from_caption("Dinner was ₹1,250 today"), Decimal("1250"))
        self.assertEqual(_amount_from_caption("Paid INR 499 for snacks"), Decimal("499"))
        self.assertIsNone(_amount_from_caption("No amount here"))

    def test_aggregate_analyses_sums_five_images(self):
        analyses = [
            {"amount": "100", "original_amount": None, "category": "food", "tags": ["#a"], "confidence": 0.9, "is_monetary": True},
            {"amount": "200", "original_amount": None, "category": "food", "tags": ["#b"], "confidence": 0.8, "is_monetary": True},
            {"amount": "300", "original_amount": None, "category": "food", "tags": ["#c"], "confidence": 0.7, "is_monetary": True},
            {"amount": "400", "original_amount": None, "category": "food", "tags": ["#d"], "confidence": 0.6, "is_monetary": True},
            {"amount": "500", "original_amount": "650", "category": "food", "tags": ["#e"], "confidence": 0.5, "is_monetary": True},
        ]
        result = _aggregate_analyses(analyses, caption="", image_count_submitted=5)
        self.assertEqual(result["status"], "done")
        self.assertEqual(result["amount"], 1500.0)
        self.assertEqual(result["original_amount"], 650.0)
        self.assertEqual(result["image_count_analyzed"], 5)
        self.assertEqual(result["image_count_submitted"], 5)

    def test_aggregate_analyses_uses_caption_amount_when_ai_errors(self):
        analyses = [
            {"error": "upstream timeout", "amount": 0, "tags": [], "confidence": 0},
            {"error": "upstream timeout", "amount": 0, "tags": [], "confidence": 0},
        ]
        result = _aggregate_analyses(analyses, caption="Spent ₹2,345 total", image_count_submitted=2)
        self.assertEqual(result["status"], "done")
        self.assertEqual(result["amount"], 2345.0)
        self.assertEqual(result["image_count_analyzed"], 0)
        self.assertEqual(result["image_count_submitted"], 2)
