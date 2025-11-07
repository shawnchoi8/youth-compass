# Youth Compass

청년들을 위한 AI 기반 금융 및 주택 정책 상담 챗봇 서비스

## 프로젝트 의의

Youth Compass는 청년들이 복잡한 금융 및 주택 정책 정보를 쉽게 이해하고 접근할 수 있도록 돕는 AI 상담 챗봇입니다.

### 핵심 가치

- **접근성**: 어려운 정책 문서를 대화형 인터페이스로 쉽게 이해
- **개인화**: 사용자 프로필(나이, 소득, 자산 등)을 기반으로 맞춤형 정책 추천
- **정확성**: RAG(Retrieval-Augmented Generation) 기술로 실제 정책 문서 기반 답변 제공
- **최신성**: 웹 검색을 통한 실시간 정책 정보 제공

## 프로젝트 구조

```
youth-compass/
├── frontend/              # React + TypeScript 프론트엔드
│   ├── src/
│   │   ├── components/   # UI 컴포넌트 (Chat, Profile 등)
│   │   ├── pages/        # 페이지 컴포넌트
│   │   ├── hooks/        # React 커스텀 훅
│   │   └── lib/          # 유틸리티 함수
│   ├── Dockerfile
│   └── package.json
│
├── backend/              # Spring Boot 백엔드
│   ├── src/
│   │   └── main/
│   │       ├── java/com/youthcompass/
│   │       │   ├── controller/  # REST API 컨트롤러
│   │       │   ├── service/     # 비즈니스 로직
│   │       │   ├── entity/      # JPA 엔티티
│   │       │   └── repository/  # 데이터베이스 레포지토리
│   │       └── resources/
│   ├── Dockerfile
│   └── build.gradle
│
├── ai-service/           # FastAPI AI 서비스
│   ├── app/
│   │   ├── graph_service.py    # LangGraph 워크플로우
│   │   ├── rag_service.py      # RAG 문서 검색
│   │   ├── langchain_service.py # LangChain 통합
│   │   └── config.py           # 설정
│   ├── data/
│   │   └── documents/          # 정책 문서 (PDF)
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
│
└── docker-compose.yml    # 전체 서비스 오케스트레이션
```

## AI 워크플로우

Youth Compass는 **LangGraph**를 사용한 정교한 AI 워크플로우를 구현합니다.

### 워크플로우 단계

```
사용자 질문
    ↓
1. PDF 문서 검색 (ChromaDB)
    ↓
2. 관련성 체크 (LLM 기반)
    ↓
3-A. 관련성 있음 → 답변 생성
    ↓
3-B. 관련성 없음 → 웹 검색 (Tavily) → 답변 생성
    ↓
스트리밍 응답
```

### 주요 기술 스택

#### AI 서비스
- **LangGraph**: 복잡한 AI 워크플로우 구성
- **LangChain**: LLM 체인 및 프롬프트 관리
- **Upstage Solar LLM**: 한국어 최적화 언어 모델
- **ChromaDB**: 벡터 데이터베이스 (PDF 문서 임베딩 저장)
- **Tavily**: 웹 검색 API
- **LangSmith**: AI 추적 및 모니터링 (선택사항)

#### 백엔드
- **Spring Boot 3.5**: REST API 서버
- **PostgreSQL**: 사용자 및 대화 데이터 저장
- **WebFlux**: AI 스트리밍 응답 처리

#### 프론트엔드
- **React 18**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **Vite**: 빌드 도구
- **Shadcn/ui**: UI 컴포넌트 라이브러리
- **TanStack Query**: 서버 상태 관리
- **Supabase**: 사용자 인증
- **Lovable**: AI 기반 웹 개발 플랫폼을 활용하여 프론트엔드 UI 구축

### AI 워크플로우 상세 설명

#### 1. 문서 검색 단계 (Retrieve)
```python
# ChromaDB에서 사용자 질문과 유사한 문서 검색
retriever = rag_service.get_retriever()
retrieved_docs = await retriever.ainvoke(question)
context = rag_service.format_docs(retrieved_docs)
```

#### 2. 관련성 체크 (Relevance Check)
```python
# LLM을 사용하여 검색된 문서가 질문과 관련있는지 판단
relevance_prompt = "문서가 질문에 답변하는 데 유용한가?"
response = await llm.ainvoke(relevance_prompt)
relevance = "yes" if "YES" in response else "no"
```

#### 3. 조건부 분기
- **관련성 있음**: 검색된 문서를 컨텍스트로 답변 생성
- **관련성 없음**: Tavily 웹 검색으로 최신 정보 수집 후 답변 생성

#### 4. 답변 생성 (LLM Answer)
```python
# 사용자 프로필 + 컨텍스트 + 대화 히스토리를 결합하여 맞춤형 답변 생성
response = await youth_policy_chain.ainvoke({
    "question": question,
    "context": context,
    "chat_history": chat_history,
    "user_profile": user_profile_formatted
})
```

#### 5. 스트리밍 응답
- Server-Sent Events (SSE)를 통한 실시간 답변 전송
- 답변 생성 중 사용자에게 즉시 응답 표시
- 체감 속도 대폭 개선

### 사용자 프로필 기반 맞춤형 추천

AI는 다음 사용자 정보를 활용하여 정책을 추천합니다:
- 이름 (친근한 호칭)
- 나이 (청년 정책 연령 요건 확인)
- 거주지 (지방자치단체 정책 안내)
- 연봉 (소득 조건 확인)
- 자산 (자산 요건 확인)
- 참고사항 (기타 특이사항)

## 시작하기

### 사전 요구사항

- Docker 및 Docker Compose
- Git

### 환경 변수 설정

1. `.env.example` 파일을 복사하여 `.env` 파일 생성:

```bash
cp .env.example .env
```

2. `.env` 파일을 편집하여 필수 API 키 입력:

```bash
# 필수 API 키
UPSTAGE_API_KEY=your_upstage_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here

# 선택사항 (LangSmith 추적)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_api_key_here
LANGCHAIN_PROJECT=youth-compass

# 선택사항 (Supabase 인증)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key_here
```

#### API 키 발급 방법

- **Upstage API Key**: [Upstage Console](https://console.upstage.ai/)에서 발급
- **Tavily API Key**: [Tavily](https://tavily.com/)에서 발급
- **LangSmith API Key** (선택): [LangSmith](https://smith.langchain.com/)에서 발급
- **Supabase** (선택): [Supabase](https://supabase.com/)에서 프로젝트 생성

### Docker로 실행하기

1. 저장소 클론:

```bash
git clone https://github.com/shawnchoi8/youth-compass.git
cd youth-compass
```

2. 환경 변수 설정 (위 섹션 참고)

3. Docker Compose로 전체 서비스 실행:

```bash
docker-compose up --build
```

4. 서비스 접속:

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8080
- **AI 서비스**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **ChromaDB**: http://localhost:8001

### 서비스 종료

```bash
docker-compose down
```

### 데이터 초기화

모든 데이터(데이터베이스, 벡터 저장소)를 삭제하고 초기화:

```bash
docker-compose down -v
```

## 문서 업로드

AI 서비스는 `ai-service/data/documents/` 디렉토리의 PDF 문서를 자동으로 로드합니다.

### 새 문서 추가 방법

1. PDF 파일을 `ai-service/data/documents/` 디렉토리에 추가
2. 문서 재로드 API 호출:

```bash
curl -X POST http://localhost:8000/reload-documents
```

또는 전체 재로딩:

```bash
curl -X POST http://localhost:8000/reload-documents?force=true
```

## 개발 환경 설정

### 로컬 개발 (Docker 없이)

각 서비스를 개별적으로 실행할 수 있습니다:

#### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

#### 백엔드

```bash
cd backend
./gradlew bootRun
```

#### AI 서비스

```bash
cd ai-service
pip install -r requirements.txt
python main.py
```

## 기술 문서

프로젝트 루트에 추가 문서가 있습니다:

- `AI_SERVICE_SETUP.md`: AI 서비스 상세 설정 가이드
- `CHROMADB_MIGRATION.md`: ChromaDB 마이그레이션 가이드
- `DOCKER_SETUP.md`: Docker 설정 상세 가이드

## 모니터링 및 디버깅

### LangSmith 추적

LangSmith를 활성화하면 AI 워크플로우의 각 단계를 시각화하고 추적할 수 있습니다:

1. `.env` 파일에서 LangSmith 설정:
```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_api_key
LANGCHAIN_PROJECT=youth-compass
```

2. [LangSmith 대시보드](https://smith.langchain.com/)에서 실시간 추적 확인

### 헬스 체크

각 서비스의 상태 확인:

```bash
# AI 서비스
curl http://localhost:8000/health

# 백엔드
curl http://localhost:8080/actuator/health
```

## 주요 기능

1. **대화형 챗봇**: 자연스러운 한국어 대화로 정책 상담
2. **맞춤형 추천**: 사용자 프로필 기반 정책 필터링
3. **실시간 스트리밍**: 빠른 응답 속도
4. **정보 출처 표시**: PDF 문서 vs 웹 검색 출처 구분
5. **대화 히스토리**: 이전 대화 맥락을 기억하는 멀티턴 대화
6. **사용자 인증**: Supabase 기반 로그인/회원가입
7. **프로필 관리**: 사용자 정보 저장 및 수정

## Contributors

이 프로젝트는 다음 분들의 기여로 만들어졌습니다:

- **Shawn Choi** ([@shawnchoi8](https://github.com/shawnchoi8))
- **WonJun** ([@WONJUN-KR](https://github.com/WONJUN-KR))
- **minwoojoo** ([@minwoojoo](https://github.com/minwoojoo))
- **meaningGitt** ([@meaningGitt](https://github.com/meaningGitt))
- **PioKwon** ([@PioKwon](https://github.com/PioKwon))

## 라이선스

이 프로젝트는 교육 목적으로 개발되었습니다.

## 문의

문제가 발생하거나 제안사항이 있으시면 [GitHub Issues](https://github.com/shawnchoi8/youth-compass/issues)에 등록해주세요.
