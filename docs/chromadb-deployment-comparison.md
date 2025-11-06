# ChromaDB 배포 방식 비교: Embedded vs Docker

> 청년 정책 AI 서비스에서 ChromaDB를 관리하는 두 가지 접근 방식에 대한 상세 비교

## 📋 목차

1. [개요](#개요)
2. [Embedded ChromaDB (현재 방식)](#embedded-chromadb-현재-방식)
3. [Docker ChromaDB (권장 방식)](#docker-chromadb-권장-방식)
4. [상세 비교](#상세-비교)
5. [마이그레이션 가이드](#마이그레이션-가이드)
6. [권장 사항](#권장-사항)

## 개요

ChromaDB는 벡터 데이터베이스로서 두 가지 주요 배포 방식을 지원합니다:

- **Embedded Mode**: Python 프로세스 내에서 직접 실행
- **Server Mode**: 독립적인 서버 프로세스로 실행 (Docker 컨테이너 포함)

## Embedded ChromaDB (현재 방식)

### 🏗️ 아키텍처

```
┌─────────────────────────────────────┐
│          Python Process             │
│  ┌─────────────┐  ┌───────────────┐ │
│  │ AI Service  │  │ ChromaDB      │ │
│  │             │──│ (Embedded)    │ │
│  └─────────────┘  └───────────────┘ │
└─────────────────────────────────────┘
              │
              ▼
    ┌─────────────────┐
    │ Local File      │
    │ System          │
    │ ./data/vectorstore/│
    └─────────────────┘
```

### 💻 코드 구현

```python
# 현재 구현 방식
import chromadb
from chromadb.config import Settings as ChromaSettings

# 로컬 파일 시스템에 저장
chroma_client = chromadb.PersistentClient(
    path="./data/vectorstore",
    settings=ChromaSettings(anonymized_telemetry=False)
)

# 컬렉션 생성 및 사용
collection = chroma_client.create_collection("youth_policy_docs")
```

### ✅ 장점

1. **간단한 설정**
   ```bash
   pip install chromadb
   python -m src.main --init  # 바로 사용 가능
   ```

2. **의존성 최소화**
   - Docker 설치 불필요
   - 추가 서버 관리 불필요
   - 네트워크 설정 불필요

3. **빠른 시작**
   - 복잡한 인프라 구성 없이 즉시 개발 가능
   - 프로토타입이나 PoC에 적합

4. **리소스 효율성**
   ```
   메모리 사용량: ~200MB (AI 서비스 + ChromaDB)
   vs
   메모리 사용량: ~400MB (AI 서비스 + Docker + ChromaDB)
   ```

### ❌ 단점

1. **확장성 제약**
   - 단일 프로세스에서만 접근 가능
   - 동시 접근 시 성능 저하
   - 수평 확장 불가능

2. **장애 전파**
   ```python
   # AI 서비스 크래시 시 ChromaDB도 함께 종료
   if ai_service_crashes:
       chromadb_also_crashes = True
   ```

3. **개발 환경 불일치**
   ```bash
   # 개발자 A (macOS)
   Python 3.11 + ChromaDB 0.4.15

   # 개발자 B (Windows)
   Python 3.10 + ChromaDB 0.4.14
   # → 미묘한 버전 차이로 인한 문제 발생 가능
   ```

4. **백업/복원 복잡성**
   ```bash
   # 파일 시스템 레벨에서 직접 관리 필요
   tar -czf backup.tar.gz ./data/vectorstore/
   ```

## Docker ChromaDB (권장 방식)

### 🏗️ 아키텍처

```
┌─────────────────┐    HTTP    ┌─────────────────────┐
│   AI Service    │ ────────── │  Docker Container   │
│                 │    :8000   │  ┌───────────────┐  │
│ Python Process  │            │  │ ChromaDB      │  │
└─────────────────┘            │  │ Server        │  │
                               │  └───────────────┘  │
                               └─────────────────────┘
                                         │
                                         ▼
                               ┌─────────────────┐
                               │ Docker Volume   │
                               │ Persistent      │
                               │ Storage         │
                               └─────────────────┘
```

### 💻 코드 구현

#### docker-compose.yml
```yaml
version: '3.8'
services:
  chromadb:
    image: chromadb/chroma:latest
    container_name: youth-policy-chromadb
    ports:
      - "8000:8000"
    volumes:
      - chromadb_data:/chroma/chroma
      - ./data/chromadb:/chroma/backup  # 백업용
    environment:
      - CHROMA_SERVER_HOST=0.0.0.0
      - CHROMA_SERVER_HTTP_PORT=8000
      - CHROMA_SERVER_CORS_ALLOW_ORIGINS=["*"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  ai-service:
    build: .
    container_name: youth-policy-ai
    ports:
      - "8080:8000"
    depends_on:
      - chromadb
    environment:
      - CHROMA_HOST=chromadb
      - CHROMA_PORT=8000
      - UPSTAGE_API_KEY=${UPSTAGE_API_KEY}
    volumes:
      - ./data/documents:/app/data/documents:ro

volumes:
  chromadb_data:
    driver: local
```

#### Python 클라이언트 코드
```python
import chromadb
from chromadb.config import Settings as ChromaSettings

# Docker 컨테이너의 ChromaDB 서버에 연결
chroma_client = chromadb.HttpClient(
    host="localhost",  # 또는 "chromadb" (Docker 네트워크 내)
    port=8000,
    settings=ChromaSettings(anonymized_telemetry=False)
)

# 사용법은 동일
collection = chroma_client.create_collection("youth_policy_docs")
```

### ✅ 장점

1. **서비스 독립성**
   ```bash
   # AI 서비스 재시작해도 ChromaDB는 계속 실행
   docker-compose restart ai-service
   # ChromaDB는 영향받지 않음
   ```

2. **확장성**
   ```yaml
   # 로드 밸런싱 가능
   chromadb-1:
     image: chromadb/chroma:latest
     ports: ["8001:8000"]
   chromadb-2:
     image: chromadb/chroma:latest
     ports: ["8002:8000"]
   ```

3. **환경 일관성** ⚠️ 주의: 로컬 Docker는 환경만 일관, 데이터는 공유 안 됨
   ```bash
   # 모든 개발자가 동일한 ChromaDB 버전 사용
   docker-compose up
   # → chromadb/chroma:0.4.15 (정확히 동일한 환경)

   # 하지만! 각자 로컬 볼륨에는 개별 데이터
   # 데이터 공유는 별도 전략 필요 → "팀 협업 시나리오 분석" 참조
   ```

4. **백업/복원 자동화**
   ```bash
   # 스크립트화된 백업
   ./scripts/backup-chromadb.sh
   # Docker 볼륨 기반 백업/복원
   ```

5. **모니터링**
   ```yaml
   # 헬스체크 및 로그 관리
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

6. **프로덕션 준비**
   ```yaml
   # 리소스 제한 및 보안 설정
   deploy:
     resources:
       limits:
         memory: 2G
         cpus: "1.0"
   security_opt:
     - no-new-privileges:true
   ```

### ❌ 단점

1. **초기 설정 복잡도**
   ```bash
   # 추가 설치 및 설정 필요
   apt install docker.io docker-compose
   docker-compose up -d chromadb
   ```

2. **리소스 오버헤드**
   ```
   Docker Engine: ~100MB
   ChromaDB Container: ~200MB
   네트워크 오버헤드: ~10-20MB
   ```

3. **네트워크 지연**
   ```python
   # Embedded: 직접 메모리 접근 (~1ms)
   # Docker: HTTP 통신 (~5-10ms)
   ```

4. **Docker 의존성**
   - Docker 설치 및 관리 필요
   - 컨테이너 오케스트레이션 지식 필요

## 상세 비교

### 📊 성능 비교

| 항목 | Embedded | Docker | 설명 |
|------|----------|--------|------|
| **시작 시간** | 즉시 | 5-10초 | 컨테이너 부팅 시간 |
| **메모리 사용량** | 200MB | 400MB | Docker 오버헤드 포함 |
| **쿼리 응답 시간** | 1-5ms | 5-15ms | 네트워크 통신 오버헤드 |
| **동시 접근** | 제한적 | 우수 | HTTP 서버의 동시성 지원 |
| **대용량 데이터** | 제한적 | 우수 | 메모리 관리 및 캐싱 |

### 🔧 개발 경험 비교

| 측면 | Embedded | Docker |
|------|----------|--------|
| **초기 설정** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **팀 협업** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **디버깅** | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **배포** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **백업/복원** | ⭐⭐ | ⭐⭐⭐⭐ |

### 💰 비용 비교

#### 개발 비용
```
Embedded:
- 설정 시간: 0.5일
- 학습 비용: 낮음
- 유지보수: 중간

Docker:
- 설정 시간: 1-2일
- 학습 비용: 중간
- 유지보수: 낮음
```

#### 운영 비용
```
Embedded:
- 서버 리소스: 낮음
- 운영 복잡도: 높음
- 장애 복구: 어려움

Docker:
- 서버 리소스: 중간
- 운영 복잡도: 낮음
- 장애 복구: 쉬움
```

## 팀 협업 시나리오 분석

### ⚠️ 중요: Docker 볼륨 != 데이터 공유

많은 개발자들이 오해하는 부분: **Docker를 사용한다고 해서 벡터 데이터가 자동으로 공유되는 것은 아닙니다.**

#### 현재 로컬 Docker 볼륨 방식의 한계

```
개발자 A 로컬 환경:
┌─────────────────────────────┐
│ Docker Desktop              │
│  ┌────────────────────────┐ │
│  │ chromadb 컨테이너      │ │
│  └────────────────────────┘ │
│           ↓                 │
│  ┌────────────────────────┐ │
│  │ chromadb_data (볼륨)   │ │  ← A만의 로컬 데이터!
│  │ - 청크: 300개          │ │
│  │ - 임베딩 완료          │ │
│  └────────────────────────┘ │
└─────────────────────────────┘

개발자 B 로컬 환경:
┌─────────────────────────────┐
│ Docker Desktop              │
│  ┌────────────────────────┐ │
│  │ chromadb 컨테이너      │ │
│  └────────────────────────┘ │
│           ↓                 │
│  ┌────────────────────────┐ │
│  │ chromadb_data (볼륨)   │ │  ← B도 처음부터 다시!
│  │ - 청크: 0개 (비어있음) │ │
│  │ - 임베딩 필요 ❌       │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
```

**문제점**:
- 개발자 A가 PDF를 청크하고 임베딩해도 B와 공유되지 않음
- 모든 팀원이 각자 임베딩을 실행해야 함
- API 비용 × 팀원 수 (예: 3명 팀 → 3배 비용)
- 시간 낭비 (임베딩 20분 × 3명 = 60분)

### 💡 해결책 비교

#### 방법 1: 공용 원격 ChromaDB 서버 (⭐ 권장)

```
모든 개발자가 공용 서버에 접속:

개발자 A, B, C 로컬:
┌──────────────────┐
│ AI Service       │
│ (각자 로컬)      │
└──────────────────┘
        │
        │ HTTP 연결
        ↓
┌──────────────────────────────┐
│ 팀 공용 서버                  │
│ (AWS/GCP/사내 서버)           │
│  ┌────────────────────────┐  │
│  │ Docker: chromadb       │  │
│  └────────────────────────┘  │
│           ↓                  │
│  ┌────────────────────────┐  │
│  │ chromadb_data (볼륨)   │  │  ← 모두가 공유!
│  │ - 청크: 300개          │  │
│  │ - 임베딩 완료 (1번만) │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

**장점**:
- ✅ 한 명만 임베딩 실행 → 모두가 즉시 사용
- ✅ API 비용 1번만 발생
- ✅ 데이터 항상 최신 상태 (자동 동기화)
- ✅ 디스크 용량 절약

**단점**:
- ❌ 서버 구축 및 유지보수 필요
- ❌ 네트워크 의존성 (오프라인 개발 불가)
- ❌ 보안 설정 필요 (인증, 방화벽)

---

#### 방법 2: 시드 데이터 + 증분 업데이트 (⭐ 소규모 팀 추천)

**핵심 아이디어**: 초기 벌크 데이터는 공유, 이후 업데이트는 각자 증분 임베딩

```bash
# 프로젝트 구조
youth-compass/
├── data/
│   ├── documents/         # PDF 원본 (Git 공유)
│   └── chromadb_seed/     # 미리 만든 벡터 DB (Git LFS, 500MB)
│       ├── chroma.sqlite3
│       └── index/
└── scripts/
    └── init_chromadb.sh   # 초기화 스크립트
```

#### 하이브리드 워크플로우

**Week 1: 프로젝트 시작 (팀장)**
```bash
# 1. 전체 임베딩 (최초 1회만)
curl -X POST http://localhost:8000/reload-documents?force=true
# → 20분 소요, API $15

# 2. 시드 데이터 생성 및 공유
docker cp youth-policy-chromadb:/chroma/chroma ./data/chromadb_seed
git lfs track "data/chromadb_seed/**"
git add data/chromadb_seed
git commit -m "Add ChromaDB seed: 23 PDFs embedded"
git push
```

**Week 1: 팀원 합류**
```bash
# 1. 저장소 클론 (시드 포함)
git clone youth-compass

# 2. 초기화 스크립트 실행
./scripts/init_chromadb.sh
# 출력:
# ✅ 시드 데이터 발견 (23개 PDF 임베딩 완료)
#    → 20분 + $15 절약!
# ✅ 초기 데이터 로드 완료 (3분)

# 바로 사용 가능!
```

**Week 3: 새 정책 추가 (누구나)**
```bash
# 1. 새 PDF 추가
cp new_policy.pdf data/documents/housing/21-청년창업지원/

# 2. 증분 업데이트 (새 문서만 임베딩)
curl -X POST http://localhost:8000/reload-documents?force=false
# → 1분 소요, API $1

# 로그:
# 📁 기존 문서 23개 건너뜀 (시드 데이터)
# ✅ 새 문서 1개 추가
```

#### 초기화 스크립트

```bash
# scripts/init_chromadb.sh
#!/bin/bash

echo "🔄 ChromaDB 초기화 시작..."

# 1. 시드 데이터 확인
if [ -d "data/chromadb_seed" ]; then
  echo "✅ 시드 데이터 발견 (23개 PDF 임베딩 완료)"
  echo "   → 20분 + \$15 절약!"

  # ChromaDB 컨테이너에 복사
  docker cp data/chromadb_seed/. youth-policy-chromadb:/chroma/chroma
  docker restart youth-policy-chromadb

  echo "✅ 초기 데이터 로드 완료"
  echo ""
  echo "💡 새 PDF 추가 시:"
  echo "   1. data/documents/에 PDF 추가"
  echo "   2. curl -X POST http://localhost:8000/reload-documents?force=false"
  echo "   → 증분 업데이트로 새 문서만 임베딩 (1분)"

else
  # 2. 시드 없으면 전체 임베딩
  echo "⏳ 시드 데이터 없음, 전체 임베딩 시작 (20분 소요)..."
  curl -X POST http://localhost:8000/reload-documents?force=true

  echo ""
  echo "💡 팀원과 공유하려면:"
  echo "   docker cp youth-policy-chromadb:/chroma/chroma ./data/chromadb_seed"
  echo "   git lfs track 'data/chromadb_seed/**'"
  echo "   git add data/chromadb_seed && git commit && git push"
fi
```

**장점**:
- ✅ 초기 세팅 빠름 (20분 → 3분, **85% 시간 절약**)
- ✅ API 비용 절감 (3명 팀: $45 → $15, **$30 절약**)
- ✅ 서버 구축 불필요 (비용 $0)
- ✅ 오프라인 개발 가능
- ✅ **증분 업데이트 가능** (force=false 활용)
- ✅ Git LFS로 버전 관리 가능
- ✅ 롤백 가능 (git checkout)

**단점**:
- ❌ Git 저장소 용량 증가 (500MB, Git LFS 필요)
- ⚠️ 신규 PDF는 각자 증분 임베딩 (공용 서버보다는 비효율)
- ⚠️ 대규모 재구조화 시 시드 재생성 필요 (드물게 발생)

**적합한 경우**:
- ✅ 2-3명 소규모 팀
- ✅ 서버 구축이 부담스러운 경우
- ✅ 데이터 업데이트가 주 1-2회 이하
- ✅ 초기 온보딩 속도가 중요한 경우

---

#### 📦 Fallback: Git LFS를 사용할 수 없는 경우

만약 Git LFS를 사용할 수 없다면 (회사 정책, Git 호스팅 제약 등), **수동 Export/Import 방식**을 사용할 수 있습니다.

**차이점**: Git 대신 Google Drive, Dropbox 등 파일 공유 서비스 사용

```bash
# 개발자 A (팀장)
# 1. 시드 데이터 export
docker exec youth-policy-chromadb tar -czf - /chroma/chroma > chromadb_backup.tar.gz

# 2. Google Drive 또는 Dropbox에 업로드
# 3. 팀원들에게 공유 링크 전송 (Slack, 이메일)

# 개발자 B, C (팀원)
# 1. 링크에서 chromadb_backup.tar.gz 다운로드
# 2. 압축 해제 및 복사
tar -xzf chromadb_backup.tar.gz
docker cp chromadb_backup/. youth-policy-chromadb:/chroma/chroma
docker restart youth-policy-chromadb

# 3. 바로 사용 가능!
```

**Git LFS vs 수동 공유 비교**:

| 측면 | Git LFS | 수동 공유 (Fallback) |
|------|---------|---------------------|
| **다운로드** | 자동 (`git clone`) | 수동 (링크 클릭) |
| **버전 관리** | ✅ Git 히스토리 | ❌ 없음 |
| **초기화** | 자동 (스크립트) | 수동 (명령어) |
| **업데이트** | `git pull` | 재다운로드 |
| **팀원 온보딩** | 3분 | 10분 |
| **자동화** | ✅ 높음 | ⚠️ 낮음 |

**권장사항**:
- 가능하면 Git LFS 사용 (자동화, 버전 관리)
- Git LFS 불가 시에만 수동 공유 사용
- 증분 업데이트는 동일하게 가능 (force=false)

---

### 💰 비용 분석

#### 초기 세팅 비용 비교 (Upstage Embeddings 기준)

| 방식 | 3명 팀 | 5명 팀 | 설명 |
|------|--------|--------|------|
| **❌ 각자 임베딩** | $45 (×3명) | $75 (×5명) | 모두가 20분씩 전체 임베딩 |
| **✅ 시드 + 증분** | $15 (1회) | $15 (1회) | 팀장만 임베딩 → 공유 |
| **🌟 공용 서버** | $15 (1회) | $15 (1회) | 서버에 1회만 임베딩 |

**절감액**:
- 3명 팀: **$30 절감** (67%)
- 5명 팀: **$60 절감** (80%)
- 10명 팀: **$135 절감** (90%)

*예시: PDF 23개 × 평균 10페이지 × 1,000토큰/페이지 = 약 $15*

---

#### 시간 비용 비교

| 방식 | 3명 팀 | 5명 팀 | 설명 |
|------|--------|--------|------|
| **❌ 각자 임베딩** | 60분 (20×3) | 100분 (20×5) | 모두가 대기 |
| **✅ 시드 + 증분** | 26분 (20+3×2) | 30분 (20+2×5) | 3분만 대기 (복사) |
| **🌟 공용 서버** | 20분 (1회) | 20분 (1회) | 대기 없음 |

**절감 시간**:
- 3명 팀: **34분 절감** (57%)
- 5명 팀: **70분 절감** (70%)

---

#### 3개월 운영 비용 비교 (월 4회 업데이트 가정)

| 항목 | 각자 임베딩 | 시드 + 증분 | 공용 서버 |
|------|------------|------------|----------|
| **초기 세팅** | | | |
| 시간 | 60분 | 26분 | 20분 |
| API 비용 | $45 | $15 | $15 |
| **월간 업데이트** (4회) | | | |
| 시간/월 | 12분 (1×4×3명) | 12분 (1×4×3명) | 4분 (1×4×1명) |
| API/월 | $12 (1×4×3명) | $12 (1×4×3명) | $4 (1×4×1명) |
| 서버 비용/월 | $0 | $0 | $10 |
| **3개월 총계** | | | |
| 총 시간 | 96분 | 62분 | 32분 |
| 총 비용 | $81 | $51 | $57 |
| **절감률** | 기준 (최악) | **37% 절감** ✅ | **30% 절감** |

**결론**:
- 서버 비용 고려 시 단기적으로는 **시드 방식이 가장 경제적**
- 장기적(6개월+) 또는 대규모 팀(5명+)에서는 공용 서버가 유리

---

### 🏢 팀 규모별 권장사항

#### 개인 개발자 (1명)
```
권장: Embedded 또는 Local Docker
이유:
- 빠른 프로토타이핑
- 설정 복잡도 최소화
- 리소스 효율성
- 데이터 공유 불필요
```

#### 소규모 팀 (2-3명)
```
1순위: 시드 + 증분 업데이트 ⭐⭐
이유:
- 서버 구축 불필요 (비용 $0)
- 초기 세팅 빠름 (20분 → 3분)
- API 비용 67% 절감 ($45 → $15)
- 오프라인 개발 가능
- Git LFS로 자동화 & 버전 관리

Fallback: 수동 Export/Import
조건: Git LFS 사용 불가 시만 (회사 정책 등)
  → 자동화는 낮지만 여전히 "각자 임베딩"보다 훨씬 나음

2순위: 공용 원격 ChromaDB 서버
이유:
- 서버 구축 가능하다면 장기적으로 더 효율적
- 완전 자동 동기화
- 증분 업데이트 1명만 실행
```

#### 중규모 팀 (4-5명)
```
1순위: 공용 원격 ChromaDB 서버 ⭐⭐
이유:
- 팀 규모 커지면 공용 서버가 더 효율적
- 데이터 동기화 자동화
- 월간 업데이트 비용 차이 증가
- 배포 파이프라인 구축 용이

2순위: 시드 + 증분
조건: 서버 구축이 어려운 경우
```

#### 대규모 팀 (6명+)
```
권장: 공용 ChromaDB 서버 + Kubernetes ⭐⭐⭐
이유:
- 마이크로서비스 아키텍처
- 자동 스케일링
- 고가용성 확보
- 대규모 협업 필수
- 비용 효율성 극대화
```

## 공용 서버 구축 가이드

### 📋 사전 준비

**필요한 것들**:
- 팀 공용 서버 (AWS EC2, GCP Compute Engine, 또는 사내 서버)
- Docker 및 Docker Compose 설치
- 고정 IP 또는 도메인
- 방화벽 포트 개방 (8000번)

### 🚀 단계별 구축

#### 1단계: 서버 환경 설정

```bash
# Ubuntu/Debian 기준
# 1. Docker 설치
sudo apt update
sudo apt install -y docker.io docker-compose

# 2. Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 3. 프로젝트 디렉토리 생성
mkdir -p ~/youth-compass-chromadb
cd ~/youth-compass-chromadb
```

#### 2단계: Docker Compose 설정

```yaml
# docker-compose.yml
version: '3.8'

services:
  chromadb:
    image: chromadb/chroma:latest
    container_name: team-chromadb
    ports:
      - "8000:8000"
    volumes:
      - chromadb_data:/chroma/chroma
      - ./backups:/chroma/backups  # 백업 디렉토리
    environment:
      - CHROMA_SERVER_HOST=0.0.0.0
      - CHROMA_SERVER_HTTP_PORT=8000
      - CHROMA_SERVER_CORS_ALLOW_ORIGINS=["*"]
      # 인증 설정 (선택)
      # - CHROMA_SERVER_AUTH_CREDENTIALS_FILE=/chroma/auth/credentials.txt
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    # 리소스 제한 (선택)
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "1.0"

volumes:
  chromadb_data:
    driver: local
```

#### 3단계: 서버 시작 및 확인

```bash
# 1. 컨테이너 시작
docker-compose up -d

# 2. 로그 확인
docker-compose logs -f chromadb

# 3. 헬스체크
curl http://localhost:8000/api/v1/heartbeat
# 응답: {"nanosecond heartbeat": ...}

# 4. 컬렉션 목록 확인
curl http://localhost:8000/api/v1/collections
```

#### 4단계: 방화벽 설정

```bash
# Ubuntu UFW 사용 시
sudo ufw allow 8000/tcp
sudo ufw reload

# AWS EC2 보안 그룹 설정
# Inbound Rules:
# - Type: Custom TCP
# - Port: 8000
# - Source: 팀 사무실 IP 또는 VPN IP 대역
```

#### 5단계: 개발자 환경 설정

각 팀원은 `.env` 파일을 수정:

```bash
# ai-service/.env
CHROMA_HOST=공용서버IP  # 예: 192.168.1.100 또는 chromadb.team.com
CHROMA_PORT=8000
```

또는 로컬 hosts 파일 수정:

```bash
# /etc/hosts (macOS/Linux) 또는 C:\Windows\System32\drivers\etc\hosts (Windows)
192.168.1.100  team-chromadb
```

그 다음 `.env`:
```bash
CHROMA_HOST=team-chromadb
CHROMA_PORT=8000
```

#### 6단계: 초기 데이터 로드

**대표 1명이 실행**:

```bash
# 1. 로컬에서 AI Service 실행 (공용 서버 접속)
cd ai-service
python -m uvicorn main:app --reload

# 2. 문서 임베딩
curl -X POST http://localhost:8080/reload-documents?force=true

# 3. 확인
curl http://localhost:8080/health
```

**다른 팀원들**:

```bash
# 1. 서버 접속 확인
curl http://team-chromadb:8000/api/v1/heartbeat

# 2. AI Service 실행
python -m uvicorn main:app --reload

# 3. 바로 사용 가능! (임베딩 불필요)
curl -X POST http://localhost:8080/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "청년월세지원 알려줘"}'
```

---

### 🔒 보안 설정 (권장)

#### 방법 1: SSH 터널링

```bash
# 각 개발자 로컬에서
ssh -L 8000:localhost:8000 user@공용서버IP

# 그 다음 .env에서
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

#### 방법 2: Nginx 리버스 프록시 + Basic Auth

```nginx
# /etc/nginx/sites-available/chromadb
server {
    listen 80;
    server_name chromadb.team.com;

    location / {
        auth_basic "ChromaDB Access";
        auth_basic_user_file /etc/nginx/.htpasswd;

        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# htpasswd 생성
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd teamuser
```

#### 방법 3: VPN 사용

팀이 VPN을 운영 중이라면, ChromaDB 서버를 VPN 내부에만 노출.

---

### 📦 백업 자동화

#### 백업 스크립트 생성

```bash
# scripts/backup-chromadb.sh
#!/bin/bash

BACKUP_DIR="/home/ubuntu/youth-compass-chromadb/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="chromadb_backup_${DATE}.tar.gz"

echo "🔄 ChromaDB 백업 시작: $BACKUP_FILE"

# Docker 볼륨 백업
docker run --rm \
  -v youth-compass-chromadb_chromadb_data:/source:ro \
  -v $BACKUP_DIR:/backup \
  alpine \
  tar -czf /backup/$BACKUP_FILE -C /source .

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "chromadb_backup_*.tar.gz" -mtime +7 -delete

echo "✅ 백업 완료: $BACKUP_DIR/$BACKUP_FILE"

# S3 업로드 (선택)
# aws s3 cp $BACKUP_DIR/$BACKUP_FILE s3://your-bucket/chromadb-backups/
```

#### Cron 설정 (매일 새벽 3시)

```bash
chmod +x scripts/backup-chromadb.sh

# crontab 편집
crontab -e

# 추가
0 3 * * * /home/ubuntu/youth-compass-chromadb/scripts/backup-chromadb.sh >> /var/log/chromadb-backup.log 2>&1
```

---

### 📊 모니터링 설정 (선택)

#### Docker Stats 모니터링

```bash
# 실시간 리소스 사용량
docker stats team-chromadb

# 또는 자동화
watch -n 5 'docker stats --no-stream team-chromadb'
```

#### Prometheus + Grafana (고급)

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your_password
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  grafana_data:
```

---

### 🔧 문제 해결

#### 문제 1: "Connection refused"
```bash
# 확인 사항
1. 서버에서 ChromaDB 실행 중인지 확인
   docker ps | grep chromadb

2. 방화벽 포트 개방 확인
   sudo ufw status | grep 8000

3. 서버 IP 확인
   ip addr show
```

#### 문제 2: "Out of memory"
```bash
# Docker 메모리 제한 증가
# docker-compose.yml에서
deploy:
  resources:
    limits:
      memory: 4G  # 2G → 4G
```

#### 문제 3: 데이터 손실
```bash
# 백업에서 복구
docker stop team-chromadb
docker run --rm \
  -v youth-compass-chromadb_chromadb_data:/target \
  -v ~/backups:/backup \
  alpine \
  tar -xzf /backup/chromadb_backup_20250105.tar.gz -C /target
docker start team-chromadb
```

---

## 마이그레이션 가이드

### 1단계: Docker 환경 준비

```bash
# 1. docker-compose.yml 생성
cat > docker-compose.yml << EOF
version: '3.8'
services:
  chromadb:
    image: chromadb/chroma:latest
    container_name: youth-policy-chromadb
    ports:
      - "8000:8000"
    volumes:
      - ./data/chromadb:/chroma/chroma
    environment:
      - CHROMA_SERVER_HOST=0.0.0.0
      - CHROMA_SERVER_HTTP_PORT=8000
    restart: unless-stopped
EOF

# 2. ChromaDB 컨테이너 시작
docker-compose up -d chromadb

# 3. 연결 테스트
curl http://localhost:8000/api/v1/heartbeat
```

### 2단계: 기존 데이터 마이그레이션

```python
# migration_script.py
import chromadb
import shutil
import os

def migrate_embedded_to_docker():
    print("🔄 Embedded → Docker 마이그레이션 시작...")

    # 1. 기존 Embedded ChromaDB에서 데이터 내보내기
    embedded_client = chromadb.PersistentClient(path="./data/vectorstore")
    collections = embedded_client.list_collections()

    # 2. Docker ChromaDB 클라이언트 연결
    docker_client = chromadb.HttpClient(host="localhost", port=8000)

    # 3. 각 컬렉션 마이그레이션
    for collection in collections:
        print(f"📁 컬렉션 마이그레이션: {collection.name}")

        # 기존 데이터 조회
        data = collection.get(include=["documents", "metadatas", "embeddings"])

        # 새 컬렉션 생성
        new_collection = docker_client.create_collection(collection.name)

        # 데이터 삽입
        if data['ids']:
            new_collection.add(
                ids=data['ids'],
                documents=data['documents'],
                metadatas=data['metadatas'],
                embeddings=data['embeddings']
            )

    print("✅ 마이그레이션 완료!")

if __name__ == "__main__":
    migrate_embedded_to_docker()
```

### 3단계: 애플리케이션 코드 수정

```python
# src/database/vector_store.py 수정
def _try_remote_connection(self, host: str, port: int) -> bool:
    """원격 ChromaDB 연결 시도 (Docker 우선)"""
    try:
        print(f"🐳 Docker ChromaDB 연결 시도: {host}:{port}")

        self.chroma_client = chromadb.HttpClient(
            host=host,
            port=port,
            settings=ChromaSettings(anonymized_telemetry=False)
        )

        # 헬스체크
        self.chroma_client.heartbeat()

        print(f"✅ Docker ChromaDB 연결 성공: {host}:{port}")
        return True

    except Exception as exc:
        print(f"❌ Docker 연결 실패: {exc}")
        return False
```

### 4단계: 설정 업데이트

```python
# src/config.py 수정
class Settings:
    # Docker ChromaDB 우선 설정
    chroma_host: str = "localhost"  # Docker 컨테이너
    chroma_port: int = 8000

    # Fallback용 로컬 경로
    vectorstore_path: str = "data/vectorstore"

    # Docker 우선 모드 활성화
    prefer_docker_chromadb: bool = True
```

### 5단계: 검증 및 정리

```bash
# 1. 기능 테스트
python -m src.main --status
python -m src.main --collections

# 2. 성능 테스트
python -m src.main
# → 질문/답변 테스트

# 3. 기존 데이터 백업 후 정리
mv data/vectorstore data/vectorstore.backup
```

## 권장 사항

### 📋 의사결정 체크리스트

다음 질문들을 통해 적합한 방식을 선택하세요:

#### Embedded ChromaDB 선택 기준
- [ ] 개인 프로젝트이거나 소규모 실험인가?
- [ ] Docker 설치/관리가 부담스러운가?
- [ ] 빠른 프로토타이핑이 목적인가?
- [ ] 리소스 사용량을 최소화해야 하는가?
- [ ] 네트워크 지연을 최소화해야 하는가?

#### Docker ChromaDB 선택 기준
- [ ] 팀 개발 프로젝트인가?
- [ ] 프로덕션 배포를 고려하고 있는가?
- [ ] 환경 일관성이 중요한가?
- [ ] 확장성을 고려해야 하는가?
- [ ] 백업/복원 자동화가 필요한가?

### 🎯 단계별 마이그레이션 전략

#### Phase 1: 개발 환경 (즉시)
```bash
# 개발자들이 Docker 방식으로 전환
docker-compose up -d chromadb
python migration_script.py
```

#### Phase 2: 스테이징 환경 (1-2주 후)
```bash
# CI/CD 파이프라인에 Docker 통합
# 자동화된 테스트 환경 구축
```

#### Phase 3: 프로덕션 환경 (1개월 후)
```bash
# 운영 환경에 고가용성 ChromaDB 배포
# 모니터링 및 백업 자동화
```

### 💡 모범 사례

#### 1. 하이브리드 접근법
```python
# 개발: Embedded, 운영: Docker
if os.getenv("ENVIRONMENT") == "development":
    client = chromadb.PersistentClient(path="./data/vectorstore")
else:
    client = chromadb.HttpClient(host="chromadb", port=8000)
```

#### 2. 점진적 마이그레이션
```bash
# 주 단위로 컴포넌트별 전환
Week 1: 개발 환경 Docker 전환
Week 2: CI/CD 파이프라인 업데이트
Week 3: 스테이징 환경 적용
Week 4: 프로덕션 환경 적용
```

#### 3. 모니터링 대시보드
```yaml
# docker-compose.monitoring.yml
services:
  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]

  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
```

### 📚 추가 자료

- [ChromaDB 공식 문서](https://docs.trychroma.com/)
- [Docker Compose 가이드](https://docs.docker.com/compose/)
- [마이크로서비스 아키텍처 패턴](https://microservices.io/)
- [벡터 데이터베이스 운영 가이드](https://docs.trychroma.com/deployment)

---

## 결론

### 📌 핵심 요약

**중요한 사실**:
- ⚠️ **Docker 볼륨 != 데이터 공유**
- 로컬 Docker 사용 시 각 팀원이 개별적으로 임베딩 필요
- 팀 프로젝트에서는 **공용 원격 서버**가 필수

### 🎯 팀 프로젝트 권장 아키텍처

```
✅✅ 소규모 팀 (2-3명): 시드 + 증분 업데이트
- 초기 세팅 빠름 (20분 → 3분)
- API 비용 67% 절감 ($45 → $15)
- 서버 비용 $0
- 오프라인 개발 가능
- Git으로 버전 관리

✅ 중규모 팀 (4-5명): 공용 원격 ChromaDB 서버
- 데이터 자동 동기화
- 장기적으로 더 효율적
- 증분 업데이트 1명만 실행
- 배포 파이프라인 구축 용이

⚠️ Fallback: 수동 Export/Import (Git LFS 불가 시)
- Google Drive, Dropbox 등 파일 공유 서비스 사용
- 수동 동기화 필요 (번거로움)
- 그래도 "각자 임베딩"보다는 훨씬 나음

❌ 비권장: 각자 로컬 Docker
- 환경 일관성만 제공 (데이터는 공유 안 됨!)
- API 비용 × 팀원 수
- 시간 × 팀원 수
```

### 📋 의사결정 가이드

**우리 팀은 어떤 방식을 선택해야 할까?**

#### 시드 + 증분을 선택하세요 (2-3명 소규모 팀):
- ✅ 팀원이 2-3명이다
- ✅ 서버 구축 부담이 크다
- ✅ 초기 세팅을 빠르게 하고 싶다
- ✅ 오프라인 개발이 필요하다
- ✅ Git LFS를 사용할 수 있다
- ✅ 데이터 업데이트가 주 1-2회 이하다

#### 공용 서버를 선택하세요 (4명 이상 팀):
- ✅ 팀원이 4명 이상이다
- ✅ 서버 1대를 운영할 수 있다
- ✅ 완전 자동 동기화를 원한다
- ✅ 프로덕션 배포를 고려하고 있다
- ✅ 데이터 업데이트가 빈번하다 (주 3회 이상)

#### 수동 Export/Import를 선택하세요 (Fallback):
- ⚠️ Git LFS를 사용할 수 없다 (회사 정책, Git 호스팅 제약)
- ⚠️ 그래도 "각자 임베딩"보다는 훨씬 낫다
- 💡 가능하면 Git LFS 사용을 먼저 고려하세요

#### 로컬 Docker를 선택하세요:
- ℹ️ 개인 프로젝트다
- ℹ️ 프로토타입 단계다

### 🚀 권장 다음 단계

**현재 상황**: 로컬 Docker로 프로토타입 구현 완료 ✅

**2-3명 소규모 팀이라면 (시드 방식)**:

1. **즉시 (1시간)**: 시드 데이터 생성 및 공유
   ```bash
   # 1. Git LFS 설치 및 초기화
   git lfs install

   # 2. 전체 임베딩 (최초 1회만)
   curl -X POST http://localhost:8000/reload-documents?force=true

   # 3. 시드 데이터 추출 및 커밋
   docker cp youth-policy-chromadb:/chroma/chroma ./data/chromadb_seed
   git lfs track "data/chromadb_seed/**"
   git add .gitattributes data/chromadb_seed
   git commit -m "Add ChromaDB seed: 23 PDFs embedded"
   git push
   ```

2. **단기 (1-2주)**: 팀원 온보딩 자동화
   - `scripts/init_chromadb.sh` 스크립트 작성
   - README에 초기 세팅 가이드 추가
   - 증분 업데이트 워크플로우 문서화

3. **중기 (1-2개월)**: 필요시 공용 서버 전환
   - 팀 규모 증가 시 고려
   - 데이터 업데이트 빈도 증가 시

---

**4명 이상 팀이라면 (공용 서버 방식)**:

1. **즉시 (1-2일)**: 공용 ChromaDB 서버 구축
   - AWS EC2 또는 GCP Compute Engine (t2.small, $10/월)
   - Docker Compose로 ChromaDB 배포
   - 대표 1명이 PDF 임베딩
   - 팀원들 `.env` 설정 업데이트

2. **단기 (1-2주)**: 운영 안정화
   - 백업 자동화 스크립트 적용
   - 모니터링 설정
   - 문서화

3. **중기 (1-2개월)**: 프로덕션 준비
   - CI/CD 파이프라인 구축
   - 보안 강화 (VPN/SSH 터널링)
   - 고가용성 구성

4. **장기 (3-6개월)**: 확장
   - Kubernetes로 마이그레이션
   - 자동 스케일링
   - 멀티 리전 배포

### 💰 예상 비용 (3명 팀 기준)

| 항목 | 각자 임베딩 | 시드 + 증분 | 공용 서버 |
|------|------------|------------|----------|
| **초기 임베딩** | $45 (3명×$15) | $15 (1회) | $15 (1회) |
| **월간 업데이트** (4회) | $180 (12회) | $36 (12회) | $12 (4회) |
| **서버 비용** | $0 | $0 | $10/월 |
| **총계 (월)** | **$180** | **$36** ⭐ | **$22** |
| **절감액** | 기준 (최악) | **✅ $144 절감 (80%)** | **✅ $158 절감 (88%)** |

**결론**:
- **단기 (3개월)**: 시드 방식이 가장 경제적 ($51 vs $57)
- **장기 (1년)**: 공용 서버가 더 효율적 ($159 vs $447)
- **시간 절약**: 시드 방식도 57% 절약 (60분 → 26분)

### 📚 추가 참고 자료

- [공용 서버 구축 가이드](#공용-서버-구축-가이드) (이 문서 내)
- [ChromaDB 공식 문서](https://docs.trychroma.com/)
- [Docker Compose 가이드](https://docs.docker.com/compose/)
- [AWS EC2 시작하기](https://aws.amazon.com/ec2/getting-started/)

---

**문서 버전**: 2.2
**최종 수정**: 2025-11-05
**주요 변경**:
- 방법 2 (Export/Import) 삭제 → 방법 2 (시드 + 증분)의 Fallback으로 통합
- 방법 3을 방법 2로 번호 변경
- Git LFS vs 수동 공유 명확한 비교 추가
- 문서 구조 단순화 (2가지 주요 방법: 공용 서버, 시드 + 증분)