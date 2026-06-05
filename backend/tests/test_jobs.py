import pytest
import unittest.mock
import json
from app.models.models import Job

# Mock classes for litellm.acompletion response
class MockMessage:
    def __init__(self, content):
        self.content = content

class MockChoice:
    def __init__(self, content):
        self.message = MockMessage(content)

class MockResponse:
    def __init__(self, content):
        self.choices = [MockChoice(content)]

def test_create_job(client, db, mock_user):
    """Test creating a new job posting entry and verify mapping attributes."""
    payload = {
        "raw_text": "Requirements: Docker, Python, FastAPI...",
        "company_name": "TailorForge Corp",
        "role_title": "Backend Security Engineer"
    }
    
    response = client.post("/api/v1/jobs/", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["raw_text"] == payload["raw_text"]
    assert data["company_name"] == payload["company_name"]
    assert data["role_title"] == payload["role_title"]
    assert "id" in data
    assert data["user_id"] == str(mock_user.id)
    
    # Verify exact database mappings
    db_job = db.query(Job).filter(Job.id == data["id"]).first()
    assert db_job is not None
    assert db_job.company == "TailorForge Corp"
    assert db_job.title == "Backend Security Engineer"
    assert db_job.raw_text == payload["raw_text"]

def test_get_jobs_list(client, db, mock_user):
    """Test retrieving the list of all tracked jobs for a user."""
    job1 = Job(
        user_id=mock_user.id,
        raw_text="Job 1 details",
        company="Company A",
        title="Role A"
    )
    job2 = Job(
        user_id=mock_user.id,
        raw_text="Job 2 details",
        company="Company B",
        title="Role B"
    )
    db.add_all([job1, job2])
    db.commit()
    
    response = client.get("/api/v1/jobs/")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 2
    companies = [j["company_name"] for j in data]
    assert "Company A" in companies
    assert "Company B" in companies

@pytest.mark.asyncio
async def test_extract_job_success(client, mock_user):
    """Test job extraction endpoint using clean mocks for URL resolution,
    HTTP requests, and litellm completion.
    """
    url = "https://kaleris.wd501.myworkdayjobs.com/en-US/Kaleris_Careers/job/AI-Senior-Solutions-Architect"
    payload = {
        "url": url,
        "api_provider": "google",
        "api_key": "test-key-123"
    }

    # Mock response from litellm.acompletion
    llm_json_data = {
        "company": "Kaleris",
        "title": "AI Senior Solutions Architect",
        "company_context": "Kaleris acquired Navis in 2021; Navis is a brand under Kaleris.",
        "reference_urls": ["https://kaleris.com", "https://kaleris.com/careers"]
    }
    mock_llm_response = MockResponse(json.dumps(llm_json_data))

    # Mock response from HTTPX get call (stream bytes)
    mock_html = "<html><title>AI Senior Solutions Architect - Kaleris</title><body>Lead the LLM and AI infrastructure integration.</body></html>"
    
    async def mock_iter_bytes(*args, **kwargs):
        yield mock_html.encode("utf-8")

    mock_http_response = unittest.mock.MagicMock()
    mock_http_response.status_code = 200
    mock_http_response.aiter_bytes = mock_iter_bytes
    mock_http_response.aclose = unittest.mock.AsyncMock()

    # Mocks patches
    with unittest.mock.patch("app.routers.jobs.resolve_and_verify_url") as mock_resolve, \
         unittest.mock.patch("httpx.AsyncClient.send", new_callable=unittest.mock.AsyncMock) as mock_send, \
         unittest.mock.patch("litellm.acompletion", new_callable=unittest.mock.AsyncMock) as mock_acompletion:
        
        # Configure mocks behaviors
        mock_resolve.return_value = ("1.2.3.4", "kaleris.wd501.myworkdayjobs.com", 443, "https://1.2.3.4/en-US/Kaleris_Careers/job/AI-Senior-Solutions-Architect")
        mock_send.return_value = mock_http_response
        mock_acompletion.return_value = mock_llm_response

        response = client.post("/api/v1/jobs/extract", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["company"] == "Kaleris"
        assert data["title"] == "AI Senior Solutions Architect"
        assert "Kaleris acquired Navis" in data["company_context"]
        assert "https://kaleris.com" in data["reference_urls"]
        assert data["source_url"] == url
        
        # Verify mocks interactions
        mock_resolve.assert_called_once_with(url)
        mock_send.assert_called_once()
        mock_acompletion.assert_called_once()
