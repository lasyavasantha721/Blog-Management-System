from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, Request
from typing import Optional
from config.auth_deps import get_current_user_from_cookie, verify_password, hash_password
from bson import ObjectId
#from fastapi.templating import Jinja2Templates
import os
from datetime import datetime, timezone, timedelta
from email.message import EmailMessage
from uuid import uuid4
import smtplib
from config.db import find_many, update_one, find_one, get_collection, insert_one, delete_one

RESET_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", 30))
SMTP_USER = os.getenv("EMAIL_USER")
SMTP_PASS = os.getenv("EMAIL_PASSWORD")

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
        photo_url = "/static/user_photos/default-profile.png"

    # 3) Return both profile info AND the posts array
    return {
        "id":          str(user_doc["_id"]),
        "username":    user_doc["username"],
        "email":       user_doc["email"],
        "role":        user_doc["role"],
        "name":        user_doc.get("name"),        #allows name to be none
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
    request: Request,
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

    # 4) Hash the new password but DO NOT update it yet
    new_hashed = hash_password(new_password.strip())
    
    # 5) Generate confirmation token and store it with expiry
    token = str(uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_EXPIRE_MINUTES)

    now = datetime.now(timezone.utc)
    a=insert_one("password_change_requests", {
        "user_id": current_user["_id"],
        "hashed_password": new_hashed,
        "token": token,
        "created_at": now,
        "expires_at": expires_at
    })
    print(a)

     # 6) Build and send confirmation email
    base_url = str(request.base_url).rstrip("/")
    confirm_link = f"{base_url}/confirm_password_change?token={token}"
    
    try:
        send_password_change_email(
            user_doc["email"],
            confirm_link,
            reject_link=f"{base_url}/reject_password_change?token={token}"  # optional
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send confirmation email"
        )

    return {"message": "We've sent you an email to confirm the password change. Please verify to complete the update."}

    
    
def send_password_change_email(to_email: str, confirm_link: str, reject_link: Optional[str] = None):
    if not SMTP_USER or not SMTP_PASS:
        raise RuntimeError("Missing SMTP_USER or SMTP_PASSWORD in env")

    msg = EmailMessage()
    msg["Subject"] = "Confirm Your Password Change Request"
    msg["From"] = SMTP_USER
    msg["To"] = to_email

    # HTML body
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif;">
        <h2>🔐 Confirm Password Change</h2>
        <p>We received a request to change your password. Please confirm if this was you.</p>
        <p>
          <a href="{confirm_link}" style="padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px;">Yes, it’s me</a>
        </p>
        <p>
          <a href="{reject_link or confirm_link}" style="padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px;">No, I didn’t request this</a>
        </p>
        <p>If you ignore this message, no changes will be made.</p>
      </body>
    </html>
    """

    msg.set_content("Please confirm your password change request.")  # Fallback plain text
    msg.add_alternative(html_body, subtype='html')

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(SMTP_USER, SMTP_PASS)
        smtp.send_message(msg)


@router.get("/confirm_password_change")
def confirm_password_change(token: str):
    
    record = find_one("password_change_requests",{"token": token})
    if not record :
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    user_id = record["user_id"]
    new_hash = record["hashed_password"]

    modified = update_one(
        "users",
        {"_id": user_id},
        {"hashed_password": new_hash}
    )
    if modified == 0:
        raise HTTPException(status_code=500, detail="Failed to update password")
    
    delete_one("password_change_requests", {"token": token})

    return {"message": "✅ Your password has been successfully updated."}

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