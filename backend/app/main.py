from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, profiles, jobs, generation
from contextlib import asynccontextmanager
import httpx
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Qdrant collections
    from app.services.qdrant_client import vector_store
    try:
        await vector_store.create_collections()
    except Exception as e:
        logger.error(f"Failed to initialize Qdrant collections: {e}")
    
    import asyncio
    app.state.generation_semaphore = asyncio.Semaphore(5)
    
    # Global pooled httpx AsyncClient singleton
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=20)
    app.state.client = httpx.AsyncClient(limits=limits, timeout=10.0)
    
    yield
    
    # Shutdown
    await app.state.client.aclose()

app = FastAPI(
    title="Brass Tacks API",
    description="Production-ready resume/cover-letter engine backend",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(profiles.router, prefix="/api/v1/profiles", tags=["profiles"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])
app.include_router(generation.router, prefix="/api/v1/generation", tags=["generation"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
