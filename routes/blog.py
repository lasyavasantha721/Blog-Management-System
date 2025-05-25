# routes/blog.py
from fastapi import APIRouter, Depends, HTTPException, status, Form
from datetime import datetime, timezone
from typing import List

from bson import ObjectId

from config.db import insert_one, find_many, update_one, delete_one, find_one
from config.auth_deps import get_current_user_from_cookie
from models.blogpost import BlogPostCreate, BlogPostOut
from models.role import Role

router = APIRouter(tags=["blog_posts"])

@router.post(
    "/blog_posts",
    response_model=BlogPostOut,
    status_code=status.HTTP_201_CREATED
)
async def create_blog_post(
    blog: BlogPostCreate,
    user_doc = Depends(get_current_user_from_cookie),
):
    # 1) ensure authenticated
    if not user_doc:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 2) build the document
    now = datetime.now(timezone.utc)
    post_doc = {
        "title":     blog.title,
        "content":   blog.content,
        "category":  blog.category,
        "user_id":   ObjectId(user_doc["_id"]),
        "username":  user_doc["username"],
        "created_at": now,

    }

    # 3) insert and get the new ID
    inserted_id = insert_one("blog_posts", post_doc)

    # 4) return in the shape of BlogPostOut
    return {
        "_id":     inserted_id,
        "title":   blog.title,
        "content": blog.content,
        "category": blog.category,
        "user_id": str(user_doc["_id"]),
        "username": user_doc["username"],
        "created_at": now.isoformat(),  # match json_encoders or let Pydantic handle datetime
    }



@router.get(
    "/blog_posts",
    response_model=List[BlogPostOut],
    status_code=status.HTTP_200_OK
)
async def get_blog_posts(
    user_doc = Depends(get_current_user_from_cookie),
):
    # 1) ensure authenticated
    if not user_doc:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 2) fetch all posts from Mongo
    raw_posts = find_many("blog_posts", {})  # returns list of dicts

    # 3) transform each one
    result = []
    for post in raw_posts:
        result.append({
            "_id":       str(post["_id"]),
            "title":     post["title"],
            "content":   post["content"],
            "category":  post.get("category", "general"),
            "user_id":   str(post["user_id"]),
            "username":  post["username"],
            "created_at": post.get("created_at", datetime.now(timezone.utc)),
        })

    return result


@router.put(
    "/blog_posts/{post_id}",
    status_code=status.HTTP_200_OK,
)
def update_blog_post(
    post_id: str,
    title: str   = Form(...),
    content: str = Form(...),
    current_user = Depends(get_current_user_from_cookie),
):
    # 1) Parse & validate the ObjectId
    try:
        oid = ObjectId(post_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    # 2) Fetch existing post
    post = find_one("blog_posts", {"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    # 3) Authorization: owner or admin
    is_owner = str(post["user_id"]) == str(current_user["_id"])
    is_admin = current_user["role"] == Role.ADMIN.value
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")

    # 4) Perform the update
    modified_count = update_one(
        "blog_posts",
        {"_id": oid},
        {"title": title, "content": content}
    )
    if modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update post")

    return {"message": "Blog post updated successfully"}


@router.delete(
    "/blog_posts/{post_id}",
    status_code=status.HTTP_200_OK,
)
def delete_blog_post(
    post_id: str,
    current_user = Depends(get_current_user_from_cookie),
):
    # 1) Parse & validate the ObjectId
    try:
        oid = ObjectId(post_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    # 2) Fetch the post
    post = find_one("blog_posts", {"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")

    # 3) Authorization: owner or admin
    is_owner = str(post["user_id"]) == current_user["_id"]
    is_admin = current_user["role"] == Role.ADMIN.value
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    # 4) Delete it
    deleted_count = delete_one("blog_posts", {"_id": oid})
    if deleted_count == 0:
        raise HTTPException(status_code=500, detail="Failed to delete post")

    return {"message": "Blog post deleted successfully"}


@router.put(
    "/edit_profile",
    status_code=status.HTTP_200_OK,
)
def edit_profile(
    new_name:     str | None = Form(None),
    new_username: str | None = Form(None),
    new_email:    str | None = Form(None),
    current_user            = Depends(get_current_user_from_cookie),
):
    # 1) Must be logged in
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # 2) Build the dict of fields to update
    updates: dict = {}
    if new_name and new_name.strip():
        updates["name"] = new_name.strip()
    if new_username and new_username.strip():
        updates["username"] = new_username.strip()
    if new_email and new_email.strip():
        updates["email"] = new_email.strip().lower()

    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No changes provided")

    # 3) Apply the update in Mongo
    modified_count = update_one(
        "users",
        {"_id": ObjectId(current_user["_id"])},
        updates
    )

    if modified_count == 0:
        # Either the user didn’t exist (odd) or nothing actually changed
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or no change made")

    # 4) Return the exact JSON your JS wants
    return {"message": "Profile updated successfully"}