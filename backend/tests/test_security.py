import pytest
from jose import jwt
from datetime import datetime, timedelta
from app.core.config import settings
from app.core.utils import chunk_text, verify_deterministic_fidelity
from app.routers.jobs import is_safe_url

def test_is_safe_url_validation():
    # Public URLs should be safe
    assert is_safe_url("https://google.com") is True
    assert is_safe_url("https://github.com/features") is True

    # Private and loopback IPs should be rejected
    assert is_safe_url("http://127.0.0.1") is False
    assert is_safe_url("http://localhost") is False
    assert is_safe_url("http://192.168.1.1") is False
    assert is_safe_url("http://10.0.0.1") is False
    assert is_safe_url("http://0.0.0.0") is False

    # Invalid schemes should be rejected
    assert is_safe_url("file:///etc/passwd") is False
    assert is_safe_url("gopher://localhost") is False
    assert is_safe_url("ftp://12.34.56.78") is False


def test_chunk_text_correctness():
    # Small text should remain as one chunk
    small_text = "This is a small text."
    chunks = chunk_text(small_text, max_chars=100)
    assert len(chunks) == 1
    assert chunks[0] == small_text

    # Large text should split at appropriate boundaries
    large_text = "Word. " * 50  # 300 chars
    chunks = chunk_text(large_text, max_chars=100, overlap=20)
    assert len(chunks) > 1
    # Check overlap or that chunks are populated
    for chunk in chunks:
        assert len(chunk) <= 100
        assert len(chunk) > 0


def test_sse_jwt_decoding():
    # Generate a valid token
    user_id = "test-user-id-123"
    to_encode = {"sub": user_id, "exp": datetime.utcnow() + timedelta(minutes=5)}
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    # Decode and verify payload
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload.get("sub") == user_id


def test_verify_deterministic_fidelity_gate():
    # Scenario 1: All years and numbers match source context
    source_contexts = [
        "In 2022 I worked at TechCorp and grew the team to 15 people.",
        "Revenue increased by 45% or $10M."
    ]
    
    final_text_good = "During 2022, my team size reached 15, boosting revenue by 45% ($10M)."
    
    # Should not raise exception
    verify_deterministic_fidelity(final_text_good, source_contexts)

    # Scenario 2: Number present in final text but missing in source contexts
    final_text_bad = "During 2023, my team size reached 15, boosting revenue by 45% ($10M)."
    
    with pytest.raises(ValueError) as excinfo:
        verify_deterministic_fidelity(final_text_bad, source_contexts)
    assert "Fidelity gate failed" in str(excinfo.value)
    assert "2023" in str(excinfo.value)
