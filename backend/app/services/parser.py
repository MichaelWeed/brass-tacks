import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class ParserService:
    def __init__(self, base_url: str):
        self.base_url = base_url

    async def parse_file(self, file_content: bytes, filename: str) -> str:
        """
        Sends a file to the parser service and returns the extracted markdown.
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                files = {"file": (filename, file_content)}
                response = await client.post(
                    f"{self.base_url}/parse",
                    files=files
                )
                response.raise_for_status()
                data = response.json()
                return data.get("markdown", "")
            except httpx.HTTPStatusError as e:
                logger.error(f"Parser service error: {e.response.text}")
                raise Exception(f"Parser service failed: {e.response.status_code}")
            except Exception as e:
                logger.error(f"Connection to parser service failed: {e}")
                raise Exception("Could not connect to parser service")

parser_service = ParserService(base_url=settings.PARSER_SERVICE_URL)
