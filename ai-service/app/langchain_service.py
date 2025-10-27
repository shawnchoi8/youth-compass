"""
LangChain 기반 AI 챗봇 서비스

TODO: 
- LangChain 체인 구성
- 대화 히스토리 관리
- 프롬프트 템플릿 작성
"""

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings


class LangChainService:
    """LangChain을 이용한 AI 챗봇 서비스"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.model_name,
            temperature=settings.temperature,
            api_key=settings.openai_api_key
        )
        
        # 프롬프트 템플릿
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """당신은 한국 청년 정책 정보를 제공하는 AI 어시스턴트입니다.
            사용자의 질문에 친절하고 정확하게 답변해주세요.
            제공된 문서 정보를 바탕으로 답변하고, 출처를 명시해주세요."""),
            ("user", "{input}")
        ])
        
        self.chain = self.prompt | self.llm
    
    async def get_response(self, message: str) -> str:
        """
        사용자 메시지에 대한 AI 응답 생성
        
        Args:
            message: 사용자 메시지
            
        Returns:
            AI 응답 텍스트
        """
        try:
            response = await self.chain.ainvoke({"input": message})
            return response.content
        except Exception as e:
            raise Exception(f"LangChain 응답 생성 실패: {str(e)}")


# 전역 인스턴스 (싱글톤)
langchain_service = LangChainService()
