import os
import sys
import pytest
import unittest.mock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the system path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.models.models import Base, User
from app.main import app
from app.api.deps import get_db, get_current_user

test_db_url = os.getenv("TEST_DATABASE_URL")
if not test_db_url:
    raise RuntimeError(
        "TEST_DATABASE_URL environment variable is missing. "
        "A separate test database is required to run the test suite."
    )
if not test_db_url.endswith("_test"):
    raise RuntimeError(
        "TEST_DATABASE_URL must end in '_test' to prevent accidental "
        "pollution of the development database."
    )

# Initialize test database engine
engine = create_engine(test_db_url)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Ensure all database tables exist before running the test suite
Base.metadata.create_all(bind=engine)

@pytest.fixture(scope="function")
def db():
    """Fixture that handles transaction-per-test database isolation.
    Every test runs in a transaction that is unconditionally rolled back.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def mock_user(db):
    """Fixture to create a mock user inside the active test database transaction."""
    user = User(
        email="test_user@tailorforge.local",
        auth_provider_id="test_auth_provider_123",
        display_name="Test User"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture(scope="function")
def client(db, mock_user):
    """Fixture that overrides FastAPI dependencies and yields a TestClient."""
    def _override_get_db():
        yield db

    def _override_get_current_user():
        return mock_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user
    
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c
        
    app.dependency_overrides.clear()

@pytest.fixture(autouse=True)
def mock_background_tasks():
    """Autouse fixture to mock background task indexing to prevent Qdrant dependency issues."""
    with unittest.mock.patch("app.routers.profiles.background_index_profile") as mock_profile:
        yield mock_profile
