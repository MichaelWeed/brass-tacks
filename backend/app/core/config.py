from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Brass Tacks"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    ENV: str = "development"
    
    # User-provided API keys (configured in .env file)
    GEMINI_API_KEY: str = ""
    DATABASE_URL: str = ""
    QDRANT_API_KEY: str = ""
    QDRANT_URL: str = ""
    TAVILY_API_KEY: str = ""
    FIDELITY_THRESHOLD: float = 0.85
    EMBEDDING_MODEL: str = "gemini/text-embedding-004"
    EMBEDDING_DIM: int = 768
    # Services
    PARSER_SERVICE_URL: str = "http://localhost:8081"
    
    # Security
    SECRET_KEY: str = "super-secret-dev-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week

    def __init__(self, **values):
        super().__init__(**values)
        if self.ENV == "production" and self.SECRET_KEY == "super-secret-dev-key":
            raise RuntimeError("PRODUCTION SECRET KEY MUST BE EXPLICITLY CONFIGURED!")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
