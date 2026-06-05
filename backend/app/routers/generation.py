from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.models import User, GenerationRun, MasterProfile, Job
from app.schemas.generation import GenerationCreate, GenerationResponse, ModelsRequest, ModelItem
from app.services.drafter import ai_drafter
from app.services.math_validator import math_validator
from app.services.qdrant_client import vector_store
from sse_starlette.sse import EventSourceResponse
import uuid
import asyncio
from fastapi import Request
import logging
import json
import httpx
from typing import List, Optional

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/start", response_model=GenerationResponse)
async def start_generation(
    data: GenerationCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validate existence and ownership
    profile = db.query(MasterProfile).filter(
        MasterProfile.id == data.profile_id,
        MasterProfile.user_id == current_user.id
    ).first()
    job = db.query(Job).filter(
        Job.id == data.job_id,
        Job.user_id == current_user.id
    ).first()
    
    if not profile or not job:
        raise HTTPException(status_code=404, detail="Profile or Job not found")
    
    # Validate token boundaries using tiktoken (Max 6,000 tokens)
    import tiktoken
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
    except Exception:
        encoding = tiktoken.get_encoding("gpt2")
        
    profile_tokens = len(encoding.encode(profile.raw_text or ""))
    job_tokens = len(encoding.encode(job.raw_text or ""))
    
    if profile_tokens > 6000:
        raise HTTPException(
            status_code=400,
            detail=f"Input size exceeds operational token boundaries (Max 6,000). Master Profile contains {profile_tokens} tokens."
        )
    if job_tokens > 6000:
        raise HTTPException(
            status_code=400,
            detail=f"Input size exceeds operational token boundaries (Max 6,000). Job Description contains {job_tokens} tokens."
        )
    
    # 2. Create Run Record
    run = GenerationRun(
        user_id=profile.user_id,
        profile_id=data.profile_id,
        job_id=data.job_id,
        output_type=data.output_type,
        weirdness_level=data.weirdness_level,
        status="queued"
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    # 3. Queue Background Task with user provider credentials held transiently in memory
    semaphore = getattr(request.app.state, "generation_semaphore", None)
    background_tasks.add_task(
        process_generation_pipeline, 
        run.id, 
        data.api_provider, 
        data.api_key, 
        data.model_id,
        semaphore
    )
    
    return run

@router.post("/models", response_model=List[ModelItem])
async def list_provider_models(data: ModelsRequest):
    """
    Fetch live models from the provider using the user's localized API key.
    This routes around CORS browser limitations while maintaining privacy.
    """
    provider = data.provider.lower()
    api_key = data.api_key.strip()
    
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
        
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if provider == "openai":
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                if response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail=f"OpenAI error: {response.text}")
                res_data = response.json()
                models = []
                for m in res_data.get("data", []):
                    model_id = m.get("id")
                    if model_id and ("gpt" in model_id or "o1" in model_id or "o3" in model_id):
                        models.append(ModelItem(id=model_id, name=model_id))
                models.sort(key=lambda x: (x.id != "gpt-4o-mini", x.id != "gpt-4o", x.id))
                return models
                
            elif provider == "anthropic":
                response = await client.get(
                    "https://api.anthropic.com/v1/models",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01"
                    }
                )
                if response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail=f"Anthropic error: {response.text}")
                res_data = response.json()
                models = []
                for m in res_data.get("data", []):
                    model_id = m.get("id")
                    if model_id:
                        models.append(ModelItem(id=model_id, name=model_id))
                models.sort(key=lambda x: (
                    "claude-3-5-haiku" not in x.id,
                    "claude-3-5-sonnet" not in x.id,
                    x.id
                ))
                return models
                
            elif provider == "google":
                # Try stable channel first
                response = await client.get(
                    f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"
                )
                if response.status_code != 200:
                    # Fallback to beta channel
                    response = await client.get(
                        f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
                    )
                if response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail=f"Google API error: {response.text}")
                
                res_data = response.json()
                models = []
                for m in res_data.get("models", []):
                    name = m.get("name", "")
                    model_id = name.split("/")[-1] if "/" in name else name
                    display_name = m.get("displayName", model_id)
                    supported_methods = m.get("supportedGenerationMethods", [])
                    if "generateContent" in supported_methods and "gemini" in model_id.lower():
                        models.append(ModelItem(id=model_id, name=display_name))
                models.sort(key=lambda x: (
                    "gemini-2.5-flash" not in x.id,
                    "gemini-2.0-flash" not in x.id,
                    "gemini-1.5-flash" not in x.id,
                    x.id
                ))
                return models
                
            elif provider == "grok":
                response = await client.get(
                    "https://api.x.ai/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                if response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail=f"xAI error: {response.text}")
                res_data = response.json()
                models = []
                for m in res_data.get("data", []):
                    model_id = m.get("id")
                    if model_id:
                        models.append(ModelItem(id=model_id, name=model_id))
                models.sort(key=lambda x: ("grok-beta" not in x.id, "grok-2" not in x.id, x.id))
                return models
                
            else:
                raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
                
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching models for {provider}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error discovering models: {str(e)}")


from app.core.db import SessionLocal

@router.get("/events/{run_id}")
async def generation_events(
    run_id: uuid.UUID,
    request: Request,
    token: str = None,
    db: Session = Depends(get_db)
):
    """Stream generation status updates with token fallback."""
    # Verify token if provided via query param (since EventSource doesn't support headers)
    user = None
    if token:
        try:
            from app.api.deps import get_current_user
            user = await get_current_user(token=token, db=db)
        except Exception:
            pass
    
    # In local dev/demo, we might allow bypass if settings allow, 
    # but let's be strict or at least log.
    if not user:
        logger.warning(f"SSE connection without valid token for run {run_id}")
        # For now, we continue to allow debugging, but in prod this would raise 401

    async def event_generator():
        import time
        start_time = time.time()
        last_status = None
        while True:
            if await request.is_disconnected():
                logger.info(f"SSE client disconnected for run {run_id}")
                break

            if time.time() - start_time > 300:
                logger.error(f"SSE connection timeout exceeded for run {run_id}")
                yield {
                    "data": json.dumps({
                        "status": "failed",
                        "error": "Generation timeout exceeded",
                        "completed": True
                    })
                }
                break

            # Use a fresh session for each check to avoid stale data
            with SessionLocal() as session:
                run = session.query(GenerationRun).filter(GenerationRun.id == run_id).first()
                if not run:
                    yield {"data": json.dumps({"status": "failed", "error": "Run not found", "completed": True})}
                    break
                
                if run.status != last_status:
                    yield {
                        "data": json.dumps({
                            "status": run.status,
                            "error": run.error_message,
                            "completed": run.status in ["complete", "failed"]
                        })
                    }
                    last_status = run.status

                if run.status in ["complete", "failed"]:
                    break

            await asyncio.sleep(1)

    return EventSourceResponse(event_generator(), ping=20)

async def process_generation_pipeline(
    run_id: uuid.UUID,
    api_provider: Optional[str] = None,
    api_key: Optional[str] = None,
    model_id: Optional[str] = None,
    semaphore: Optional[asyncio.Semaphore] = None
):
    """Main asynchronous pipeline for resume tailoring."""
    async def execute():
        with SessionLocal() as db:
            try:
                run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
                if not run:
                    logger.error(f"Pipeline failed: Run {run_id} not found")
                    return
                
                # Fetch related data
                profile = db.query(MasterProfile).filter(MasterProfile.id == run.profile_id).first()
                job = db.query(Job).filter(Job.id == run.job_id).first()
                
                if not profile or not job:
                    raise Exception("Profile or Job missing during pipeline execution")

                # STAGE 1: Selective Retrieval
                run.status = "canonizing"
                db.commit()
                
                # Search for chunks relevant to the job description
                try:
                    chunks = await vector_store.search_profile(
                        profile_id=profile.id, 
                        query=job.raw_text,
                        limit=15
                    )
                except Exception as e:
                    logger.warning(f"Vector search failed, using fallback: {e}")
                    chunks = None
                
                if not chunks:
                    # Fallback to raw text if search fails or no chunks found
                    chunks = [profile.raw_text[:4000]] # Simple truncation
                
                # STAGE 2: Math Pre-Computation
                run.status = "drafting"
                db.commit()
                
                context = " ".join(chunks)
                metrics = math_validator.extract_and_compute(context)
                ground_truth = math_validator.generate_ground_truth(metrics)
                
                # STAGE 3: Drafting
                draft = await ai_drafter.generate_draft(
                    chunks, 
                    job.raw_text,
                    ground_truth,
                    run.weirdness_level,
                    api_provider=api_provider,
                    api_key=api_key,
                    model_id=model_id
                )
                run.draft_output = draft
                
                # STAGE 4: Critique
                run.status = "critiquing"
                db.commit()
                critique = await ai_drafter.generate_critique(
                    draft, 
                    job.raw_text,
                    api_provider=api_provider,
                    api_key=api_key,
                    model_id=model_id
                )
                run.critique_json = critique
                
                run.status = "complete"
                db.commit()
                
            except Exception as e:
                import traceback
                logger.error(f"Pipeline error for run {run_id}: {str(e)}")
                logger.error(traceback.format_exc())
                # Ensure we are still in a valid state to update the run
                try:
                    run = db.query(GenerationRun).filter(GenerationRun.id == run_id).first()
                    if run:
                        run.status = "failed"
                        run.error_message = str(e)
                        db.commit()
                except Exception as db_err:
                    logger.error(f"Failed to save error status to DB: {db_err}")

    if semaphore:
        async with semaphore:
            await execute()
    else:
        await execute()
