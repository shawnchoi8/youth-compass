from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
import logging
import json
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 로깅 설정 (서비스 임포트 전에 먼저!)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 서비스 임포트(로깅 설정 후!)
from app.config import settings
from app.graph_service import graph_service
from app.rag_service import rag_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """서버 생명주기 관리"""
    # 서버 시작 시 백그라운드에서 초기화 시작
    logger.info("서버 시작: 백그라운드 초기화 시작...")
    
    async def initialize_services():
        """서비스 초기화 (백그라운드)"""
        try:
            # 동기 함수를 스레드 풀에서 실행
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, rag_service.initialize)
            logger.info("RAG 서비스 초기화 완료")
            
            await loop.run_in_executor(None, graph_service.initialize)
            logger.info("Graph 서비스 초기화 완료")
            
            logger.info("✅ 모든 서비스 초기화 완료!")
        except Exception as e:
            logger.error(f"서비스 초기화 중 오류: {e}", exc_info=True)
    
    # 백그라운드 태스크 생성 및 시작 (블로킹하지 않음)
    init_task = asyncio.create_task(initialize_services())
    
    yield
    
    # 서버 종료 시 정리 작업
    logger.info("서버 종료")
    # 초기화 태스크 취소 시도
    if not init_task.done():
        init_task.cancel()
        try:
            await init_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Youth Compass AI Service",
    description="AI-powered chatbot service for youth policy information",
    version="1.0.0",
    lifespan=lifespan,
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


# 챗봇 스트리밍 엔드포인트
@app.post("/chat-stream")
async def chat_stream(request: ChatRequest):
    """
    AI 챗봇과 대화하는 스트리밍 엔드포인트
    Server-Sent Events (SSE) 형식으로 실시간 답변 전송
    
    체감 속도가 극적으로 빨라집니다!
    """
    try:
        # 세션 ID 생성 또는 사용
        session_id = request.session_id or str(uuid.uuid4())
        
        logger.info(f"스트리밍 질문 받음 [세션: {session_id[:8]}]: {request.message[:50]}...")
        
        async def generate():
            """SSE 스트림 생성"""
            try:
                # 세션 ID 먼저 전송
                yield f"data: {json.dumps({'type': 'session', 'session_id': session_id}, ensure_ascii=False)}\n\n"
                
                # 스트리밍 답변 생성
                async for chunk in graph_service.stream_ask(
                    question=request.message,
                    thread_id=session_id,
                    user_profile=request.user_profile
                ):
                    # SSE 형식으로 전송
                    yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
                
            except Exception as e:
                logger.error(f"스트리밍 오류: {e}")
                error_data = {
                    "type": "error",
                    "content": f"오류가 발생했습니다: {str(e)}"
                }
                yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # nginx 버퍼링 비활성화
            }
        )
        
    except Exception as e:
        logger.error(f"스트리밍 초기화 오류: {e}")
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
async def reload_documents(force: bool = False):
    """
    PDF 문서를 다시 로드하고 벡터 스토어를 재구축
    
    Args:
        force: True면 전체 재로딩 (기존 데이터 삭제), False면 증분 업데이트
    """
    try:
        logger.info(f"문서 {'전체 재로딩' if force else '증분 업데이트'} 시작")
        
        added_pdf_count, skipped_pdf_count = rag_service.add_documents_incremental(force_reload=force)
        
        # -1은 전체 재로딩을 의미
        if added_pdf_count == -1:
            return {
                "status": "success",
                "mode": "full_reload",
                "has_documents": rag_service.has_documents,
                "message": "전체 문서를 다시 로드했습니다"
            }
        
        return {
            "status": "success",
            "mode": "incremental",
            "added_count": added_pdf_count,
            "skipped_count": skipped_pdf_count,
            "has_documents": rag_service.has_documents,
            "message": f"증분 업데이트 완료: {added_pdf_count}개 추가, {skipped_pdf_count}개 건너뜀"
        }
        
    except Exception as e:
        logger.error(f"문서 로드 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
