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
import json

logger = logging.getLogger(__name__)


def remove_markdown_formatting(text: str) -> str:
    """
    마크다운 형식을 일반 텍스트로 변환
    
    Args:
        text: 마크다운 형식 텍스트
        
    Returns:
        일반 텍스트
    """
    import re
    
    # ** 볼드 제거
    text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', text)
    
    # * 이탤릭 제거 (단, 리스트 형식은 유지)
    text = re.sub(r'(?<!\n)\*([^\*\n]+)\*(?!\n)', r'\1', text)
    
    # __ 볼드 제거
    text = re.sub(r'__([^_]+)__', r'\1', text)
    
    # _ 이탤릭 제거
    text = re.sub(r'(?<!\w)_([^_\n]+)_(?!\w)', r'\1', text)
    
    # ``` 코드 블록 제거 (코드 내용만 유지)
    text = re.sub(r'```[^\n]*\n(.*?)```', r'\1', text, flags=re.DOTALL)
    
    # ` 인라인 코드 제거
    text = re.sub(r'`([^`]+)`', r'\1', text)
    
    return text


def remove_markdown_streaming(text: str) -> str:
    """
    스트리밍용 마크다운 제거 (단순 치환)
    
    스트리밍은 청크가 작게 쪼개져서 정규식 패턴 매칭이 어렵기 때문에
    단순히 마크다운 문자를 제거합니다.
    
    Args:
        text: 마크다운이 포함될 수 있는 텍스트
        
    Returns:
        마크다운 문자가 제거된 텍스트
    """
    # ** 제거
    text = text.replace('**', '')
    
    # __ 제거
    text = text.replace('__', '')
    
    # ` 제거
    text = text.replace('`', '')
    
    return text


def format_user_profile(user_profile: Optional[dict]) -> str:
    """
    사용자 프로필 정보를 포맷팅하여 프롬프트에 삽입할 텍스트로 변환
    
    Args:
        user_profile: 사용자 프로필 정보 (name, age, residence, salary, assets, note 등)
        
    Returns:
        포맷팅된 사용자 프로필 텍스트
    """
    logger.info(f"🔍 format_user_profile 호출됨: {user_profile}")
    
    if not user_profile:
        logger.warning("⚠️ 사용자 프로필이 없습니다!")
        return "사용자 프로필 정보: 없음"
    
    # 개인정보 동의 여부 확인
    agree_privacy = user_profile.get('agreePrivacy', False) or user_profile.get('agree_privacy', False)
    
    logger.info(f"🔍 개인정보 활용 동의 여부: {agree_privacy}")
    
    if not agree_privacy:
        logger.warning("⚠️ 개인정보 활용 동의하지 않음!")
        return "사용자 프로필 정보: 사용자가 개인정보 활용에 동의하지 않았습니다. 일반적인 답변을 제공하세요."
    
    # 프로필 정보 추출
    profile_parts = ["사용자 프로필 정보:"]
    
    name = user_profile.get('name')
    if name:
        profile_parts.append(f"- 이름: {name}님")
    
    age = user_profile.get('age')
    if age:
        profile_parts.append(f"- 나이: {age}세")
        # 나이대에 따른 힌트 추가
        if age < 30:
            profile_parts.append("  (20대 청년에게 적합한 정책을 우선 추천)")
        elif age < 35:
            profile_parts.append("  (30대 초반 청년에게 적합한 정책을 우선 추천)")
        else:
            profile_parts.append("  (30대 중후반 청년에게 적합한 정책을 우선 추천)")
    
    residence = user_profile.get('residence')
    if residence:
        profile_parts.append(f"- 거주지: {residence}")
        profile_parts.append("  (해당 지역의 지방자치단체 정책이 있다면 함께 안내)")
    
    salary = user_profile.get('salary')
    if salary:
        # 숫자로 변환 시도
        try:
            salary_value = float(salary) if isinstance(salary, (int, float, str)) else None
            if salary_value:
                salary_formatted = f"{salary_value:,.0f}원"
                profile_parts.append(f"- 연봉: {salary_formatted}")
                # 소득 구간 힌트
                if salary_value < 30000000:
                    profile_parts.append("  (저소득층 대상 정책 적극 추천)")
                elif salary_value < 50000000:
                    profile_parts.append("  (중저소득층 대상 정책 추천)")
                else:
                    profile_parts.append("  (소득 조건이 완화된 정책 중심으로 안내)")
        except:
            pass
    
    assets = user_profile.get('assets')
    if assets:
        try:
            assets_value = float(assets) if isinstance(assets, (int, float, str)) else None
            if assets_value:
                assets_formatted = f"{assets_value:,.0f}원"
                profile_parts.append(f"- 자산: {assets_formatted}")
                # 자산 구간 힌트
                if assets_value < 50000000:
                    profile_parts.append("  (자산 요건이 낮은 정책 우선 추천)")
                elif assets_value < 300000000:
                    profile_parts.append("  (일반 청년 대상 정책 추천)")
                else:
                    profile_parts.append("  (자산 조건을 고려하여 해당되는 정책 안내)")
        except:
            pass
    
    note = user_profile.get('note')
    if note:
        profile_parts.append(f"- 참고사항: {note}")
    
    # 맞춤형 답변 지침 추가
    profile_parts.append("\n위 사용자 정보를 바탕으로:")
    profile_parts.append("1. 사용자의 나이, 소득, 자산 조건에 맞는 정책을 우선 안내하세요.")
    profile_parts.append("2. 신청 자격 요건을 구체적으로 확인하여 지원 가능 여부를 명확히 알려주세요.")
    profile_parts.append("3. 여러 정책이 있다면 사용자 상황에 가장 적합한 순서로 추천하세요.")
    profile_parts.append("4. 사용자를 '님'으로 호칭하여 친근하게 대화하세요.")
    
    return "\n".join(profile_parts)


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
    sources: Annotated[list, "Sources"]  # 웹 검색 출처 (제목, URL)


# 청년 정책 전문 프롬프트
YOUTH_POLICY_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """당신은 청년 금융 및 주택 정책 전문 상담사입니다.

[중요한 출력 형식 규칙 - 반드시 준수]
1. 일반 텍스트로만 답변하세요. 마크다운 문법을 절대 사용하지 마세요.
   금지: *, **, _, __, `, ```, #, [링크](url) 등
2. 강조가 필요한 경우:
   - 큰따옴표 사용: "중요한 내용"
   - 자연스러운 표현: 특히, 핵심은, 중요합니다 등
3. 구조화가 필요한 경우:
   - 숫자 리스트: 1. 항목, 2. 항목
   - 하이픈: - 항목 (마크다운이 아닌 단순 기호로만)
4. 모든 텍스트를 완전하고 자연스럽게 작성하세요. 단어나 문장을 생략하지 마세요.

당신의 역할:
- 청년들의 금융 및 주택 관련 고민을 친절하고 명확하게 해결해주세요.
- 복잡한 정책을 쉽고 이해하기 쉽게 설명해주세요.
- 구체적인 신청 조건, 절차, 필요 서류를 안내해주세요.

답변 원칙:
1. 제공된 컨텍스트를 기반으로 정확한 정보를 전달합니다.
2. 신청 자격, 대출 한도, 금리 등 핵심 정보를 빠짐없이 안내합니다.
3. 여러 정책이 있다면 비교하여 최적의 선택을 도와줍니다.
4. 불확실한 정보는 추측하지 않고 확인이 필요하다고 안내합니다.
5. 친근하고 공감하는 톤으로 대화합니다.
6. [중요] 사용자 프로필 정보가 제공되면 반드시 활용하세요! 
   - 나이가 있으면 "당신의 나이는 알 수 없지만" 같은 표현을 절대 사용하지 마세요.
   - 대신 "사용자님의 나이(XX세)를 고려하여..." 같은 표현을 사용하세요.
   - 프로필 정보가 있으면 반드시 언급하고, 그 정보를 바탕으로 맞춤형 답변을 제공하세요.

답변 형식:
- 핵심 내용을 먼저 제시하고, 상세 정보를 이어서 설명합니다.
- 조건이 있는 경우 명확하게 구분하여 설명합니다.
- 필요시 단계별로 정리하여 안내합니다.
- 강조는 "중요:", "핵심은", "특히" 같은 자연스러운 표현을 사용합니다.

제공된 컨텍스트:
{context}

{user_profile}

이전 대화 내역:
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
        self._initializing = False
        self._initialized = False
        
        # 초기화는 나중에 (서버 시작 후)
        # self._initialize()  # 주석 처리
    
    def initialize(self):
        """서비스 초기화 (동기)"""
        if self._initializing or self._initialized:
            return
        self._initializing = True
        try:
            self._initialize()
            self._initialized = True
            logger.info("GraphService 초기화 완료")
        except Exception as e:
            logger.error(f"GraphService 초기화 실패: {e}", exc_info=True)
            self._initialized = False
        finally:
            self._initializing = False
    
    def _initialize(self):
        """서비스 초기화 내부 로직"""
        try:
            # Upstage Solar LLM 초기화 (스트리밍 지원)
            if settings.upstage_api_key:
                self.llm = ChatUpstage(
                    model=settings.upstage_model,
                    temperature=settings.temperature,
                    api_key=settings.upstage_api_key,
                    streaming=True  # 스트리밍 활성화
                )
                self.youth_policy_chain = YOUTH_POLICY_PROMPT | self.llm | StrOutputParser()
                logger.info("Upstage Solar LLM 초기화 완료 (스트리밍 지원)")
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
    
    async def _retrieve_document(self, state: GraphState) -> GraphState:
        """1. PDF 문서 검색 노드 (비동기)"""
        question = state["question"]
        logger.info(f"PDF 문서 검색: {question[:50]}...")
        
        # RAG 서비스로 문서 검색 (비동기)
        retriever = rag_service.get_retriever()
        if retriever:
            try:
                retrieved_docs = await retriever.ainvoke(question)
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
    
    async def _relevance_check(self, state: GraphState) -> GraphState:
        """2. 관련성 체크 노드 (LLM 기반, 비동기)"""
        # 컨텍스트가 없으면 관련성 없음
        context = state.get("context", "")
        if not context or context.strip() == "":
            logger.info("관련성 체크: NO (문서 없음)")
            return GraphState(relevance="no")
        
        question = state["question"]
        
        # LLM을 사용한 정교한 관련성 체크 (비동기)
        logger.info("🤖 LLM 관련성 체크 시작...")
        relevance_prompt = f"""당신은 문서의 관련성을 평가하는 전문가입니다.

질문: {question}

검색된 문서 내용:
{context[:1000]}

위 문서가 질문에 답변하는 데 유용한 정보를 포함하고 있습니까?

규칙:
- 문서 내용이 질문과 직접적으로 관련이 있으면 "YES"
- 문서 내용이 질문과 전혀 관련이 없으면 "NO"
- 단순히 키워드가 일치하는 것이 아니라, 실질적으로 답변에 도움이 되는지 판단하세요

답변은 반드시 "YES" 또는 "NO" 중 하나만 출력하세요."""

        try:
            response = await self.llm.ainvoke(relevance_prompt)
            result = response.content.strip().upper()
            
            relevance = "yes" if "YES" in result else "no"
            logger.info(f"✅ 관련성 체크 완료: {relevance.upper()} (LLM 판단: {result[:20]})")
            
        except Exception as e:
            logger.error(f"관련성 체크 실패: {e}, 기본값 'yes' 사용")
            relevance = "yes"
        
        return GraphState(relevance=relevance)
    
    async def _web_search(self, state: GraphState) -> GraphState:
        """3. 웹 검색 노드 (비동기)"""
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

            # Tavily 검색 수행 (동기 함수를 비동기로 실행)
            import asyncio
            loop = asyncio.get_event_loop()
            search_results = await loop.run_in_executor(
                None,
                lambda: self.tavily_client.search(query=enhanced_query, max_results=5)
            )

            # 결과 포맷팅 및 출처 URL 저장
            context = ""
            sources = []
            if search_results and "results" in search_results:
                for result in search_results["results"][:3]:
                    context += f"{result.get('content', '')}\n\n"
                    # 출처 정보 저장
                    sources.append({
                        "title": result.get('title', 'Untitled'),
                        "url": result.get('url', ''),
                        "score": result.get('score', 0)
                    })

            logger.info(f"웹 검색 완료 (출처 {len(sources)}개)")
            return GraphState(context=context, search_source="web", sources=sources)
            
        except Exception as e:
            logger.error(f"웹 검색 실패: {e}")
            return GraphState(
                context=f"웹 검색 중 오류 발생: {str(e)}",
                search_source="web"
            )
    
    async def _llm_answer(self, state: GraphState) -> GraphState:
        """4. 답변 생성 노드 (비동기)"""
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
            
            # 사용자 프로필 포맷팅
            user_profile_formatted = format_user_profile(state.get("user_profile", {}))
            
            # 답변 생성 (비동기)
            response = await self.youth_policy_chain.ainvoke({
                "question": question,
                "context": context,
                "chat_history": chat_history,
                "user_profile": user_profile_formatted
            })
            
            # 마크다운 형식 제거
            response = remove_markdown_formatting(response)
            
            # 정보 출처 안내 추가
            source = state.get("search_source", "unknown")
            source_text = {
                "pdf": "\n\n📄 [출처: 업로드된 정책 문서]",
                "web": "\n\n🌐 [출처: 웹 검색 결과 - 최신 정보일 수 있으니 공식 사이트에서 확인을 권장합니다]"
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
    
    async def stream_ask(
        self,
        question: str,
        thread_id: str,
        user_profile: Optional[dict] = None
    ):
        """
        질문하고 스트리밍으로 답변 받기
        
        LangGraph 워크플로우를 사용하여 스트리밍 
        - 모든 노드를 비동기로 최적화하여 성능 개선
        - llm_answer 노드에서 스트리밍 생성
        
        Args:
            question: 사용자 질문
            thread_id: 대화 세션 ID
            user_profile: 사용자 프로필 (선택)
            
        Yields:
            답변 청크 및 메타데이터
        """
        if not self.app:
            yield {
                "type": "error",
                "content": "AI 서비스가 초기화되지 않았습니다."
            }
            return
        
        try:
            logger.info(f"스트리밍 질문 처리 시작 (LangGraph 사용): {question[:50]}...")
            
            # 입력 준비
            inputs = GraphState(
                question=question,
                user_profile=(user_profile or {})
            )
            
            # 설정
            config = {"configurable": {"thread_id": thread_id}}
            
            # LangGraph 워크플로우 실행
            # 하지만 llm_answer 노드 완료를 기다리지 않고, 관련성 체크 완료 후 즉시 스트리밍 시작
            full_answer = ""
            search_source = "unknown"
            first_content_received = False
            context = ""
            relevance = "yes"
            streaming_started = False
            sources = []  # 웹 검색 출처 저장
            
            # LangGraph 워크플로우를 실행하여 필요한 정보 수집
            async for event in self.app.astream(inputs, config):
                # 각 노드의 이벤트 처리
                for node_name, node_output in event.items():
                    if node_name == "retrieve":
                        yield {"type": "status", "content": "문서 검색 중..."}
                        context = node_output.get("context", "")
                        search_source = node_output.get("search_source", "unknown")
                        
                    elif node_name == "relevance_check":
                        yield {"type": "status", "content": "관련성 검사 중..."}
                        relevance = node_output.get("relevance", "yes")
                        
                        yield {
                            "type": "metadata",
                            "relevance_check_completed": True,
                            "relevance": relevance
                        }
                        
                        # 핵심 최적화: 관련성 체크 완료 후 즉시 스트리밍 시작!
                        # llm_answer 노드 완료를 기다리지 않음
                        if not streaming_started and relevance == "yes":
                            streaming_started = True
                            
                            # 답변 생성 시작
                            yield {"type": "status", "content": "답변 생성 중..."}
                            
                            # 대화 히스토리 포맷팅
                            chat_history = ""
                            
                            # 프롬프트 생성
                            user_profile_formatted = format_user_profile(user_profile)
                            
                            chain_input = {
                                "question": question,
                                "context": context if context else "관련 정보를 찾을 수 없습니다.",
                                "chat_history": chat_history,
                                "user_profile": user_profile_formatted
                            }
                            
                            messages = YOUTH_POLICY_PROMPT.format_messages(**chain_input)
                            
                            yield {
                                "type": "metadata",
                                "answer_generation_started": True,
                                "search_source": search_source,
                                "context_length": len(context)
                            }
                            
                            # LLM 스트리밍 답변 생성 (즉시 시작!)
                            try:
                                async for chunk in self.llm.astream(messages):
                                    if hasattr(chunk, 'content') and chunk.content:
                                        content = chunk.content
                                        full_answer += content
                                        
                                        # 스트리밍 중 마크다운 제거 (단순 치환)
                                        # 청크가 쪼개져도 안전하게 작동하도록 단순 치환만 수행
                                        content = content.replace('**', '')
                                        content = content.replace('__', '')
                                        content = content.replace('`', '')
                                        
                                        if not first_content_received:
                                            first_content_received = True
                                            yield {
                                                "type": "metadata",
                                                "llm_streaming_started": True
                                            }
                                        
                                        yield {
                                            "type": "content",
                                            "content": content
                                        }
                            except Exception as e:
                                logger.error(f"스트리밍 답변 생성 중 오류: {e}")
                                yield {
                                    "type": "error",
                                    "content": f"답변 생성 중 오류가 발생했습니다: {str(e)}"
                                }
                                return
                            
                    elif node_name == "web_search":
                        yield {"type": "status", "content": "웹 검색 중..."}
                        context = node_output.get("context", "")
                        search_source = node_output.get("search_source", "web")
                        sources = node_output.get("sources", [])

                        logger.info(f"🔍 웹 검색 완료: sources 개수 = {len(sources)}")
                        if sources:
                            logger.info(f"📤 Sources 전송: {sources}")

                        # 웹 검색 출처 정보 전송
                        if sources:
                            yield {
                                "type": "sources",
                                "sources": sources
                            }
                            logger.info(f"✅ Sources yield 완료")

                        # 웹 검색 완료 후 스트리밍 시작
                        if not streaming_started:
                            streaming_started = True
                            
                            # 답변 생성 시작
                            yield {"type": "status", "content": "답변 생성 중..."}
                            
                            # 대화 히스토리 포맷팅
                            chat_history = ""
                            
                            # 프롬프트 생성
                            user_profile_formatted = format_user_profile(user_profile)
                            
                            chain_input = {
                                "question": question,
                                "context": context if context else "관련 정보를 찾을 수 없습니다.",
                                "chat_history": chat_history,
                                "user_profile": user_profile_formatted
                            }
                            
                            messages = YOUTH_POLICY_PROMPT.format_messages(**chain_input)
                            
                            yield {
                                "type": "metadata",
                                "answer_generation_started": True,
                                "search_source": search_source,
                                "context_length": len(context)
                            }
                            
                            # LLM 스트리밍 답변 생성
                            try:
                                async for chunk in self.llm.astream(messages):
                                    if hasattr(chunk, 'content') and chunk.content:
                                        content = chunk.content
                                        full_answer += content
                                        
                                        # 스트리밍 중 마크다운 제거 (단순 치환)
                                        # 청크가 쪼개져도 안전하게 작동하도록 단순 치환만 수행
                                        content = content.replace('**', '')
                                        content = content.replace('__', '')
                                        content = content.replace('`', '')
                                        
                                        if not first_content_received:
                                            first_content_received = True
                                            yield {
                                                "type": "metadata",
                                                "llm_streaming_started": True
                                            }
                                        
                                        yield {
                                            "type": "content",
                                            "content": content
                                        }
                            except Exception as e:
                                logger.error(f"스트리밍 답변 생성 중 오류: {e}")
                                yield {
                                    "type": "error",
                                    "content": f"답변 생성 중 오류가 발생했습니다: {str(e)}"
                                }
                                return
                        
                    elif node_name == "llm_answer":
                        # llm_answer 노드는 이미 스트리밍이 시작된 후이므로
                        # 여기서는 완료 확인만 수행
                        pass
            
            # 스트리밍이 시작되지 않은 경우 (fallback)
            if not streaming_started:
                # 일반적인 경우: llm_answer 노드 완료 후 스트리밍 시작
                yield {"type": "status", "content": "답변 생성 중..."}
                
                # 대화 히스토리 포맷팅
                chat_history = ""
                
                # 프롬프트 생성
                user_profile_text = ""
                if user_profile:
                    user_profile_text = f"\n사용자 프로필: {json.dumps(user_profile, ensure_ascii=False)}"
                
                chain_input = {
                    "question": question,
                    "context": context if context else "관련 정보를 찾을 수 없습니다.",
                    "chat_history": chat_history,
                    "user_profile": user_profile_text
                }
                
                messages = YOUTH_POLICY_PROMPT.format_messages(**chain_input)
                
                yield {
                    "type": "metadata",
                    "answer_generation_started": True,
                    "search_source": search_source,
                    "context_length": len(context)
                }
                
                # LLM 스트리밍 답변 생성
                try:
                    async for chunk in self.llm.astream(messages):
                        if hasattr(chunk, 'content') and chunk.content:
                            content = chunk.content
                            full_answer += content
                            
                            # 스트리밍 중 마크다운 제거 (단순 치환)
                            # 청크가 쪼개져도 안전하게 작동하도록 단순 치환만 수행
                            content = content.replace('**', '')
                            content = content.replace('__', '')
                            content = content.replace('`', '')
                            
                            if not first_content_received:
                                first_content_received = True
                                yield {
                                    "type": "metadata",
                                    "llm_streaming_started": True
                                }
                            
                            yield {
                                "type": "content",
                                "content": content
                            }
                except Exception as e:
                    logger.error(f"스트리밍 답변 생성 중 오류: {e}")
                    yield {
                        "type": "error",
                        "content": f"답변 생성 중 오류가 발생했습니다: {str(e)}"
                    }
                    return
            
            # 출처 정보 추가
            source_text = {
                "pdf": "\n\n📄 [출처: 업로드된 정책 문서]",
                "web": "\n\n🌐 [출처: 웹 검색 결과 - 최신 정보일 수 있으니 공식 사이트에서 확인을 권장합니다]"
            }.get(search_source, "")
            
            if source_text:
                yield {
                    "type": "content",
                    "content": source_text
                }
            
            full_answer += source_text
            
            # 메모리에 답변 저장 (대화 히스토리 업데이트)
            try:
                from langchain_core.messages import HumanMessage, AIMessage
                self.memory.put(
                    config,
                    {
                        "values": {
                            "messages": [
                                HumanMessage(content=question),
                                AIMessage(content=full_answer)
                            ]
                        }
                    }
                )
            except:
                pass  # 메모리 저장 실패는 무시
            
            # 완료 신호
            done_event = {
                "type": "done",
                "search_source": search_source,
                "full_response": full_answer
            }

            # 웹 검색 출처가 있으면 포함
            if sources:
                done_event["sources"] = sources

            yield done_event
            
            logger.info("스트리밍 답변 생성 완료 (LangGraph 사용)")
            
        except Exception as e:
            logger.error(f"스트리밍 질문 처리 실패: {e}")
            yield {
                "type": "error",
                "content": f"오류가 발생했습니다: {str(e)}"
            }


# 전역 인스턴스
graph_service = GraphService()

