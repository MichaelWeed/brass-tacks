import httpx
import logging
from typing import List, Dict, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class SearchProvider:
    async def search(self, query: str) -> List[Dict[str, str]]:
        raise NotImplementedError

class TavilySearchProvider(SearchProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def search(self, query: str) -> List[Dict[str, str]]:
        if not self.api_key:
            return []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": self.api_key,
                        "query": query,
                        "search_depth": "basic",
                        "max_results": 3
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    results = []
                    for r in data.get("results", []):
                        results.append({
                            "title": r.get("title", ""),
                            "url": r.get("url", ""),
                            "content": r.get("content", "")
                        })
                    return results
                else:
                    logger.warning(f"Tavily search API returned status {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Tavily search failed: {str(e)}")
        return []

async def get_search_provider() -> Optional[SearchProvider]:
    tavily_key = settings.TAVILY_API_KEY
    if tavily_key:
        return TavilySearchProvider(api_key=tavily_key)
    return None
