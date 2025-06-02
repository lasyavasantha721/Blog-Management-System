from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from routes.user import router as user
from routes.blog import router as blog_router
from routes.profile import router as profile
from routes.admin import router as admin_router


app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(user)
app.include_router(blog_router)
app.include_router(profile)
app.include_router(admin_router)
