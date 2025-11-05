# Youth Compass - Docker 실행 가이드

## 📦 전체 시스템을 Docker Compose로 한 번에 실행하기

### 시스템 구성

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend    │────▶│  Backend     │────▶│ AI Service   │
│  (React)     │     │ (Spring Boot)│     │  (FastAPI)   │
│  Port: 3000  │     │  Port: 8080  │     │  Port: 8000  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  PostgreSQL  │     │  ChromaDB    │
                     │  Port: 5432  │     │  Port: 8001  │
                     └──────────────┘     └──────────────┘
```

### 1️⃣ 사전 준비

#### 필수 설치 항목
- Docker Desktop (또는 Docker Engine + Docker Compose)
- 최소 8GB RAM 권장

#### API Key 준비
프로젝트 루트의 `.env` 파일에서 다음 API 키를 설정하세요:

```bash
# AI Service API Keys (필수)
UPSTAGE_API_KEY=your_upstage_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here

# Frontend Supabase Keys (선택사항 - 인증 기능 사용 시)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

### 2️⃣ 전체 시스템 실행

```bash
# 프로젝트 루트 디렉토리에서
docker-compose up --build
```

#### 빌드 옵션
```bash
# 백그라운드 실행
docker-compose up -d --build

# 특정 서비스만 실행
docker-compose up --build frontend backend

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그만 확인
docker-compose logs -f backend
```

### 3️⃣ 서비스 접속

빌드 및 실행이 완료되면 (약 3-5분 소요):

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **AI Service**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **ChromaDB**: http://localhost:8001

### 4️⃣ 서비스 중지

```bash
# 컨테이너 중지
docker-compose down

# 컨테이너 + 볼륨(데이터) 모두 삭제
docker-compose down -v

# 이미지까지 모두 삭제
docker-compose down -v --rmi all
```

### 5️⃣ 데이터베이스 초기화

처음 실행 시 Backend가 자동으로 데이터베이스 테이블을 생성합니다 (Spring Boot JPA DDL auto).

샘플 데이터를 추가하려면:

```bash
# Backend 컨테이너에 접속
docker exec -it youth-compass-backend sh

# 또는 PostgreSQL에 직접 접속
docker exec -it youth-compass-db psql -U admin -d youth_compass
```

### 6️⃣ AI Service 문서 로딩

AI Service는 시작 시 `/app/data/documents` 디렉토리의 PDF 파일을 자동으로 ChromaDB에 로드합니다.

문서를 추가하려면:

1. **로컬 개발 모드**: `ai-service/data/documents/` 폴더에 PDF 추가
2. **Docker 모드**: 볼륨 마운트된 경로에 PDF 추가 후 재시작

```bash
# AI Service 재시작
docker-compose restart ai-service

# 또는 문서 재로드 API 호출
curl -X POST http://localhost:8000/reload-documents
```

---

## 🐛 트러블슈팅

### 포트 충돌
이미 사용 중인 포트가 있다면 `docker-compose.yml`에서 포트를 변경하세요:

```yaml
ports:
  - "3001:80"  # Frontend: 3000 → 3001로 변경
```

### 메모리 부족
Docker Desktop 설정에서 메모리를 8GB 이상으로 증가시키세요.

### Backend 연결 오류
Backend 컨테이너 로그를 확인하세요:

```bash
docker-compose logs backend
```

PostgreSQL 연결 실패 시 DB가 완전히 시작될 때까지 기다린 후 재시작:

```bash
docker-compose restart backend
```

### AI Service ChromaDB 연결 오류
ChromaDB가 먼저 시작되었는지 확인:

```bash
docker-compose ps

# ChromaDB 재시작
docker-compose restart chromadb ai-service
```

### Frontend 빌드 실패
Node 메모리 부족일 수 있습니다. `frontend/Dockerfile`에서 빌드 옵션 수정:

```dockerfile
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## 🔧 개발 모드

Docker를 사용하지 않고 로컬에서 개발하려면:

### Frontend
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

### Backend
```bash
cd backend
./gradlew bootRun  # http://localhost:8080
```

### AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload  # http://localhost:8000
```

이 경우 PostgreSQL과 ChromaDB는 Docker로 실행하는 것을 권장합니다:

```bash
docker-compose up postgres chromadb
```

---

## 📊 Health Check

모든 서비스가 정상적으로 실행 중인지 확인:

```bash
# Frontend
curl http://localhost:3000

# Backend
curl http://localhost:8080/actuator/health

# AI Service
curl http://localhost:8000/health

# ChromaDB
curl http://localhost:8001/api/v1/heartbeat
```

---

## 🚀 프로덕션 배포

프로덕션 환경에서는:

1. `.env` 파일의 비밀번호를 강력한 값으로 변경
2. API 키를 환경 변수로 안전하게 관리
3. Nginx 리버스 프록시 사용 권장
4. HTTPS 인증서 설정
5. 로그 레벨 조정 (INFO → WARN)

---

## 📝 추가 정보

- 전체 시스템 재빌드: `docker-compose build --no-cache`
- 특정 서비스 재빌드: `docker-compose build --no-cache backend`
- 컨테이너 쉘 접속: `docker exec -it youth-compass-backend sh`
- 디스크 정리: `docker system prune -a`
