import logging
import uuid
from app.core.db import SessionLocal
from app.models.models import MasterProfile
from app.core.utils import chunk_text
from app.services.qdrant_client import vector_store

logger = logging.getLogger(__name__)

async def background_index_profile(profile_id: uuid.UUID):
    """
    Background worker task to fetch a MasterProfile, split it into chunks,
    and ingest them into Qdrant using a fresh database session.
    """
    logger.info(f"Starting background indexing for profile: {profile_id}")
    db = SessionLocal()
    try:
        profile = db.query(MasterProfile).filter(MasterProfile.id == profile_id).first()
        if not profile:
            logger.error(f"Profile {profile_id} not found in database during background indexing.")
            return

        text_to_index = profile.parsed_markdown or profile.raw_text
        if not text_to_index:
            logger.warning(f"Profile {profile_id} has no text to index.")
            return

        # Perform chunking
        chunks = chunk_text(text_to_index)
        logger.info(f"Split profile {profile_id} into {len(chunks)} chunks.")

        # Delete old chunks matching profile_id from Qdrant before upserting new ones to prevent bloat
        await vector_store.delete_profile_chunks(profile.id)

        # Ingest into Qdrant
        await vector_store.upsert_profile_chunks(profile.id, chunks)
        logger.info(f"Successfully indexed profile {profile_id} in Qdrant.")
    except Exception as e:
        logger.error(f"Error during background indexing for profile {profile_id}: {e}", exc_info=True)
    finally:
        db.close()
