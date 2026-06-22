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
    fast_model_id: Optional[str] = None
    smart_model_id: Optional[str] = None

class GenerationResponse(BaseModel):
    id: UUID
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class GenerationDetailResponse(BaseModel):
    id: UUID
    profile_id: UUID
    job_id: UUID
    output_type: str
    status: str
    weirdness_level: str
    draft_output: Optional[str] = None
    final_output: Optional[str] = None
    fidelity_score: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ModelsRequest(BaseModel):
    provider: str
    api_key: str

class ModelItem(BaseModel):
    id: str
    name: str

