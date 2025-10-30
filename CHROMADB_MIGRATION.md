# ChromaDB 마이그레이션 완료 ✅

FAISS 벡터 스토어를 ChromaDB로 성공적으로 마이그레이션했습니다.

## 🎯 변경 사항

### 1. **rag_service.py** - 핵심 변경
- ✅ `FAISS` → `Chroma` 임포트 변경
- ✅ `chromadb` 패키지 추가
- ✅ ChromaDB HttpClient 연결 (docker-compose의 chromadb 서비스)
- ✅ 로컬 PersistentClient fallback 지원
- ✅ 컬렉션 관리 (`youth_policy_docs`)

### 2. **requirements.txt**
- ✅ `faiss-cpu==1.8.0` 제거
- ✅ `chromadb==0.5.11` 유지 (이미 있음)

### 3. **문서 업데이트**
- ✅ `graph_service.py`: 주석 업데이트
- ✅ `main.py`: API 설명 업데이트
- ✅ `AI_SERVICE_SETUP.md`: 전체 가이드 업데이트

## 🚀 ChromaDB 장점

### FAISS 대비 개선점

1. **데이터 영속성** 🔒
   - FAISS: 메모리 기반, 재시작 시 데이터 손실
   - **ChromaDB: 디스크 영속성, 데이터 보존**

2. **분산 환경 지원** 🌐
   - FAISS: 단일 프로세스
   - **ChromaDB: 클라이언트-서버 아키텍처**

3. **운영 편의성** 🛠️
   - FAISS: 수동 저장/로드 필요
   - **ChromaDB: 자동 저장, 컬렉션 관리**

4. **확장성** 📈
   - FAISS: 대용량 데이터에 메모리 제한
   - **ChromaDB: 디스크 기반으로 더 큰 데이터 처리**

## 📊 아키텍처

### 변경 전 (FAISS)
```
ai-service
    ↓
[FAISS 벡터 스토어]
    ↓ (메모리 내)
문서 임베딩 검색
```

### 변경 후 (ChromaDB)
```
ai-service
    ↓ HTTP
[chromadb 컨테이너:8000]
    ↓ (영속 볼륨)
/chroma/chroma (데이터 저장)
    ↓
문서 임베딩 검색
```

## 🔧 ChromaDB 연결 방식

### 1. HttpClient (기본)
Docker Compose의 chromadb 서비스에 연결:
```python
self.chroma_client = chromadb.HttpClient(
    host="chromadb",  # docker-compose의 서비스 이름
    port=8000,
    settings=ChromaSettings(anonymized_telemetry=False)
)
```

### 2. PersistentClient (Fallback)
ChromaDB 서비스 연결 실패 시 로컬 모드:
```python
self.chroma_client = chromadb.PersistentClient(
    path="./chroma_db",
    settings=ChromaSettings(anonymized_telemetry=False)
)
```

## 💾 데이터 영속성

### Docker Volume
`docker-compose.yml`:
```yaml
volumes:
  chroma-data:
    name: youth-compass-chroma-data
```

### 컨테이너 마운트
```yaml
chromadb:
  volumes:
    - chroma-data:/chroma/chroma
```

**결과**: 컨테이너 재시작 후에도 벡터 데이터 유지! 🎉

## 🧪 테스트

### 1. ChromaDB 연결 확인
```bash
# ChromaDB 헬스체크
curl http://localhost:8001/api/v1/heartbeat

# AI 서비스 헬스체크
curl http://localhost:8000/health
```

### 2. 문서 로드 테스트
```bash
# 문서 재로드
curl -X POST http://localhost:8000/reload-documents

# 로그 확인
docker logs youth-compass-ai | grep ChromaDB
```

**예상 로그:**
```
ChromaDB 연결 시도: chromadb:8000
ChromaDB 연결 성공
Upstage 임베딩 모델 초기화 완료
PDF 파일 2개 발견
로드 완료: 2025년포천시청포도청년주택.pdf
문서 청크 63개 생성
ChromaDB 벡터 스토어 생성 완료 (컬렉션: youth_policy_docs)
```

### 3. 검색 테스트
```bash
# 문서 검색
curl "http://localhost:8000/search?query=청년주택&limit=3"

# 챗봇 테스트
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "포천 청포도 청년주택에 대해 알려주세요"}'
```

## 🔄 마이그레이션 절차

### 기존 시스템에서 업그레이드

```bash
# 1. 기존 컨테이너 중지
docker-compose down

# 2. 코드 업데이트 (이미 완료)
git pull  # 또는 파일 직접 수정

# 3. 컨테이너 재빌드
docker-compose up -d --build

# 4. 로그 확인
docker logs -f youth-compass-ai

# 5. 문서 재로드 (PDF가 있는 경우)
curl -X POST http://localhost:8000/reload-documents
```

## 📈 성능 비교

### FAISS
- ✅ 빠른 검색 속도
- ❌ 메모리 기반 (휘발성)
- ❌ 단일 프로세스
- ❌ 수동 영속성 관리

### ChromaDB
- ✅ 빠른 검색 속도
- ✅ 디스크 영속성
- ✅ 클라이언트-서버 분리
- ✅ 자동 영속성 관리
- ✅ 컬렉션 관리 기능
- ✅ 메타데이터 필터링

## 🎯 컬렉션 관리

### 컬렉션 구조
```python
collection_name = "youth_policy_docs"
```

### 컬렉션 작업
- **생성**: `Chroma.from_documents(..., collection_name=...)`
- **삭제**: `chroma_client.delete_collection(collection_name)`
- **재생성**: 문서 재로드 시 자동 삭제 후 생성

## 🛡️ Fallback 메커니즘

ChromaDB 연결 실패 시 자동 fallback:
```
1. HttpClient 시도 (chromadb:8000)
   ↓ 실패
2. PersistentClient 시도 (./chroma_db)
   ↓ 실패
3. vector_store = None
   ↓
웹 검색으로 fallback (문서 없이 동작)
```

## ✅ 체크리스트

- [x] FAISS → ChromaDB 코드 변경
- [x] requirements.txt 업데이트
- [x] docker-compose.yml 확인 (chromadb 서비스)
- [x] 문서 업데이트
- [x] HttpClient 연결 구현
- [x] PersistentClient fallback 구현
- [x] 컬렉션 관리 구현
- [x] 로깅 추가
- [x] 가이드 문서 작성

## 🎊 완료!

ChromaDB 마이그레이션이 완료되었습니다. 이제 다음과 같은 이점을 누릴 수 있습니다:

1. **데이터 영속성**: 재시작 후에도 벡터 데이터 보존
2. **확장성**: 더 큰 문서 컬렉션 처리
3. **운영 편의성**: 자동 저장 및 컬렉션 관리
4. **프로덕션 준비**: 클라이언트-서버 아키텍처

```bash
# 테스트해보세요!
docker-compose up -d --build
curl http://localhost:8000/health
```

🚀 **Happy Coding!**

