# app/schema/blog.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BlogPostCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"

class BlogPostOut(BaseModel):
    id: str = Field(alias="_id") #Maps MongoDB’s _id to your Python model’s id
    title: str
    content: str
    category: str
    user_id: str
    username: str
    created_at: datetime  

    class Config:
        validate_by_name = True # allows the model to accept both the alias _id and the Pythonic field name id as input
        json_encoders = {datetime: lambda dt: dt.isoformat()}