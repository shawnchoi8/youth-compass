# AI Service 설정 가이드

Youth Compass의 AI 서비스를 Jupyter Notebook의 내용을 기반으로 구현했습니다.

## 🎉 구현 완료

### 주요 변경 사항

1. **requirements.txt** 
   - ✅ langchain-upstage 추가
   - ✅ langgraph 및 langgraph-checkpoint 추가
   - ✅ tavily-python (웹 검색) 추가
   - ✅ faiss-cpu (벡터 스토어) 추가

2. **config.py**
   - ✅ Upstage API 키 설정 추가
   - ✅ Tavily API 키 설정 추가
   - ✅ 벡터 스토어 설정 추가

3. **graph_service.py** (NEW!)
   - ✅ LangGraph 워크플로우 구현
   - ✅ PDF 검색 → 관련성 체크 → 웹 검색 → 답변 생성
   - ✅ 대화 히스토리 관리

4. **rag_service.py**
   - ✅ PDF 문서 자동 로드
   - ✅ ChromaDB 벡터 스토어 구현 (FAISS 대신)
   - ✅ Upstage Embeddings 사용
   - ✅ Docker Compose의 ChromaDB 서비스 연결

5. **main.py**
   - ✅ 새로운 서비스 통합
   - ✅ /chat, /search, /reload-documents 엔드포인트
   - ✅ 상세한 헬스 체크

6. **docker-compose.yml**
   - ✅ UPSTAGE_API_KEY 환경 변수 추가
   - ✅ TAVILY_API_KEY 환경 변수 추가

## 🚀 시작하기

### 1단계: API 키 발급

#### Upstage API Key
1. https://console.upstage.ai/ 접속
2. 회원가입 및 로그인
3. API 키 발급
4. Solar LLM과 Embeddings 사용 가능

#### Tavily API Key
1. https://tavily.com/ 접속
2. 회원가입 및 로그인
3. API 키 발급
4. 웹 검색 기능 사용

### 2단계: 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```bash
# 필수
UPSTAGE_API_KEY=your-upstage-api-key-here
TAVILY_API_KEY=your-tavily-api-key-here

# 기존 설정
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=youth_compass
MYSQL_USER=admin
MYSQL_PASSWORD=adminpassword
ENVIRONMENT=development

# 선택 (OpenAI 사용 시)
OPENAI_API_KEY=your-openai-api-key-here
```

### 3단계: 문서 준비 (선택)

청년 정책 PDF 문서를 `ai-service/data/documents/` 폴더에 추가:

```bash
ai-service/
└── data/
    └── documents/
        ├── 청년_전세자금_대출_안내.pdf
        ├── 청년도약계좌_안내.pdf
        └── README.md
```

**추천 문서 출처:**
- 주택도시기금: https://www.nhuf.molit.go.kr
- 한국주택금융공사: https://www.hf.go.kr
- 서민금융진흥원: https://www.kinfa.or.kr

> **참고**: 문서가 없어도 웹 검색으로 동작합니다!

### 4단계: 서비스 실행

```bash
# 기존 컨테이너 중지
docker-compose down

# 전체 서비스 재빌드 및 실행
docker-compose up -d --build
```

### 5단계: 동작 확인

#### 헬스 체크
```bash
curl http://localhost:8000/health
```

**예상 결과:**
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

#### 챗봇 테스트
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "청년 전세자금 대출 조건을 알려주세요"
  }'
```

#### Swagger UI
브라우저에서 http://localhost:8000/docs 접속

## 📊 워크플로우

```
사용자 질문
    ↓
[ChromaDB PDF 문서 검색]
    ↓
[관련성 체크]
    ↓
관련 있음 ──→ [문서 기반 답변 생성] ──→ 사용자
    ↓ 관련 없음
[웹 검색 (Tavily)]
    ↓
[최신 정보 기반 답변 생성] ──→ 사용자
```

## 🧪 테스트 예제

### 1. 문서 기반 질문 (PDF에서 검색)
```bash
# 업로드된 PDF 문서에 답변이 있는 경우
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "포천 청포도 청년주택에 대해 알려주세요"}'
```

### 2. 웹 검색 질문 (최신 정보)
```bash
# 문서에 없는 최신 정보
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "2025년 청년도약계좌 신청 방법을 알려주세요"}'
```

### 3. 대화 히스토리 (연속 질문)
```bash
# 첫 번째 질문
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "청년 전세자금 대출이 뭐예요?",
    "session_id": "test-session-123"
  }'

# 두 번째 질문 (같은 세션)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "신청 조건은 어떻게 되나요?",
    "session_id": "test-session-123"
  }'
```

## 🔧 트러블슈팅

### 문제 1: API 키 오류

**증상:**
```json
{"detail": "UPSTAGE_API_KEY가 설정되지 않았습니다"}
```

**해결:**
```bash
# .env 파일 확인
cat .env | grep UPSTAGE_API_KEY

# 컨테이너 환경 변수 확인
docker exec youth-compass-ai env | grep UPSTAGE

# 서비스 재시작
docker-compose restart ai-service
```

### 문제 2: 문서가 로드되지 않음

**확인:**
```bash
# 문서 폴더 확인
ls -la ai-service/data/documents/

# 로그 확인
docker logs youth-compass-ai | grep "PDF"

# 문서 재로드
curl -X POST http://localhost:8000/reload-documents
```

### 문제 3: ChromaDB 연결 실패

**증상:**
```
ChromaDB 연결 실패: ... 로컬 모드로 전환합니다.
```

**해결:**
```bash
# ChromaDB 컨테이너 상태 확인
docker ps | grep chromadb

# ChromaDB 로그 확인
docker logs youth-compass-chromadb

# ChromaDB 재시작
docker-compose restart chromadb

# 전체 재시작
docker-compose restart
```

### 문제 4: 메모리 부족

Docker Desktop 설정:
- Settings → Resources → Memory를 **4GB 이상**으로 설정

### 문제 5: 빌드 실패

```bash
# 캐시 없이 재빌드
docker-compose build --no-cache ai-service

# 전체 재시작
docker-compose down
docker-compose up -d --build
```

## 📁 프로젝트 구조

```
youth-compass/
├── ai-service/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py              # ✅ 설정 (API 키 등)
│   │   ├── graph_service.py       # ✅ LangGraph 워크플로우
│   │   ├── rag_service.py         # ✅ RAG 문서 검색
│   │   └── langchain_service.py   # (선택) 간단한 체인
│   ├── data/
│   │   └── documents/             # PDF 문서 폴더
│   │       └── README.md
│   ├── main.py                    # ✅ FastAPI 앱
│   ├── requirements.txt           # ✅ 업데이트됨
│   ├── Dockerfile
│   └── README.md                  # ✅ 상세 가이드
├── docker-compose.yml             # ✅ 환경 변수 추가
└── .env                           # API 키 설정
```

## 🎯 주요 기능

### 1. LangGraph 워크플로우
- **PDF 검색**: ChromaDB 벡터 스토어 (Docker Compose 서비스 연결)
- **관련성 체크**: 자동 판단
- **웹 검색**: Tavily API (fallback)
- **답변 생성**: Upstage Solar LLM

### 2. RAG (Retrieval-Augmented Generation)
- **자동 PDF 로드**: `data/documents/` 폴더 스캔
- **청크 분할**: 1000자 청크, 200자 오버랩
- **벡터 검색**: ChromaDB 유사도 기반 Top-K
- **데이터 영속성**: ChromaDB 볼륨 마운트로 데이터 보존

### 3. 대화 관리
- **세션 기반**: session_id로 대화 추적
- **히스토리**: 최근 3턴 기억
- **컨텍스트**: 이전 대화 참조

## 📚 추가 자료

- **AI Service README**: `ai-service/README.md`
- **Upstage Docs**: https://docs.upstage.ai/
- **LangGraph Docs**: https://langchain-ai.github.io/langgraph/
- **Tavily Docs**: https://docs.tavily.com/

## ✅ 완료 체크리스트

- [ ] .env 파일에 UPSTAGE_API_KEY 설정
- [ ] .env 파일에 TAVILY_API_KEY 설정
- [ ] ai-service/data/documents/ 폴더에 PDF 추가 (선택)
- [ ] docker-compose up -d --build 실행
- [ ] http://localhost:8000/health 확인
- [ ] http://localhost:8000/docs 에서 API 테스트
- [ ] 챗봇 질문 테스트

## 🎊 성공!

모든 것이 정상 동작하면 다음과 같이 테스트할 수 있습니다:

```bash
# 간단한 질문
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "청년 정책 지원 제도를 알려주세요"}'
```

궁금한 점이 있으면 언제든 문의하세요! 🚀

