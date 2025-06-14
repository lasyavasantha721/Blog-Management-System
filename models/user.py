from pydantic import BaseModel, EmailStr, Field, constr
from fastapi import Form
from typing import Literal
from typing import Optional
# Data model
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"  # Default role is 'user'

class EditProfileForm(BaseModel):
    new_name:     Optional[str]    = Field(None)
    new_username: Optional[str]    = Field(None)
    new_email:    Optional[EmailStr]= None

class UserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    role: Literal["user", "admin"]
    name: Optional[str]       = None
    photo_path: Optional[str] = None

    class Config:
        from_attributes = True

class UserProfileOut(UserOut):
    total_posts: Optional[int] = None
