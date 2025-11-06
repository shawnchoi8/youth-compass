# AI Service 아키텍처 분석

> 청년 정책 AI 챗봇 프로젝트의 ai-service 구조 분석 문서
> 분석 일자: 2025-11-05

---

## 목차

1. [개요](#개요)
2. [전체 구조](#전체-구조)
3. [핵심 컴포넌트](#핵심-컴포넌트)
4. [API 엔드포인트](#api-엔드포인트)
5. [AI/ML 아키텍처](#aiml-아키텍처)
6. [데이터 흐름](#데이터-흐름)
7. [기술 스택](#기술-스택)
8. [데이터 현황](#데이터-현황)
9. [개선 권장 사항](#개선-권장-사항)

---

## 개요

ai-service는 청년 정책 AI 챗봇의 핵심 AI 엔진으로, LangGraph 기반의 RAG (Retrieval-Augmented Generation) 시스템입니다. 주택 정책 문서를 벡터화하여 사용자 질문에 정확한 답변을 제공하며, 필요시 웹 검색으로 최신 정보를 보완합니다.

### 주요 특징

- **LangGraph 조건부 워크플로우**: 관련성 기반 자동 라우팅
- **스트리밍 최적화**: 0.5초 이내 첫 응답 (TTFB 최소화)
- **증분 문서 업데이트**: 새 문서만 추가하여 효율성 극대화
- **한국어 최적화**: Upstage Solar LLM 사용
- **견고한 Fallback**: 다중 에러 처리 및 복구 메커니즘

---

## 전체 구조

### 디렉토리 구조

```
ai-service/
├── main.py                          # FastAPI 애플리케이션 진입점
├── app/                             # 핵심 애플리케이션 코드
│   ├── __init__.py                 # 패키지 초기화 (버전 1.0.0)
│   ├── config.py                   # 설정 및 환경 변수 관리
│   ├── rag_service.py              # RAG (검색 증강 생성) 서비스
│   ├── graph_service.py            # LangGraph 워크플로우 서비스
│   └── langchain_service.py        # 기본 LangChain 서비스 (레거시, 미사용)
├── data/                            # 데이터 저장소
│   └── documents/                  # 정책 문서 저장소
│       └── housing/                # 주택 정책 문서 (20개 카테고리)
├── requirements.txt                 # Python 의존성
├── Dockerfile                       # 컨테이너 이미지 정의
├── .env                             # 환경 변수 (API 키 등)
├── .env.example                     # 환경 변수 템플릿
├── .dockerignore                    # Docker 빌드 제외 파일
└── .gitignore                       # Git 제외 파일
```

---

## 핵심 컴포넌트

### 1. main.py - FastAPI 애플리케이션

**역할**: HTTP API 서버의 핵심 엔트리포인트

**주요 기능**:
- FastAPI 애플리케이션 초기화 및 CORS 설정
- 비동기 생명주기 관리 (`lifespan` context manager)
- 백그라운드 서비스 초기화 (RAG, Graph 서비스)
- API 엔드포인트 정의 및 라우팅

**요청/응답 모델**:
```python
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str]
    session_id: Optional[str]
    user_profile: Optional[dict]

class ChatResponse(BaseModel):
    response: str
    session_id: str
    search_source: str  # "pdf" or "web"
```

**설계 특징**:
- 서버 시작 시 블로킹하지 않고 백그라운드에서 서비스 초기화
- 초기화 실패 시에도 서버는 정상 구동 (지연 로딩 fallback 지원)

---

### 2. app/config.py - 설정 관리

**역할**: 애플리케이션 전체 설정 중앙화

**주요 설정**:

```python
# API 키
upstage_api_key: str          # Upstage Solar LLM API 키
tavily_api_key: str           # Tavily 웹 검색 API 키

# 외부 서비스
backend_url: str              # 백엔드 API URL
chroma_host: str              # ChromaDB 호스트
chroma_port: int              # ChromaDB 포트

# AI 모델 설정
upstage_model: str            # "solar-mini"
upstage_embedding_model: str  # "solar-embedding-1-large"
temperature: float            # 0 (결정적 출력)
max_tokens: int               # 1000

# 벡터 검색 설정
vector_chunk_size: int        # 1000
vector_chunk_overlap: int     # 200
vector_search_k: int          # 4
```

---

### 3. app/rag_service.py - RAG 서비스

**역할**: PDF 문서 로드, 벡터화, 검색 기능 제공

**핵심 클래스**: `RAGService`

**주요 메서드**:

| 메서드 | 기능 |
|--------|------|
| `initialize()` | 서비스 초기화 (동기) |
| `load_documents()` | 전체 문서 로드 및 벡터 스토어 생성 |
| `add_documents_incremental()` | 증분 업데이트 (새 문서만 추가) |
| `search()` | 유사 문서 검색 |
| `get_retriever()` | LangChain retriever 객체 반환 |

**처리 파이프라인**:
```
PDF 파일들
  → PyPDFLoader (PDF 파싱)
  → RecursiveCharacterTextSplitter (청킹: 1000자, 중복 200자)
  → Upstage Embeddings (벡터화)
  → ChromaDB (벡터 저장)
  → 유사도 검색 (top-k=4)
```

**설계 특징**:
- 기존 컬렉션 자동 감지 및 재사용
- 증분 업데이트 지원 (중복 문서 건너뛰기)
- Docker ChromaDB 연결 실패 시 로컬 PersistentClient로 fallback
- 백그라운드 로딩 실패 시 첫 요청에서 지연 로딩
- 상세한 로깅 (각 단계별 진행 상황)

---

### 4. app/graph_service.py - LangGraph 워크플로우

**역할**: AI 챗봇의 핵심 로직을 LangGraph로 구현한 워크플로우 엔진

**핵심 클래스**: `GraphService`, `GraphState`

**GraphState 구조**:
```python
class GraphState(TypedDict):
    question: str           # 사용자 질문
    context: str            # 검색된 컨텍스트
    answer: str             # 생성된 답변
    messages: list          # 대화 히스토리
    relevance: str          # 관련성 (yes/no)
    search_source: str      # 출처 (pdf/web)
    user_profile: dict      # 사용자 프로필
```

**LangGraph 워크플로우**:

```
[시작]
  ↓
retrieve (PDF 검색)
  ↓
relevance_check (관련성 판단)
  ↓
  ├─ relevant → llm_answer (답변 생성)
  │                ↓
  │             [완료]
  │
  └─ not_relevant → web_search (웹 검색)
                         ↓
                    llm_answer (답변 생성)
                         ↓
                      [완료]
```

**워크플로우 노드**:

1. **retrieve** - PDF 문서 벡터 검색
   - RAG 서비스 retriever 사용
   - 결과를 context에 저장

2. **relevance_check** - 관련성 평가
   - LLM 기반 판단 (키워드가 아닌 의미론적 평가)
   - "YES" 또는 "NO" 반환

3. **web_search** - 웹 검색 (관련성 낮을 때만)
   - Tavily API 사용
   - 검색 쿼리에 "청년" 키워드 자동 추가
   - 최대 5개 결과 중 상위 3개 사용

4. **llm_answer** - 최종 답변 생성
   - 대화 히스토리, 사용자 프로필 반영
   - 출처 정보 자동 추가 (📄 PDF / 🌐 Web)

**프롬프트 전략**:
```
역할: 청년 금융 및 주택 정책 전문 상담사

답변 원칙:
1. 컨텍스트 기반 정확한 정보 전달
2. 신청 자격, 대출 한도, 금리 등 핵심 정보 안내
3. 여러 정책 비교 및 최적 선택 도움
4. 불확실한 정보는 추측하지 않음
5. 친근하고 공감하는 톤
```

**스트리밍 최적화**:

핵심: **관련성 체크 직후 즉시 LLM 스트리밍 시작**

```python
# 기존 방식 (느림, 2-3초)
retrieve → relevance_check → llm_answer 완료 대기 → 스트리밍

# 최적화 방식 (빠름, 0.5초 이내)
retrieve → relevance_check → [즉시 LLM 스트리밍 시작!]
                              (llm_answer 노드 우회)
```

구현:
- `astream()` 이벤트에서 `relevance_check` 완료 감지
- 즉시 `self.llm.astream()` 호출
- `llm_answer` 노드 건너뛰고 직접 LLM 호출

---

## API 엔드포인트

### 헬스 체크

#### `GET /`
서비스 정보 및 상태 확인

**응답**:
```json
{
  "service": "Youth Compass AI Service",
  "status": "running",
  "version": "1.0.0",
  "features": {
    "rag": true,
    "llm": true,
    "web_search": true
  }
}
```

#### `GET /health`
상세 헬스 체크

**응답**:
```json
{
  "status": "healthy",
  "upstage_api_key_set": true,
  "tavily_api_key_set": true,
  "documents_loaded": true,
  "llm_initialized": true,
  "graph_initialized": true
}
```

---

### 채팅

#### `POST /chat`
일반 채팅 (전체 응답 한 번에 반환)

**요청**:
```json
{
  "message": "서울시 청년월세지원 신청 자격이 어떻게 되나요?",
  "user_id": "user123",
  "session_id": "session-uuid",
  "user_profile": {
    "age": 25,
    "income": 3000000
  }
}
```

**응답**:
```json
{
  "response": "서울시 청년월세지원은...",
  "session_id": "session-uuid",
  "search_source": "pdf"
}
```

#### `POST /chat-stream`
스트리밍 채팅 (Server-Sent Events)

**요청**: `/chat`와 동일

**응답**: SSE 스트림
```
data: {"type": "session", "session_id": "uuid"}
data: {"type": "status", "content": "문서 검색 중..."}
data: {"type": "content", "content": "서울시"}
data: {"type": "content", "content": " 청년월세지원은..."}
data: {"type": "done", "search_source": "pdf"}
```

---

### 문서 관리

#### `GET /search`
PDF 문서 검색 (RAG)

**쿼리 파라미터**:
- `query`: 검색 쿼리 (필수)
- `limit`: 결과 수 (기본 5)

**응답**:
```json
{
  "query": "청년월세지원",
  "results": [
    {
      "content": "문서 내용...",
      "metadata": {
        "source": "/app/data/documents/housing/01-서울시 청년월세지원/공고문.pdf",
        "page": 1
      }
    }
  ],
  "count": 5,
  "has_documents": true
}
```

#### `POST /reload-documents`
PDF 문서 재로드

**쿼리 파라미터**:
- `force`: true면 전체 재로딩, false면 증분 업데이트 (기본 false)

**응답** (증분 모드):
```json
{
  "status": "success",
  "mode": "incremental",
  "added_count": 3,
  "skipped_count": 20,
  "has_documents": true,
  "message": "증분 업데이트 완료: 3개 추가, 20개 건너뜀"
}
```

---

## AI/ML 아키텍처

### 전체 아키텍처

```
[사용자 질문]
      ↓
[FastAPI 엔드포인트]
      ↓
[LangGraph 워크플로우]
      ↓
      ├─ [RAG Service]
      │       ↓
      │  [ChromaDB 벡터 검색]
      │       ↓
      │  [Upstage Embeddings]
      │
      ├─ [Web Search]
      │       ↓
      │  [Tavily API]
      │
      └─ [관련성 체크]
              ↓
         [Upstage Solar LLM]
              ↓
         [답변 생성 & 스트리밍]
              ↓
         [사용자에게 반환]
```

### RAG 파이프라인

**1. 문서 수집**
- 20개 주택 정책 카테고리
- 23개 PDF 파일 (공고문, FAQ 등)

**2. 문서 전처리**
- PyPDFLoader로 PDF 파싱
- RecursiveCharacterTextSplitter로 청킹
  - chunk_size: 1000자
  - chunk_overlap: 200자 (컨텍스트 연속성 유지)

**3. 임베딩 생성**
- Upstage Solar Embedding 모델
- 모델: `solar-embedding-1-large`
- 고품질 한국어 임베딩

**4. 벡터 저장**
- ChromaDB에 저장
- 컬렉션명: `youth_policy_docs`
- 메타데이터: source (파일 경로), page (페이지 번호)

**5. 검색**
- 코사인 유사도 기반 top-k 검색 (k=4)
- 관련 문서 청크 반환

---

## 데이터 흐름

### 전체 요청 흐름

```
1. 사용자 요청
   POST /chat-stream
   {"message": "청년월세지원 신청 방법?"}

2. FastAPI 엔드포인트
   - session_id 생성/확인
   - graph_service.stream_ask() 호출

3. LangGraph 워크플로우 시작
   - GraphState 초기화

4. retrieve 노드
   - ChromaDB 벡터 검색 (k=4)
   - context에 검색 결과 저장

5. relevance_check 노드
   - LLM 관련성 평가
   - "YES" 또는 "NO" 판단

6. 조건부 분기
   - YES → 7번 (PDF 사용)
   - NO → 6-1번 (웹 검색)

6-1. web_search 노드
   - Tavily 웹 검색
   - context 업데이트

7. llm_answer (스트리밍)
   - 프롬프트 포맷팅
   - LLM 스트리밍 시작

8. 토큰 단위 SSE 전송
   {"type": "content", "content": "토큰"}

9. 완료 처리
   - 출처 정보 추가
   - 메모리에 대화 저장
   {"type": "done"}
```

### 벡터 검색 상세 흐름

```
[사용자 질문: "청년월세지원 신청 조건?"]
         ↓
[Upstage Embeddings]
  질문을 벡터로 변환
  예: [0.12, -0.45, 0.78, ...]
         ↓
[ChromaDB 검색]
  코사인 유사도 계산
  상위 4개 청크 반환
         ↓
[검색 결과]
  1. "서울시 청년월세지원 신청 자격: 만 19~39세..." (0.89)
  2. "신청 방법: 온라인 신청, 필요 서류..." (0.85)
  3. "지원 금액: 월 20만원, 최대 12개월..." (0.82)
  4. "신청 기간: 2025년 1월 1일 ~ 1월 31일" (0.78)
         ↓
[포맷팅]
  4개 청크를 \n\n으로 연결
  LLM에게 컨텍스트로 전달
```

### 세션 관리

```
[요청 1 - session_id 없음]
  → UUID 생성: "abc-123-def-456"
  → GraphState 초기화 (messages=[])
  → 답변 생성
  → 메모리 저장: thread_id="abc-123-def-456"
  → 응답에 session_id 포함

[요청 2 - session_id="abc-123-def-456"]
  → 기존 session_id 사용
  → 메모리에서 대화 히스토리 로드
  → GraphState에 기존 messages 포함
  → 답변 생성 (이전 대화 참조)
  → 메모리 업데이트
```

---

## 기술 스택

### 웹 프레임워크
- **FastAPI 0.115.0**: 고성능 비동기 웹 프레임워크
- **Uvicorn 0.30.6**: ASGI 서버

### AI/ML 프레임워크
- **LangChain**: LLM 애플리케이션 프레임워크
- **LangChain-Upstage**: Upstage 통합
- **LangGraph**: 워크플로우 오케스트레이션

### 벡터 스토어 & 임베딩
- **ChromaDB 0.5.11**: 벡터 데이터베이스
- **Sentence Transformers 3.1.1**: 임베딩 모델 (백업)

### 외부 서비스
- **Tavily-Python 0.5.0**: 웹 검색 API
- **Playwright 1.40.0**: 웹 스크래핑 (설치만 됨, 미사용)

### 문서 처리
- **PyPDF 5.0.1**: PDF 파싱
- **python-docx 1.1.2**: Word 문서 지원 (미사용)

### 유틸리티
- **python-dotenv 1.0.1**: 환경 변수 로드
- **Pydantic 2.9.2**: 데이터 검증
- **Pydantic-Settings 2.5.2**: 설정 관리
- **httpx 0.27.2**: HTTP 클라이언트

### 외부 서비스 연동

**Upstage API** (필수):
- LLM: `solar-mini` (한국어 최적화)
- 임베딩: `solar-embedding-1-large`
- API 키: `UPSTAGE_API_KEY`

**Tavily API** (필수):
- 실시간 웹 검색
- API 키: `TAVILY_API_KEY`

**ChromaDB** (필수):
- 연결 방식:
  1. Docker: `chromadb:8000`
  2. 로컬: `./chroma_db` (fallback)

**Backend API** (선택):
- URL: `http://backend:8080`
- 용도: 사용자 프로필 조회 (현재 미사용)

---

## 데이터 현황

### 문서 구조

```
data/documents/housing/
├── 01-서울시 청년월세지원(25년)/
│   ├── 2025년 서울시 청년월세지원 모집 공고문.pdf
│   └── 2025년 서울시 청년월세지원사업 FAQ.pdf
├── 02-청년안심주택/
├── 03-서울시 청년 임차보증금 이자지원/
├── 04-서울시 신혼부부 임차보증금 이자지원/
├── 05-서울 비분양전환형 든든전세(25년 2차)/
├── 06-LH 서울 청년 특화형 매입임대주택/
├── 07-SH 서울 청년 특화형 매입임대주택/
├── 08-행복주택/
├── 09-국민임대주택/
├── 10-장기전세주택/
├── 11-공공임대 및 주거환경임대/
├── 12-기존주택 매입임대주택(일반)/
├── 13-기존주택 전세임대 일반공급/
├── 14-맞춤형 임대주택(여성안심주택)/
├── 15-맞춤형 임대주택(1인 창조기업인)/
├── 16-서울시 사회주택/
├── 17-희망하우징(공공기숙사)(25년 1차)/
├── 18-한지붕세대공감/
├── 19-행복기숙사/
└── 20-청년 부동산 중개보수 및 이사비 지원/
```

**통계**:
- 카테고리: 20개
- PDF 파일: 23개
- 평균 파일 크기: 300-400KB

### 벡터 스토어

- **컬렉션**: `youth_policy_docs`
- **청크 수**: 약 200-300개 (추정)
- **임베딩 차원**: Upstage solar-embedding-1-large

---

## 개선 권장 사항

### 🔴 단기 개선 (1-2주)

1. **미사용 코드 정리**
   - `langchain_service.py` 제거
   - `playwright`, `psycopg2`, `sqlalchemy` 의존성 제거
   - TODO 주석 정리 (`rag_service.py` 상단)

2. **환경 변수 검증 강화**
   - 시작 시 필수 API 키 체크
   - 누락 시 명확한 에러 메시지

3. **에러 메시지 다국어 지원**
   - 한/영 에러 메시지 제공

4. **API 응답 시간 로깅**
   - 각 엔드포인트 응답 시간 측정
   - 로그에 기록

5. **대화 히스토리 길이 설정**
   - 현재 하드코딩된 `messages[-6:]`
   - 설정 파일로 이동

---

### 🟡 중기 개선 (1-2개월)

1. **Redis 기반 메모리 백엔드**
   - 현재: 인메모리 (재시작 시 손실)
   - 개선: Redis로 대화 히스토리 영속화

2. **사용자 프로필 기반 정책 필터링**
   - 나이, 소득 기반 맞춤 정책 추천
   - 프롬프트에 구체적 로직 추가

3. **하이브리드 검색**
   - 벡터 검색 + BM25 키워드 검색
   - 검색 품질 향상

4. **재순위화 (Reranking) 모델**
   - Cross-encoder로 검색 결과 재정렬
   - 더 정확한 컨텍스트 제공

5. **단위 테스트 추가**
   - pytest 기반 테스트 스위트
   - 각 서비스별 테스트 케이스

6. **모니터링 대시보드**
   - Prometheus + Grafana
   - 응답 시간, 토큰 사용량, 에러율 추적

---

### 🟢 장기 개선 (3-6개월)

1. **다중 문서 타입 지원**
   - 금융, 취업, 교육 정책 추가
   - 카테고리별 별도 컬렉션

2. **사용자 피드백 루프**
   - 답변 평가 기능 (👍/👎)
   - 평가 데이터로 프롬프트 개선

3. **A/B 테스트 프레임워크**
   - 다양한 프롬프트 전략 테스트
   - 최적 설정 자동 선택

4. **멀티 모달 지원**
   - PDF 내 이미지, 표 추출
   - 시각적 정보 활용

5. **다국어 지원**
   - 영어, 베트남어 등 다국어
   - 외국인 청년 정책 안내

6. **프로덕션 배포 자동화**
   - CI/CD 파이프라인 구축
   - 무중단 배포

---

## 강점 및 특이사항

### ✅ 주요 강점

1. **LangGraph 프레임워크**
   - 복잡한 워크플로우 관리 용이
   - 조건부 분기, 메모리 관리 내장
   - 디버깅 및 시각화 가능

2. **Upstage Solar 사용**
   - OpenAI 대신 국내 LLM 선택
   - 한국어 성능 우수
   - 비용 효율적

3. **ChromaDB 선택**
   - 경량 벡터 데이터베이스
   - Docker로 쉽게 배포
   - 로컬 개발 편리

4. **관련성 체크 노드**
   - 단순 임계값이 아닌 LLM 기반 판단
   - 더 정교한 라우팅
   - 웹 검색 최소화 (비용 절감)

5. **스트리밍 최적화**
   - TTFB 극적 개선 (2-3초 → 0.5초)
   - 사용자 경험 향상

6. **증분 문서 업데이트**
   - 새 문서만 추가
   - 중복 방지
   - 운영 효율성

---

### ⚠️ 개선 필요 영역

1. **메모리 영속성**
   - 인메모리 저장 (재시작 시 손실)
   - Redis 또는 DB 백엔드 필요

2. **테스트 코드 부재**
   - 단위 테스트, 통합 테스트 없음
   - 품질 보증 어려움

3. **사용자 프로필 미활용**
   - 정의만 되고 실제 로직 없음
   - 맞춤형 추천 부족

4. **모니터링 부족**
   - 응답 시간, 토큰 사용량 추적 없음
   - 성능 병목 파악 어려움

5. **문서 메타데이터 부족**
   - source, page만 저장
   - 카테고리, 날짜 등 추가 필요

6. **대화 히스토리 제한**
   - 최근 3턴만 사용
   - 긴 대화에서 맥락 손실

---

## 결론

ai-service는 **LangGraph 기반의 정교한 RAG 시스템**으로, 청년 정책 챗봇의 핵심 AI 엔진 역할을 담당합니다.

**현재 상태**:
- 프로덕션 준비 거의 완료
- 견고한 에러 처리 및 fallback
- 스트리밍 최적화로 우수한 사용자 경험
- 한국어 최적화 및 정책 문서 특화

**다음 단계**:
- 미사용 코드 정리
- 메모리 영속화 (Redis)
- 테스트 코드 추가
- 모니터링 구축

위의 개선 사항을 단계적으로 적용하면 더욱 강력하고 확장 가능한 시스템이 될 것입니다.

---

**문서 버전**: 1.0
**최종 수정**: 2025-11-05
**작성자**: AI Service Analysis
