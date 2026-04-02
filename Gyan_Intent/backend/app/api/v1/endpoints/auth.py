"""Authentication endpoints."""

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

from app.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class UserCreate(BaseModel):
    """User registration request."""
    email: EmailStr
    password: str
    name: str


class UserResponse(BaseModel):
    """User response."""
    id: str
    email: str
    name: str


class TokenResponse(BaseModel):
    """Token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    """Register new user."""
    # TODO: Implement user registration
    
    return UserResponse(
        id="user_123",
        email=user.email,
        name=user.name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login user."""
    # TODO: Implement authentication
    
    return TokenResponse(
        access_token="access_token_123",
        refresh_token="refresh_token_123",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str):
    """Refresh access token."""
    # TODO: Implement token refresh
    
    return TokenResponse(
        access_token="new_access_token_123",
        refresh_token="new_refresh_token_123",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user info."""
    # TODO: Implement user retrieval
    
    return UserResponse(
        id="user_123",
        email="user@example.com",
        name="Test User",
    )
