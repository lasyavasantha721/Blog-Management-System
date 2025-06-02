from fastapi import APIRouter, Depends, Query, Request, Response, Form, HTTPException, status
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from bson import ObjectId
from datetime import datetime, timezone
from email.message import EmailMessage
from jose import jwt, JWTError
from passlib.context import CryptContext
import os
import smtplib

from config.db import find_one, update_one    
from models.user import UserOut
from config.auth_deps import (
    authenticate_user,
    create_access_token,
    get_current_user_from_cookie,
    hash_password,
    verify_password,
    COOKIE_NAME,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from config.db import find_one, insert_one
from models.user import RegisterRequest

router = APIRouter()
router.mount("/static", StaticFiles(directory="static"), name="static")
# Initialize Jinja2 templates for rendering HTML
templates = Jinja2Templates(directory="templates")

Base_url = os.getenv("BASE_URL")

@router.get("/request_password_reset")
def request_password_reset(request: Request):
    return templates.TemplateResponse("forgot_password.html", {"request": request})

@router.get(
    "/reset_password",
    response_class=HTMLResponse,
    summary="Serve the password‐reset form",
)
def reset_password_page(
    request: Request,
    token: str = Query(None, description="Password reset token"),
):
    if not token:
        raise HTTPException(400, "Missing reset token in URL")
    return templates.TemplateResponse(
        "reset_password.html",
        {
            "request": request,
            "token": token,   # pass the token into your template
        }
    )
# --- User Routes ---

@router.get("/")
def index(request: Request):
    """
    Renders the index page HTML.
    """
    return templates.TemplateResponse("index.html", {"request": request})


@router.post("/register")
def register_user(req: RegisterRequest):
    # 1) Check username / email uniqueness
    if find_one("users", {"username": req.username}):
        raise HTTPException(status_code=400, detail="Username already exists")
    if find_one("users", {"email": req.email.strip().lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2) Hash password & build user doc
    hashed = hash_password(req.password)
    user_doc = {
        "username":        req.username,
        "email":           req.email.strip().lower(),
        "hashed_password": hashed,
        "role":            req.role,
    }

    # 3) Insert into DB
    user_id = insert_one("users", user_doc)
    
    # ← Return a dict (FastAPI will serialize this as JSON)
    return {
        "message": "User registered successfully",
        "id": user_id
    }


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
     # 2. Verify password
    if not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user["email"]})
    resp = JSONResponse(
        {"message": "Logged in successfully"},  # <-- JSON body
        status_code=200,
    )
    resp.set_cookie(
        COOKIE_NAME,
        token,          # store the token in an HTTP-only cookie
        httponly=True,
        samesite="Lax"
    )
    return resp



@router.get("/me", response_model=UserOut)
def read_current_user(
    user_doc=Depends(get_current_user_from_cookie),
):
    """
    Returns the current user based on the JWT stored in an HTTP-only cookie.
    """
    if not user_doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # user_doc is the raw dict from the DB
    return UserOut(
        id=str(user_doc["_id"]),
        username=user_doc["username"],
        email=user_doc["email"],
        role=user_doc["role"],
    )

@router.post("/logout")
def logout():
    # Build a JSONResponse so we can mutate its cookies
    response = JSONResponse({"message": "Successfully logged out"}, status_code=200)

    # Delete the exact same cookie we set on login
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",           # must match the path used when setting it
        httponly=True,      # same flags as when you set it
        samesite="Lax",     # ditto
    )

    return response


# ──────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────

RESET_SECRET = os.getenv("RESET_SECRET", "another_secret_key")
RESET_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", 30))
SMTP_USER = os.getenv("EMAIL_USER")
SMTP_PASS = os.getenv("EMAIL_PASSWORD")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ──────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────

def create_reset_token(user_oid: ObjectId) -> str:
    expire = datetime.utcnow() + timedelta(minutes=RESET_EXPIRE_MINUTES)
    to_encode = {"user_id": str(user_oid), "exp": expire}  #Token Payload- It includes the user ID and expiry timestamp.
    return jwt.encode(to_encode, RESET_SECRET, algorithm="HS256")

def send_reset_email(to_email: str, reset_link: str) -> None:
    if not SMTP_USER or not SMTP_PASS:
        raise RuntimeError("Missing SMTP_USER or SMTP_PASSWORD in env")
    
    msg = EmailMessage() # creating email msg
    msg["Subject"] = "Password Reset for MY BLOG account"
    msg["From"]    = SMTP_USER
    msg["To"]      = to_email   #users  email
    msg.set_content(
        f"Hi!\n\nClick the link below to reset your password:\n\n{reset_link}\n\n"
        "If you did not request a password reset, just ignore this."
    )
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:  
        smtp.login(SMTP_USER, SMTP_PASS)
        smtp.send_message(msg)

# ──────────────────────────────────────────────────────
# 1) Request a password reset
# ──────────────────────────────────────────────────────

@router.post("/request_password_reset", status_code=status.HTTP_200_OK)
def request_password_reset(
    email: str = Form(...),
):
    """
    Send a password‐reset link to the given email, if it exists.
    Always returns the same message for security.
    """
    # 1) Look up user (case‐insensitive)
    user_doc = find_one("users", {"email": email.strip().lower()})

    response = {"message": "If an account with that email exists, a reset link has been sent."}

    if not user_doc:
        return response

    # 3) Generate a reset token + link to your front‐end reset page
    token = create_reset_token(user_doc["_id"])
    
    reset_link = f"{Base_url}/reset_password?token={token}"

    try:
        send_reset_email(email, reset_link)
    except Exception as e:
        # Log the error in real life!
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send reset email"
        )

    return response

# ──────────────────────────────────────────────────────
# 2) Consume the reset link, set a new password
# ──────────────────────────────────────────────────────

@router.put("/reset_password", status_code=status.HTTP_200_OK)
def reset_password(
    token:        str = Form(...),
    new_password: str = Form(...),
):
    """
    Verify the reset token, then update the user's password.
    """
    # 1) Decode & verify token
    try:
        payload = jwt.decode(token, RESET_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if user_id is None:
            raise JWTError("No user_id in token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset token expired")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    # 2) Lookup the user
    oid = ObjectId(user_id)
    user_doc = find_one("users", {"_id": oid})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    # 3) Hash & write the new password
    hashed = pwd_context.hash(new_password.strip())
    modified = update_one("users", {"_id": oid}, {"hashed_password": hashed})
    if modified == 0:
        raise HTTPException(status_code=500, detail="Failed to update password")

    return {"message": "Password updated successfully"}
