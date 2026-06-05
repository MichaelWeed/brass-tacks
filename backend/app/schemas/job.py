from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

class JobBase(BaseModel):
    raw_text: str
    company_name: Optional[str] = None
    role_title: Optional[str] = None

class JobCreate(JobBase):
    pass

class ExtractRequest(BaseModel):
    url: str
    api_provider: Optional[str] = None
    api_key: Optional[str] = None

class ExtractResponse(BaseModel):
    title: str
    company: str
    description: str
    source_url: str = ""
    company_context: Optional[str] = None
    reference_urls: Optional[List[str]] = None

class JobResponse(JobBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
