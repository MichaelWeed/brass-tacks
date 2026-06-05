from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None

class UserCreate(UserBase):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: uuid.UUID

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
