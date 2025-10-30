from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
import logging
from dotenv import load_dotenv

# 서비스 임포트
from app.config import settings
from app.graph_service import graph_service
from app.rag_service import rag_service

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Youth Compass AI Service",
    description="AI-powered chatbot service for youth policy information",
    version="1.0.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response 모델
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    user_profile: Optional[dict] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    search_source: Optional[str] = None


# 헬스 체크
@app.get("/")
async def root():
    return {
        "service": "Youth Compass AI Service",
        "status": "running",
        "version": "1.0.0",
        "features": {
            "rag": rag_service.has_documents,
            "llm": graph_service.llm is not None,
            "web_search": graph_service.tavily_client is not None
        }
    }


@app.get("/health")
async def health_check():
    """서비스 상태 확인"""
    return {
        "status": "healthy",
        "upstage_api_key_set": bool(settings.upstage_api_key),
        "tavily_api_key_set": bool(settings.tavily_api_key),
        "documents_loaded": rag_service.has_documents,
        "llm_initialized": graph_service.llm is not None,
        "graph_initialized": graph_service.app is not None
    }


# 챗봇 엔드포인트
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI 챗봇과 대화하는 엔드포인트
    LangGraph 워크플로우 사용: PDF 검색 → 관련성 체크 → 웹 검색 (필요시) → 답변 생성
    """
    try:
        # 세션 ID 생성 또는 사용
        session_id = request.session_id or str(uuid.uuid4())
        
        logger.info(f"질문 받음 [세션: {session_id[:8]}]: {request.message[:50]}...")
        
        # LangGraph 워크플로우로 질문 처리
        result = await graph_service.ask(
            question=request.message,
            thread_id=session_id,
            user_profile=request.user_profile
        )

        return ChatResponse(
            response=result["answer"],
            session_id=session_id,
            search_source=result.get("search_source")
        )
        
    except Exception as e:
        logger.error(f"챗봇 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 문서 검색 엔드포인트 (RAG용)
@app.get("/search")
async def search_policies(query: str, limit: int = 5):
    """
    청년 정책 문서 검색
    ChromaDB 벡터 스토어에서 유사 문서 검색
    """
    try:
        logger.info(f"문서 검색: {query}")
        
        results = rag_service.search(query, k=limit)
        
        return {
            "query": query,
            "results": results,
            "count": len(results),
            "has_documents": rag_service.has_documents
        }
        
    except Exception as e:
        logger.error(f"검색 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 문서 재로드 엔드포인트
@app.post("/reload-documents")
async def reload_documents():
    """
    PDF 문서를 다시 로드하고 벡터 스토어를 재구축
    """
    try:
        logger.info("문서 재로드 시작")
        rag_service.load_documents()
        
        return {
            "status": "success",
            "has_documents": rag_service.has_documents,
            "message": "문서가 성공적으로 로드되었습니다" if rag_service.has_documents else "문서를 찾을 수 없습니다"
        }
        
    except Exception as e:
        logger.error(f"문서 로드 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
