import logging
import os
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models
from app.core.config import settings
import litellm
import uuid
from typing import List, Optional

logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self):
        self.client = AsyncQdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY or None,
            prefer_grpc=False
        )
        self.embedding_model = settings.EMBEDDING_MODEL

    async def create_collections(self):
        """Initialize collections if they don't exist."""
        try:
            collections_response = await self.client.get_collections()
            existing_names = [col.name for col in collections_response.collections]
        except Exception as e:
            logger.error(f"Failed to fetch collections from Qdrant: {e}")
            existing_names = []
            
        # Master Profile Collection
        if "master_profile_chunks" not in existing_names:
            try:
                await self.client.create_collection(
                    collection_name="master_profile_chunks",
                    vectors_config=models.VectorParams(size=settings.EMBEDDING_DIM, distance=models.Distance.COSINE)
                )
            except Exception as e:
                logger.error(f"Failed to create master_profile_chunks: {e}")
                
        # Job Description Collection
        if "job_descriptions" not in existing_names:
            try:
                await self.client.create_collection(
                    collection_name="job_descriptions",
                    vectors_config=models.VectorParams(size=settings.EMBEDDING_DIM, distance=models.Distance.COSINE)
                )
            except Exception as e:
                logger.error(f"Failed to create job_descriptions: {e}")

    def _get_mock_embedding(self, text: str) -> List[float]:
        """Generates a deterministic size mock embedding from text for local/dev use without API keys."""
        import hashlib
        dim = settings.EMBEDDING_DIM
        h = hashlib.sha256(text.encode('utf-8')).digest()
        vector = []
        for i in range(dim):
            val = ((h[i % 32] + i) * 17) % 256
            vector.append(float(val) / 256.0 - 0.5)
        return vector

    async def upsert_profile_chunks(self, profile_id: uuid.UUID, chunks: List[str], api_key: Optional[str] = None):
        """Embeds and stores profile chunks."""
        if not chunks:
            return

        key = api_key or settings.GEMINI_API_KEY
        if not key:
            key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

        if not key:
            logger.warning("No Gemini API key available. Generating deterministic mock embeddings for local dev.")
            embeddings = [self._get_mock_embedding(chunk) for chunk in chunks]
        else:
            try:
                response = await litellm.aembedding(
                    model=self.embedding_model,
                    input=chunks,
                    api_key=key
                )
                embeddings = [r["embedding"] for r in response["data"]]
            except Exception as e:
                logger.error(f"Embedding failed, falling back to mock embeddings: {e}")
                embeddings = [self._get_mock_embedding(chunk) for chunk in chunks]

        points = [
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=emb,
                payload={
                    "profile_id": str(profile_id),
                    "text": chunk
                }
            )
            for emb, chunk in zip(embeddings, chunks)
        ]

        try:
            await self.client.upsert(
                collection_name="master_profile_chunks",
                points=points
            )
        except Exception as e:
            logger.error(f"Qdrant upsert failed: {e}")
            raise e

    async def delete_profile_chunks(self, profile_id: uuid.UUID):
        """Deletes all chunks belonging to a profile from the vector store to prevent cumulative bloat."""
        try:
            await self.client.delete(
                collection_name="master_profile_chunks",
                points_selector=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="profile_id",
                            match=models.MatchValue(value=str(profile_id))
                        )
                    ]
                )
            )
            logger.info(f"Successfully deleted existing chunks for profile {profile_id} from Qdrant.")
        except Exception as e:
            logger.error(f"Failed to delete profile chunks for {profile_id}: {e}")
            raise e

    async def search_profile(self, profile_id: uuid.UUID, query: str, limit: int = 10, api_key: Optional[str] = None):
        """Searches for relevant chunks in a profile."""
        key = api_key or settings.GEMINI_API_KEY
        if not key:
            key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

        if not key:
            logger.warning("No Gemini API key available. Generating deterministic mock embedding for search query.")
            query_vector = self._get_mock_embedding(query)
        else:
            try:
                response = await litellm.aembedding(
                    model=self.embedding_model,
                    input=[query],
                    api_key=key
                )
                query_vector = response["data"][0]["embedding"]
            except Exception as e:
                logger.error(f"Embedding search query failed, falling back to mock embedding: {e}")
                query_vector = self._get_mock_embedding(query)

        try:
            results = await self.client.query_points(
                collection_name="master_profile_chunks",
                query=query_vector,
                query_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="profile_id",
                            match=models.MatchValue(value=str(profile_id))
                        )
                    ]
                ),
                limit=limit
            )
            return [r.payload["text"] for r in results.points]
        except Exception as e:
            logger.error(f"Qdrant vector search failed: {e}")
            raise e

vector_store = VectorStore()


