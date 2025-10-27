from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # API Keys
    openai_api_key: str
    
    # Database
    database_url: Optional[str] = None
    
    # Backend
    backend_url: str = "http://backend:8080"
    
    # Environment
    environment: str = "development"
    
    # Model Settings
    model_name: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 1000
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# 전역 설정 인스턴스
settings = Settings()
