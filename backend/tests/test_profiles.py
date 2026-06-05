import pytest
import uuid
import unittest.mock
from app.models.models import MasterProfile

def test_create_first_profile(client, db, mock_user):
    """Test creating the very first active master profile for a user."""
    payload = {"raw_text": "Experienced Systems Architect with 10 years of Kubernetes."}
    
    response = client.post("/api/v1/profiles/", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["raw_text"] == payload["raw_text"]
    assert data["is_active"] is True
    assert "id" in data
    assert data["user_id"] == str(mock_user.id)
    
    # Verify database state
    profiles = db.query(MasterProfile).filter(MasterProfile.user_id == mock_user.id).all()
    assert len(profiles) == 1
    assert profiles[0].is_active is True
    assert profiles[0].raw_text == payload["raw_text"]

def test_upsert_profile_updates_in_place(client, db, mock_user):
    """Test that upserting an active profile updates the existing active profile in-place,
    preserving the same ID to prevent frontend drift.
    """
    # 1. Create first profile
    profile1 = MasterProfile(
        user_id=mock_user.id,
        raw_text="Initial profile raw text",
        is_active=True
    )
    db.add(profile1)
    db.commit()
    
    # 2. Post new profile data (which triggers upsert)
    payload = {"raw_text": "Updated profile raw text"}
    response = client.post("/api/v1/profiles/", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Same ID should be preserved
    assert data["id"] == str(profile1.id)
    assert data["raw_text"] == payload["raw_text"]
    assert data["is_active"] is True
    
    # Check DB state
    db.refresh(profile1)
    assert profile1.raw_text == "Updated profile raw text"
    assert profile1.is_active is True

def test_upsert_deactivates_other_profiles(client, db, mock_user):
    """Test that creating a new active profile deactivates all other active profiles
    for that user, enforcing strict database-level exclusivity.
    """
    # Create two profiles, one active, one inactive
    profile1 = MasterProfile(
        user_id=mock_user.id,
        raw_text="Profile 1 raw text",
        is_active=True
    )
    profile2 = MasterProfile(
        user_id=mock_user.id,
        raw_text="Profile 2 raw text",
        is_active=True # Force active to simulate historical state drift
    )
    db.add_all([profile1, profile2])
    db.commit()
    
    # Post new profile
    payload = {"raw_text": "Profile 3 raw text"}
    response = client.post("/api/v1/profiles/", json=payload)
    assert response.status_code == 200
    
    # Re-fetch from DB
    db.refresh(profile1)
    db.refresh(profile2)
    
    # Total profiles remains 2, but exactly one is active and the other is deactivated
    profiles = db.query(MasterProfile).filter(MasterProfile.user_id == mock_user.id).all()
    assert len(profiles) == 2
    active_profiles = [p for p in profiles if p.is_active]
    inactive_profiles = [p for p in profiles if not p.is_active]
    assert len(active_profiles) == 1
    assert len(inactive_profiles) == 1

def test_upload_profile_document(client, db, mock_user):
    """Test uploading a resume document and parsing it via the parser service mock."""
    mock_markdown = "# parsed markdown text from doc"
    
    with unittest.mock.patch("app.services.parser.parser_service.parse_file", new_callable=unittest.mock.AsyncMock) as mock_parse:
        mock_parse.return_callable = mock_markdown
        mock_parse.return_value = mock_markdown
        
        file_content = b"PDF dummy content"
        files = {"file": ("resume.pdf", file_content, "application/pdf")}
        
        response = client.post("/api/v1/profiles/upload", files=files)
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_active"] is True
        assert data["raw_text"] == mock_markdown
        assert data["parsed_markdown"] == mock_markdown
        
        mock_parse.assert_called_once_with(file_content, "resume.pdf")

def test_get_profiles_list(client, db, mock_user):
    """Test listing all user master profiles, sorted by creation date."""
    from datetime import datetime, timezone, timedelta
    
    profile1 = MasterProfile(
        user_id=mock_user.id,
        raw_text="Profile A text",
        is_active=False,
        created_at=datetime.now(timezone.utc) - timedelta(minutes=10)
    )
    profile2 = MasterProfile(
        user_id=mock_user.id,
        raw_text="Profile B text",
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    db.add_all([profile1, profile2])
    db.commit()
    
    response = client.get("/api/v1/profiles/")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 2
    # Creation order desc: profile2 was created last, so should be first in the list
    assert data[0]["raw_text"] == "Profile B text"
    assert data[1]["raw_text"] == "Profile A text"

def test_get_specific_profile(client, db, mock_user):
    """Test fetching a single master profile by ID."""
    profile = MasterProfile(
        user_id=mock_user.id,
        raw_text="Specific profile text",
        is_active=True
    )
    db.add(profile)
    db.commit()
    
    response = client.get(f"/api/v1/profiles/{profile.id}")
    assert response.status_code == 200
    data = response.json()
    
    assert data["id"] == str(profile.id)
    assert data["raw_text"] == "Specific profile text"

def test_get_nonexistent_profile(client):
    """Test fetching a non-existent profile returns 404."""
    random_uuid = uuid.uuid4()
    response = client.get(f"/api/v1/profiles/{random_uuid}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Profile not found"
