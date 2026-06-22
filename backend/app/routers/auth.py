from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.core import security
from app.core.config import settings
from app.models.models import User
from app.schemas.user import UserCreate, UserResponse, Token

router = APIRouter()

@router.get("/check")
def check_users(db: Session = Depends(get_db)) -> Any:
    """Check if any users exist in the local database."""
    count = db.query(User).count()
    return {"has_users": count > 0}

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """OAuth2 compatible token login.

    NOTE: For the single-user local model, this functions as local identity selection.
    No password verification is performed; it only verifies the user account exists by email.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found with this email",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserResponse)
def register_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
) -> Any:
    """Create new user.

    NOTE: For seamless local onboarding convenience in a single-user setup,
    if the user already exists by email, we return that existing user record.
    """
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        # For seamless local development, if user already exists, just return it
        return user
    
    new_user = User(
        email=user_in.email,
        auth_provider_id=f"local-{user_in.email}",
        full_name=user_in.full_name,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

