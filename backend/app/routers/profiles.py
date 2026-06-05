from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.api.deps import get_db, get_current_user
from app.models.models import User, MasterProfile
from app.schemas.profile import ProfileCreate, ProfileResponse
from app.services.indexer import background_index_profile

router = APIRouter()

@router.post("", response_model=ProfileResponse)
async def create_or_update_profile(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    profile_in: ProfileCreate,
    background_tasks: BackgroundTasks
):
    """Upsert the active Master Profile for the current user.
    
    If an active profile already exists, update its raw_text in-place so the
    same ID is returned. This prevents the frontend from drifting to a stale
    profile ID after repeated saves.
    """
    try:
        with db.begin_nested():
            existing = (
                db.query(MasterProfile)
                .filter(
                    MasterProfile.user_id == current_user.id,
                    MasterProfile.is_active == True  # noqa: E712
                )
                .order_by(MasterProfile.created_at.desc())
                .first()
            )

            if existing:
                # Deactivate all other active profiles for this user to enforce strict exclusivity
                db.query(MasterProfile).filter(
                    MasterProfile.user_id == current_user.id,
                    MasterProfile.id != existing.id,
                    MasterProfile.is_active == True  # noqa: E712
                ).update({MasterProfile.is_active: False})

                existing.raw_text = profile_in.raw_text
                existing.is_active = True
                db.add(existing)
                profile_to_index = existing
            else:
                # No active profile exists yet — deactivate all other profiles first
                db.query(MasterProfile).filter(
                    MasterProfile.user_id == current_user.id,
                    MasterProfile.is_active == True  # noqa: E712
                ).update({MasterProfile.is_active: False})

                profile = MasterProfile(
                    user_id=current_user.id,
                    raw_text=profile_in.raw_text,
                    is_active=True
                )
                db.add(profile)
                profile_to_index = profile

        db.commit()
        db.refresh(profile_to_index)
        background_tasks.add_task(background_index_profile, profile_to_index.id)
        return profile_to_index
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed: {str(e)}"
        )

@router.post("/upload", response_model=ProfileResponse)
async def upload_profile_doc(
    *,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks
):
    """Upload a resume/CV document to be parsed into a Master Profile."""
    from app.services.parser import parser_service
    
    # 1. Read file content
    content = await file.read()
    
    # 2. Parse via Docling service
    try:
        markdown = await parser_service.parse_file(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # 3. Create Profile inside a strict transaction enforcing exclusivity
    try:
        with db.begin_nested():
            db.query(MasterProfile).filter(
                MasterProfile.user_id == current_user.id,
                MasterProfile.is_active == True  # noqa: E712
            ).update({MasterProfile.is_active: False})

            profile = MasterProfile(
                user_id=current_user.id,
                raw_text=markdown,
                parsed_markdown=markdown,
                is_active=True
            )
            db.add(profile)
        db.commit()
        db.refresh(profile)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed during upload: {str(e)}"
        )
    
    # 4. Ingest into Qdrant in background
    background_tasks.add_task(background_index_profile, profile.id)
    
    return profile


@router.get("", response_model=List[ProfileResponse])
def get_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all user Master Profiles, sorted by creation date descending as a secondary fail-safe."""
    return (
        db.query(MasterProfile)
        .filter(MasterProfile.user_id == current_user.id)
        .order_by(MasterProfile.created_at.desc())
        .all()
    )

@router.get("/{profile_id}", response_model=ProfileResponse)
def get_profile(
    profile_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific Master Profile."""
    profile = db.query(MasterProfile).filter(
        MasterProfile.id == profile_id, 
        MasterProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
