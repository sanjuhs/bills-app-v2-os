from django.urls import path

from . import views

urlpatterns = [
    path("profiles/me/", views.my_profile, name="my_profile"),
    path("profiles/", views.create_profile, name="create_profile"),
    path("profiles/<str:handle>/", views.update_profile, name="update_profile"),
    path("feeds/main/", views.main_feed, name="main_feed"),
    path("feeds/profile/<str:handle>/", views.profile_feed, name="profile_feed"),
    path("media/presign/", views.presign_upload, name="presign_upload"),
    path("posts/", views.create_post, name="create_post"),
    path("posts/<int:post_id>/", views.post_detail, name="post_detail"),
    path("posts/<int:post_id>/comments/", views.post_comments, name="post_comments"),
    path("posts/<int:post_id>/tip/", views.tip_post, name="tip_post"),
    path("posts/<int:post_id>/like/", views.toggle_like, name="toggle_like"),
    path("comments/<int:comment_id>/", views.edit_comment, name="edit_comment"),
]
