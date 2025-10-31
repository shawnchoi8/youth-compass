"""
LangGraph 기반 청년 금융/주택 정책 챗봇 워크플로우
ChromaDB PDF 검색 → 관련성 체크 → 웹 검색 (필요시) → 답변 생성
"""

from typing import Annotated, TypedDict, Optional
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langchain_upstage import ChatUpstage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from tavily import TavilyClient
from app.config import settings
from app.rag_service import rag_service
import logging

logger = logging.getLogger(__name__)


# GraphState 정의
class GraphState(TypedDict):
    """그래프 상태"""
    question: Annotated[str, "Question"]  # 사용자 질문
    context: Annotated[str, "Context"]  # 검색된 컨텍스트
    answer: Annotated[str, "Answer"]  # 생성된 답변
    messages: Annotated[list, add_messages]  # 대화 히스토리
    relevance: Annotated[str, "Relevance"]  # 관련성 체크 결과 (yes/no)
    search_source: Annotated[str, "SearchSource"]  # 정보 출처 (pdf/web)
    user_profile: Annotated[dict, "UserProfile"]  # 사용자 프로필


# 청년 정책 전문 프롬프트
YOUTH_POLICY_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """당신은 청년 금융 및 주택 정책 전문 상담사입니다.

**역할**
- 청년들의 금융 및 주택 관련 고민을 친절하고 명확하게 해결해주세요.
- 복잡한 정책을 쉽고 이해하기 쉽게 설명해주세요.
- 구체적인 신청 조건, 절차, 필요 서류를 안내해주세요.

**답변 원칙**
1. 제공된 컨텍스트를 기반으로 정확한 정보를 전달합니다.
2. 신청 자격, 대출 한도, 금리 등 핵심 정보를 빠짐없이 안내합니다.
3. 여러 정책이 있다면 비교하여 최적의 선택을 도와줍니다.
4. 불확실한 정보는 추측하지 않고 확인이 필요하다고 안내합니다.
5. 친근하고 공감하는 톤으로 대화합니다.

**답변 형식**
- 핵심 내용을 먼저 제시하고, 상세 정보를 이어서 설명합니다.
- 조건이 있는 경우 명확하게 구분하여 설명합니다.
- 필요시 단계별로 정리하여 안내합니다.

**제공된 컨텍스트**
{context}

**사용자 프로필(있으면 반영)**
{user_profile}

**이전 대화 내역**
{chat_history}
""",
    ),
    ("human", "{question}"),
])


class GraphService:
    """LangGraph 기반 챗봇 워크플로우 서비스"""
    
    def __init__(self):
        self.llm = None
        self.youth_policy_chain = None
        self.tavily_client = None
        self.app = None
        self.memory = MemorySaver()
        
        # 초기화
        self._initialize()
    
    def _initialize(self):
        """서비스 초기화"""
        try:
            # Upstage Solar LLM 초기화
            if settings.upstage_api_key:
                self.llm = ChatUpstage(
                    model=settings.upstage_model,
                    temperature=settings.temperature,
                    api_key=settings.upstage_api_key
                )
                self.youth_policy_chain = YOUTH_POLICY_PROMPT | self.llm | StrOutputParser()
                logger.info("Upstage Solar LLM 초기화 완료")
            else:
                logger.warning("UPSTAGE_API_KEY가 설정되지 않았습니다")
            
            # Tavily 웹 검색 클라이언트 초기화
            if settings.tavily_api_key:
                self.tavily_client = TavilyClient(api_key=settings.tavily_api_key)
                logger.info("Tavily 웹 검색 클라이언트 초기화 완료")
            else:
                logger.warning("TAVILY_API_KEY가 설정되지 않았습니다")
            
            # LangGraph 워크플로우 구축
            self._build_graph()
            
        except Exception as e:
            logger.error(f"GraphService 초기화 실패: {e}")
    
    def _build_graph(self):
        """LangGraph 워크플로우 구축"""
        if not self.llm:
            logger.warning("LLM이 초기화되지 않아 그래프를 구축할 수 없습니다")
            return
        
        # 그래프 생성
        workflow = StateGraph(GraphState)
        
        # 노드 추가
        workflow.add_node("retrieve", self._retrieve_document)
        workflow.add_node("relevance_check", self._relevance_check)
        workflow.add_node("web_search", self._web_search)
        workflow.add_node("llm_answer", self._llm_answer)
        
        # 엣지 추가
        workflow.add_edge("retrieve", "relevance_check")
        workflow.add_conditional_edges(
            "relevance_check",
            self._is_relevant,
            {
                "relevant": "llm_answer",
                "not_relevant": "web_search"
            }
        )
        workflow.add_edge("web_search", "llm_answer")
        workflow.add_edge("llm_answer", END)
        
        # 진입점 설정
        workflow.set_entry_point("retrieve")
        
        # 그래프 컴파일
        self.app = workflow.compile(checkpointer=self.memory)
        logger.info("LangGraph 워크플로우 구축 완료")
    
    def _retrieve_document(self, state: GraphState) -> GraphState:
        """1. PDF 문서 검색 노드"""
        question = state["question"]
        logger.info(f"PDF 문서 검색: {question[:50]}...")
        
        # RAG 서비스로 문서 검색
        retriever = rag_service.get_retriever()
        if retriever:
            try:
                retrieved_docs = retriever.invoke(question)
                context = rag_service.format_docs(retrieved_docs)
                
                if context:
                    logger.info(f"{len(retrieved_docs)}개의 관련 문서 발견")
                else:
                    logger.info("관련 문서를 찾지 못함")
                
                return GraphState(context=context, search_source="pdf")
            except Exception as e:
                logger.error(f"문서 검색 실패: {e}")
                return GraphState(context="", search_source="pdf")
        else:
            logger.warning("Retriever가 초기화되지 않음")
            return GraphState(context="", search_source="pdf")
    
    def _relevance_check(self, state: GraphState) -> GraphState:
        """2. 관련성 체크 노드"""
        # 컨텍스트가 없으면 관련성 없음
        context = state.get("context", "")
        if not context or context.strip() == "":
            logger.info("관련성 체크: NO (문서 없음)")
            return GraphState(relevance="no")
        
        # 간단한 관련성 체크 (청년 정책 관련 키워드 확인)
        question = state["question"]
        youth_keywords = ["청년", "주택", "전세", "대출", "금융", "지원", "정책", "임대"]
        
        # 질문이나 컨텍스트에 청년 정책 관련 키워드가 있는지 확인
        is_relevant = any(keyword in question for keyword in youth_keywords) or \
                      any(keyword in context[:500] for keyword in youth_keywords)
        
        relevance = "yes" if is_relevant else "no"
        logger.info(f"관련성 체크: {relevance.upper()}")
        
        return GraphState(relevance=relevance)
    
    def _web_search(self, state: GraphState) -> GraphState:
        """3. 웹 검색 노드"""
        question = state["question"]
        logger.info(f"웹 검색: {question[:50]}...")
        
        if not self.tavily_client:
            logger.warning("Tavily 클라이언트가 초기화되지 않음")
            return GraphState(
                context="웹 검색 기능을 사용할 수 없습니다.",
                search_source="web"
            )
        
        try:
            # 검색 쿼리 최적화 (청년 정책 키워드 추가)
            enhanced_query = f"청년 {question}" if "청년" not in question else question
            
            # Tavily 검색 수행
            search_results = self.tavily_client.search(
                query=enhanced_query,
                max_results=5
            )
            
            # 결과 포맷팅
            context = ""
            if search_results and "results" in search_results:
                for result in search_results["results"][:3]:
                    context += f"{result.get('content', '')}\n\n"
            
            logger.info("웹 검색 완료")
            return GraphState(context=context, search_source="web")
            
        except Exception as e:
            logger.error(f"웹 검색 실패: {e}")
            return GraphState(
                context=f"웹 검색 중 오류 발생: {str(e)}",
                search_source="web"
            )
    
    def _llm_answer(self, state: GraphState) -> GraphState:
        """4. 답변 생성 노드"""
        question = state["question"]
        context = state.get("context", "")
        
        logger.info("답변 생성 중...")
        
        if not self.youth_policy_chain:
            return GraphState(
                answer="AI 서비스가 초기화되지 않았습니다.",
                messages=[("user", question), ("assistant", "서비스 초기화 오류")]
            )
        
        try:
            # 대화 히스토리 포맷팅
            chat_history = ""
            messages = state.get("messages", [])
            if messages:
                for msg in messages[-6:]:  # 최근 3턴
                    if isinstance(msg, tuple) and len(msg) == 2:
                        role, content = msg
                        chat_history += f"{role}: {content}\n"
                    elif hasattr(msg, 'type') and hasattr(msg, 'content'):
                        chat_history += f"{msg.type}: {msg.content}\n"
            
            # 답변 생성
            response = self.youth_policy_chain.invoke({
                "question": question,
                "context": context,
                "chat_history": chat_history,
                "user_profile": state.get("user_profile", {})
            })
            
            # 정보 출처 안내 추가
            source = state.get("search_source", "unknown")
            source_text = {
                "pdf": "\n\n📄 *[출처: 업로드된 정책 문서]*",
                "web": "\n\n🌐 *[출처: 웹 검색 결과 - 최신 정보일 수 있으니 공식 사이트에서 확인을 권장합니다]*"
            }.get(source, "")
            
            final_answer = f"{response}{source_text}"
            
            logger.info("답변 생성 완료")
            
            return GraphState(
                answer=final_answer,
                messages=[("user", question), ("assistant", final_answer)]
            )
            
        except Exception as e:
            logger.error(f"답변 생성 실패: {e}")
            error_msg = f"답변 생성 중 오류가 발생했습니다: {str(e)}"
            return GraphState(
                answer=error_msg,
                messages=[("user", question), ("assistant", error_msg)]
            )
    
    def _is_relevant(self, state: GraphState) -> str:
        """관련성 라우팅 함수"""
        return "relevant" if state.get("relevance") == "yes" else "not_relevant"
    
    async def ask(
        self,
        question: str,
        thread_id: str,
        user_profile: Optional[dict] = None
    ) -> dict:
        """
        질문하고 답변 받기
        
        Args:
            question: 사용자 질문
            thread_id: 대화 세션 ID
            user_profile: 사용자 프로필 (선택)
            
        Returns:
            답변 및 상태 정보
        """
        if not self.app:
            return {
                "answer": "AI 서비스가 초기화되지 않았습니다. UPSTAGE_API_KEY를 확인해주세요.",
                "search_source": "error"
            }
        
        try:
            # 입력 준비
            inputs = GraphState(
                question=question,
                user_profile=(user_profile or {})
            )
            
            # 설정
            config = {"configurable": {"thread_id": thread_id}}
            
            # 실행
            result = await self.app.ainvoke(inputs, config)
            
            return {
                "answer": result.get("answer", "답변을 생성할 수 없습니다."),
                "search_source": result.get("search_source", "unknown"),
                "context": result.get("context", "")
            }
            
        except Exception as e:
            logger.error(f"질문 처리 실패: {e}")
            return {
                "answer": f"오류가 발생했습니다: {str(e)}",
                "search_source": "error"
            }


# 전역 인스턴스
graph_service = GraphService()

