from django.db import models
from django.utils import timezone


class Profile(models.Model):
    handle = models.SlugField(max_length=80, unique=True)
    display_name = models.CharField(max_length=120)
    avatar_url = models.URLField(blank=True, max_length=600)
    bio = models.TextField(blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")
    preferred_currency = models.CharField(max_length=10, default="INR")
    coins = models.PositiveIntegerField(default=100)
    last_coin_refresh = models.DateField(null=True, blank=True)
    followers = models.PositiveIntegerField(default=0)
    clerk_user_id = models.CharField(max_length=200, blank=True, default="", db_index=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Profile"
        verbose_name_plural = "Profiles"

    def __str__(self) -> str:
        return self.handle


class Post(models.Model):
    MEDIA_LABELS = [("Post", "Post"), ("Story", "Story"), ("Reel", "Reel")]
    CATEGORIES = [
        ("food", "Food & Dining"), ("shopping", "Shopping"), ("travel", "Travel"),
        ("entertainment", "Entertainment"), ("transport", "Transport"),
        ("utilities", "Utilities"), ("health", "Health"),
        ("education", "Education"), ("other", "Other"),
    ]

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="posts")
    image_url = models.URLField(max_length=700, blank=True, default="")
    s3_key = models.CharField(max_length=500, blank=True, default="")
    caption = models.TextField(default="")
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    original_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    category = models.CharField(max_length=30, choices=CATEGORIES, default="other")
    tag = models.CharField(max_length=50, blank=True, default="")
    media_label = models.CharField(max_length=20, choices=MEDIA_LABELS, default="Post")
    location = models.CharField(max_length=140, blank=True, default="")
    ai_analysis = models.JSONField(default=dict, blank=True)
    tips_total = models.PositiveIntegerField(default=0)
    likes = models.PositiveIntegerField(default=0)
    comments = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.profile.handle} · {self.category} · ₹{self.amount or '?'}"


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="post_comments")
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="user_comments")
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
    text = models.TextField()
    edited_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("created_at",)

    def __str__(self) -> str:
        return f"{self.profile.handle}: {self.text[:50]}"


class PostImage(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="images")
    s3_key = models.CharField(max_length=500, blank=True, default="")
    image_url = models.URLField(max_length=700, blank=True, default="")
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("order",)


class Like(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="likes")
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="post_likes")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("profile", "post")
