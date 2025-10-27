from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

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


class ChatResponse(BaseModel):
    response: str
    session_id: Optional[str] = None
    sources: Optional[List[dict]] = None


# 헬스 체크
@app.get("/")
async def root():
    return {
        "service": "Youth Compass AI Service",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_api_key_set": bool(os.getenv("OPENAI_API_KEY")),
    }


# 챗봇 엔드포인트
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI 챗봇과 대화하는 엔드포인트

    TODO: LangChain + RAG 로직 구현
    """
    try:
        # 임시 응답 (나중에 LangChain으로 교체)
        response_text = (
            f"메시지를 받았습니다: '{request.message}'. 곧 AI 기능이 추가될 예정입니다!"
        )

        return ChatResponse(
            response=response_text, session_id=request.session_id, sources=[]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 문서 검색 엔드포인트 (RAG용)
@app.get("/search")
async def search_policies(query: str, limit: int = 5):
    """
    청년 정책 문서 검색

    TODO: Vector DB 검색 로직 구현
    """
    return {
        "query": query,
        "results": [],
        "message": "검색 기능이 곧 추가될 예정입니다.",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
