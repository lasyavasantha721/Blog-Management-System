from pydantic import BaseModel, EmailStr
from typing import Literal
from typing import Optional
# Data model
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"  # Default role is 'user'

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