from fastapi import Request, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

from config.db import find_one

load_dotenv()

# Environment Variables
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15))
COOKIE_NAME = os.getenv("COOKIE_NAME", "access_token")

# FastAPI OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# --- Utility Functions ---

def hash_password(password: str) -> str:
    """Hash a plain-text password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its hashed version."""
    return pwd_context.verify(plain_password, hashed_password)


# --- Database Interaction (Assumes MongoDB) ---

def get_user_by_email(email: str):
    """Retrieve a user document by email from the database."""
    return find_one("users", {"email": email})


def authenticate_user(email: str, password: str):
    user = get_user_by_email(email)
    if not user:
        return False
    return user


# --- JWT Token Handling ---

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Generate a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str):
    """Decode a JWT token and return the corresponding user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    if not token:
        return None

    token = token.removeprefix("Bearer").strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
        return get_user_by_email(username)
    except JWTError:
        raise credentials_exception


# --- Cookie Authentication ---

def get_current_user_from_cookie(request: Request):
    """Retrieve the current user from the access token stored in cookies."""
    token = request.cookies.get(COOKIE_NAME)
    return decode_token(token)
