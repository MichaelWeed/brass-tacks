import pytest
import uuid
import unittest.mock
from app.models.models import GenerationRun, MasterProfile, Job

def test_start_generation_success(client, db, mock_user):
    """Test starting a generation run successfully with within token limits."""
    # 1. Create a dummy master profile
    profile = MasterProfile(
        user_id=mock_user.id,
        raw_text="Experienced Systems Architect with 10 years of Kubernetes.",
        is_active=True
    )
    # 2. Create a dummy job
    job = Job(
        user_id=mock_user.id,
        company="TailorForge Corp",
        title="Backend Security Engineer",
        raw_text="Requirements: Docker, Python, FastAPI..."
    )
    db.add_all([profile, job])
    db.commit()

    payload = {
        "profile_id": str(profile.id),
        "job_id": str(job.id),
        "output_type": "resume",
        "weirdness_level": "medium",
        "api_provider": "google",
        "api_key": "test-api-key",
        "model_id": "gemini-2.0-flash"
    }

    with unittest.mock.patch("app.routers.generation.process_generation_pipeline") as mock_pipeline:
        response = client.post("/api/v1/generation/start", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "queued"
        assert "id" in data
        
        # Verify background task was added
        mock_pipeline.assert_called_once()

def test_start_generation_token_overflow(client, db, mock_user):
    """Test that starting a generation with input > 6,000 tokens raises a 400 error."""
    # Create an excessively large profile text (e.g. 7000 words to ensure it exceeds 6000 tokens)
    large_text = "word " * 7000
    
    profile = MasterProfile(
        user_id=mock_user.id,
        raw_text=large_text,
        is_active=True
    )
    job = Job(
        user_id=mock_user.id,
        company="TailorForge Corp",
        title="Backend Security Engineer",
        raw_text="Requirements: Docker, Python, FastAPI..."
    )
    db.add_all([profile, job])
    db.commit()

    payload = {
        "profile_id": str(profile.id),
        "job_id": str(job.id),
        "output_type": "resume",
        "weirdness_level": "medium"
    }

    response = client.post("/api/v1/generation/start", json=payload)
    assert response.status_code == 400
    assert "Input size exceeds operational token boundaries" in response.json()["detail"]

def test_list_provider_models_validation(client):
    """Test that listing provider models requires a valid API key."""
    payload = {
        "provider": "google",
        "api_key": ""
    }
    response = client.post("/api/v1/generation/models", json=payload)
    assert response.status_code == 400 # Custom validation raises 400
    # Let's check with non-empty key but missing provider schema requirements
    payload_missing_fields = {
        "provider": "google"
    }
    response = client.post("/api/v1/generation/models", json=payload_missing_fields)
    assert response.status_code == 422 # Pydantic schema validation raises 422

def test_generation_events_run_not_found(client):
    """Test fetching generation events stream for non-existent run ID."""
    random_uuid = uuid.uuid4()
    # Fetching events stream should return the first SSE event indicating Run not found
    response = client.get(f"/api/v1/generation/events/{random_uuid}")
    # SSE responses are returned with text/event-stream content type
    assert "text/event-stream" in response.headers["content-type"]
    
    # We can read the first line/event of the response
    body_text = response.text
    assert "Run not found" in body_text
