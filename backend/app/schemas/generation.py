from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class GenerationCreate(BaseModel):
    profile_id: UUID
    job_id: UUID
    output_type: str # resume, cover_letter
    weirdness_level: str = "medium"
    api_provider: Optional[str] = None
    api_key: Optional[str] = None
    model_id: Optional[str] = None

class GenerationResponse(BaseModel):
    id: UUID
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ModelsRequest(BaseModel):
    provider: str
    api_key: str

class ModelItem(BaseModel):
    id: str
    name: str

