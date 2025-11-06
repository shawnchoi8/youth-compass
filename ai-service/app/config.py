from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # API Keys
    openai_api_key: Optional[str] = None
    upstage_api_key: Optional[str] = None
    tavily_api_key: Optional[str] = None
    
    # LangSmith (모니터링 및 디버깅)
    langchain_tracing_v2: Optional[bool] = False
    langchain_api_key: Optional[str] = None
    langchain_project: Optional[str] = "youth-compass"
    
    # Database
    database_url: Optional[str] = None
    
    # Backend
    backend_url: str = "http://backend:8080"
    
    # ChromaDB
    chroma_host: str = "chromadb"
    chroma_port: int = 8000
    
    # Environment
    environment: str = "development"
    
    # Model Settings (Upstage Solar)
    upstage_model: str = "solar-mini"
    upstage_embedding_model: str = "solar-embedding-1-large"
    temperature: float = 0
    max_tokens: int = 1000
    
    # Vector Store Settings
    vector_chunk_size: int = 1000
    vector_chunk_overlap: int = 200
    vector_search_k: int = 4
    
    # Document Path
    documents_path: str = "/app/data/documents"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# 전역 설정 인스턴스
settings = Settings()
