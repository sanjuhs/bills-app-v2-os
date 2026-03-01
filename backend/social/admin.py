from django.contrib import admin

from .models import Profile, Post


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("handle", "display_name", "followers", "is_verified", "created_at")
    search_fields = ("handle", "display_name")
    list_filter = ("is_verified",)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "profile", "media_label", "likes", "comments", "created_at")
    list_filter = ("media_label",)
    search_fields = ("profile__handle", "caption")
