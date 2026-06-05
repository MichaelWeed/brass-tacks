from pydantic import BaseModel
from typing import Optional, Any, Dict
import uuid
from datetime import datetime

class ProfileBase(BaseModel):
    raw_text: str
    is_active: bool = True

class ProfileCreate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    parsed_markdown: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
