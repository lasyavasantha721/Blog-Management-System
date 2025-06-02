
from fastapi import APIRouter, Depends, HTTPException, status, Form, Request, UploadFile, File
from config.auth_deps import get_current_user_from_cookie, verify_password, hash_password
from models.user import UserOut, UserProfileOut
from bson import ObjectId
#from fastapi.templating import Jinja2Templates
import os

from config.db import find_many, update_one, find_one, get_collection


router = APIRouter(tags=["profile"])



@router.get(
    "/profile",
    status_code=status.HTTP_200_OK,
)
async def get_user_profile(
    user_doc = Depends(get_current_user_from_cookie),
):
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # 1) Fetch all posts by this user
    raw_posts = find_many("blog_posts", {"user_id": ObjectId(user_doc["_id"])})
    # 2) Build a simple posts list for the frontend
    posts = [
        {
            "id":      str(p["_id"]),
            "title":   p.get("title", ""),
            "content": p.get("content", ""),
            # optionally include category, created_at, etc.
        }
        for p in raw_posts
    ]
    total = len(posts)
    
    # Compute photo_url
    raw_path = user_doc.get("photo_path")
    if raw_path:
        photo_url = f"/static/{raw_path}"
    else:
        photo_url = "/static/user_photos/default-avatar.png"

    # 3) Return both profile info AND the posts array
    return {
        "id":          str(user_doc["_id"]),
        "username":    user_doc["username"],
        "email":       user_doc["email"],
        "role":        user_doc["role"],
        "name":        user_doc.get("name"),
        "photo_path":  raw_path,
        "photo_url":   photo_url, 
        "total_posts": total,
        "posts":       posts,   # ← your JS will pick this up
    }

@router.put(
    "/edit_profile",
    status_code=status.HTTP_200_OK,
)
def edit_profile(
    new_name:     str = Form(None),
    new_username: str = Form(None),
    new_email:    str = Form(None),
    user_doc            = Depends(get_current_user_from_cookie),
):
    # 1) Ensure logged in
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # 2) Build the update dict
    updates: dict = {}
    if new_name and new_name.strip():
        updates["name"] = new_name.strip()
    if new_username and new_username.strip():
        updates["username"] = new_username.strip()
    if new_email and new_email.strip():
        updates["email"] = new_email.strip().lower()

    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No changes provided")

    # 3) Apply the update
    modified = update_one(
        "users",
        {"_id": ObjectId(user_doc["_id"])},
        updates
    )
    if modified == 0:
        raise HTTPException(status_code= status.HTTP_400_BAD_REQUEST, detail="No changes were made to the profile")

    # 4) Return the JSON your JS is looking for
    return {"message": "Profile updated successfully"}


@router.put(
    "/change_password",
    status_code=status.HTTP_200_OK,
)
def change_password(
    current_password: str = Form(...),
    new_password:     str = Form(...),
    current_user           = Depends(get_current_user_from_cookie),
):
    # 1) Ensure the user is authenticated
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # 2) Lookup user in DB
    user_doc = find_one("users", {"_id": ObjectId(current_user["_id"])})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 3) Verify their current password
    if not verify_password(current_password, user_doc["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")

    # 4) Hash & update to the new one
    new_hashed = hash_password(new_password.strip())
    modified = update_one(
        "users",
        {"_id": ObjectId(current_user["_id"])},
        {"hashed_password": new_hashed}
    )
    if modified == 0:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update password")

    # 5) Return the JSON your JS expects
    return {"message": "Password updated successfully"}


@router.post(
    "/upload_profile_photo",
    status_code=status.HTTP_200_OK,
)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user   = Depends(get_current_user_from_cookie),
):
    # 1) Ensure logged in
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # 2) Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must be an image")

    # 3) Prepare upload directory
    upload_dir = "static/user_photos"
    os.makedirs(upload_dir, exist_ok=True)

    # 4) Build a unique filename
    ext      = os.path.splitext(file.filename)[1]                    
    user_id  = str(current_user["_id"])                              
    filename = f"user_{user_id}{ext}"
    file_path = os.path.join(upload_dir, filename)

    # 5) Save to disk
    contents = await file.read()
    with open(file_path, "wb") as out_file:
        out_file.write(contents)

    # 6) Persist the relative path in MongoDB
    photo_path = f"user_photos/{filename}"   # relative to /static
    modified = update_one(
        "users",
        {"_id": ObjectId(current_user["_id"])},
        {"photo_path": photo_path}
    )
    if modified == 0:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to update user profile with photo path")

    # 7) Return the URL your JS will plug into <img src=…>
    return {"photo_url": f"/static/{photo_path}"}


@router.delete(
    "/remove_profile_photo",
    status_code=status.HTTP_200_OK,
)
def remove_profile_photo(
    current_user = Depends(get_current_user_from_cookie),
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # 1) Load the user
    users_col = get_collection("users")
    user_doc = users_col.find_one({"_id": ObjectId(current_user["_id"])})
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 2) Remove file on disk if exists
    if photo := user_doc.get("photo_path"):
        try:
            os.remove(os.path.join("static", photo))
        except OSError:
            pass

    # 3) Unset the field properly
    result = users_col.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$unset": {"photo_path": ""}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to remove profile photo field")

    return {"message": "Profile photo removed successfully"}