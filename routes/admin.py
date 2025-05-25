from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from bson import ObjectId

from config.db import find_one, find_many, update_one, delete_one
from config.auth_deps import get_current_user_from_cookie
from models.role import Role

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(user=Depends(get_current_user_from_cookie)):
    if not user or user.get("role") != Role.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return user

@router.get("/users", summary="List all users (admin only)")
def list_users(admin=Depends(require_admin)):
    raw = find_many("users", {})
    return [
        {
            "id":       str(u["_id"]),
            "username": u["username"],
            "email":    u.get("email"),
            "role":     u.get("role"),
        }
        for u in raw
    ]

@router.get("/users/{user_id}", summary="Get details for one user")
def get_user(user_id: str, admin=Depends(require_admin)):
    u = find_one("users", {"_id": ObjectId(user_id)})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    # count their posts
    posts = find_many("blog_posts", {"user_id": ObjectId(user_id)})
    return {
        "id":          str(u["_id"]),
        "username":    u["username"],
        "email":       u.get("email"),
        "role":        u.get("role"),
        "total_posts": len(posts),
    }

@router.put("/users/{user_id}/promote", summary="Promote a user to admin")
def promote_user(user_id: str, admin=Depends(require_admin)):
    u = find_one("users", {"_id": ObjectId(user_id)})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u.get("role") == Role.ADMIN.value:
        raise HTTPException(status_code=400, detail="User is already an admin")
    modified = update_one("users", {"_id": ObjectId(user_id)}, {"role": Role.ADMIN.value})
    if not modified:
        raise HTTPException(status_code=500, detail="Failed to promote user")
    return {"message": "User promoted to admin"}

@router.put("/users/{user_id}/demote", summary="Demote an admin to user")
def demote_user(user_id: str, admin=Depends(require_admin)):
    if str(admin["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot demote yourself")
    u = find_one("users", {"_id": ObjectId(user_id)})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u.get("role") != Role.ADMIN.value:
        raise HTTPException(status_code=400, detail="User is not an admin")
    modified = update_one("users", {"_id": ObjectId(user_id)}, {"role": Role.USER.value})
    if not modified:
        raise HTTPException(status_code=500, detail="Failed to demote user")
    return {"message": "User demoted to user"}

@router.delete("/users/{user_id}", summary="Delete a user account")
def delete_user(user_id: str, admin=Depends(require_admin)):
    u = find_one("users", {"_id": ObjectId(user_id)})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    deleted = delete_one("users", {"_id": ObjectId(user_id)})
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete user")
    return {"message": "User deleted successfully"}


