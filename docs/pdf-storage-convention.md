# PDF 파일 저장 규칙 (팀 컨벤션)

> **작성일**: 2025-11-05  
> **대상**: 청년 정책 AI 챗봇 프로젝트 팀원 전체  
> **목적**: 벡터 DB 구축을 위한 파일 저장 규칙 통일

---

## 📌 왜 이 규칙이 필요한가?

### 문제 상황

```
❌ 규칙 없이 저장한 경우
data/
  ├─ 청년월세.pdf
  ├─ housing_policy.pdf
  └─ 공고문최종본_수정2.pdf
```

**문제점**:

- 어떤 정책인지 파악 어려움
- 도메인 구분 불가능
- 메타데이터 자동 추출 불가능

### 해결 방법

```
✅ 규칙을 따른 경우
data/documents/
  └─ housing/
      └─ 01-청년월세지원/
          ├─ 공고문.pdf
          └─ FAQ.pdf
```

**장점**:

- 정책명 자동 추출 가능
- 도메인별 관리 용이
- 메타데이터 일관성 확보

---

## 🗂️ 필수 규칙

### 1. 기본 폴더 구조

```
data/documents/
  ├─ housing/          # 주거 도메인
  ├─ finance/          # 금융 도메인
  ├─ career/           # 진로 도메인
  └─ general/          # 기타 일반 정책
```

### 2. 정책별 폴더 생성 규칙

**형식**: `번호-정책명축약형/`

```
housing/
  ├─ 01-청년월세지원/
  ├─ 02-청년도약계좌/
  ├─ 03-햇살론유스/
  └─ 04-청년안심주택/
```

**규칙**:

- 번호는 2자리 (01, 02, 03...)
- 하이픈(-) 뒤에 정책명 핵심 키워드
- 띄어쓰기 없이 작성
- 한글 사용 가능

### 3. 파일명 규칙

**형식**: `문서유형.pdf`

```
01-청년월세지원/
  ├─ 공고문.pdf           # 공식 공고문
  ├─ 신청서.pdf           # 신청서 양식
  ├─ FAQ.pdf             # 자주 묻는 질문
  ├─ 지원자격.pdf         # 지원 자격 안내
  └─ 신청방법.pdf         # 신청 방법 안내
```

**규칙**:

- 문서의 역할이 드러나는 이름
- 간결하게 작성 (최대 20자)
- 버전 정보는 파일명이 아닌 폴더에 표시

---

## 📋 도메인별 정책 목록

### Housing (주거)

```
housing/
  ├─ 01-청년월세지원/
  ├─ 02-청년도약계좌/
  ├─ 03-햇살론유스/
  ├─ 04-청년안심주택/
  ├─ 05-행복주택/
  └─ 06-역세권청년주택/
```

### Finance (금융)

```
finance/
  ├─ 01-햇살론유스/
  ├─ 02-청년도약계좌/
  ├─ 03-청년전용전세자금/
  └─ 04-중소기업청년대출/
```

### Career (진로)

```
career/
  ├─ 01-청년구직지원금/
  ├─ 02-창업지원금/
  └─ 03-인턴십프로그램/
```

### General (기타)

```
general/
  ├─ 01-병역특례/
  ├─ 02-문화패스/
  └─ 03-교육지원/
```

---

## 🔍 정책명 매핑 테이블

**용도**: 폴더명에서 정식 정책명으로 변환

|폴더명 (축약형)|정식 정책명|비고|
|---|---|---|
|청년월세지원|청년월세지원제도|주거|
|청년도약계좌|청년도약계좌|금융|
|햇살론유스|햇살론유스|금융|
|청년안심주택|청년안심주택|주거|
|행복주택|행복주택|주거|

**관리 방법**:

- 새 정책 추가 시 이 테이블에 기록
- 팀원 전체가 공유하는 문서로 관리
- 코드에서 이 테이블 참조

---

## 💻 코드 구현 예시

### 메타데이터 추출 함수

```python
import os
from pathlib import Path

def extract_metadata(file_path: str) -> dict:
    """
    파일 경로에서 메타데이터를 추출합니다.
    
    Args:
        file_path: PDF 파일 경로
        예) data/documents/housing/01-청년월세지원/공고문.pdf
    
    Returns:
        메타데이터 딕셔너리
    """
    
    # 정책명 매핑 테이블
    policy_mapping = {
        "청년월세지원": "청년월세지원제도",
        "청년도약계좌": "청년도약계좌",
        "햇살론유스": "햇살론유스",
        "청년안심주택": "청년안심주택",
        "행복주택": "행복주택",
        "역세권청년주택": "역세권청년주택",
        # 추가 정책들...
    }
    
    # 도메인 매핑
    domain_mapping = {
        "housing": "주거",
        "finance": "금융",
        "employment": "취업",
        "general": "일반"
    }
    
    # 도메인 추출
    domain = "general"
    domain_kr = "일반"
    for eng, kor in domain_mapping.items():
        if eng in file_path:
            domain = eng
            domain_kr = kor
            break
    
    # 정책명 추출 (경로에서 검색)
    policy_name = "일반정책"
    for key, full_name in policy_mapping.items():
        if key in file_path:
            policy_name = full_name
            break
    
    # 문서 유형 추출 (파일명에서)
    filename = os.path.basename(file_path)
    doc_type = filename.replace('.pdf', '')
    
    return {
        "source": file_path,              # 원본 파일 경로
        "domain": domain,                 # 도메인 (영어)
        "domain_kr": domain_kr,           # 도메인 (한국어)
        "policy_name": policy_name,       # 정식 정책명
        "doc_type": doc_type              # 문서 유형
    }


# 테스트 코드
if __name__ == "__main__":
    test_paths = [
        "data/documents/housing/01-청년월세지원/공고문.pdf",
        "data/documents/finance/02-햇살론유스/신청서.pdf",
    ]
    
    for path in test_paths:
        meta = extract_metadata(path)
        print(f"파일: {path}")
        print(f"  정책명: {meta['policy_name']}")
        print(f"  도메인: {meta['domain_kr']}")
        print(f"  문서유형: {meta['doc_type']}")
        print()
```

---

## ⚠️ 예외 상황 처리

### 1. 같은 정책의 다른 버전

**방법 1: 하위 폴더로 구분 (권장)**

```
housing/01-청년월세지원/
  ├─ 2024년/
  │   ├─ 공고문.pdf
  │   └─ FAQ.pdf
  └─ 2025년/
      ├─ 공고문.pdf
      └─ FAQ.pdf
```

**방법 2: 파일명에 연도 포함**

```
housing/01-청년월세지원/
  ├─ 공고문_2024.pdf
  ├─ 공고문_2025.pdf
  └─ FAQ.pdf
```

### 2. 여러 정책을 다루는 통합 문서

```
general/
  └─ 00-통합안내/
      └─ 청년정책가이드북.pdf
```

- 00번으로 시작
- `policy_name`을 "청년정책통합안내"로 설정

### 3. 정책명이 매핑 테이블에 없는 경우

```python
# 기본값 반환
if policy_name == "일반정책":
    print(f"⚠️ 경고: {file_path}의 정책명을 찾을 수 없습니다.")
    print(f"   → 매핑 테이블에 추가 필요")
```

---

## ✅ 파일 저장 체크리스트

파일을 저장하기 전에 다음을 확인하세요:

- [ ] 올바른 도메인 폴더에 저장했는가? (`housing`, `finance` 등)
- [ ] 폴더명이 `번호-정책명` 형식인가?
- [ ] 정책명이 매핑 테이블에 등록되어 있는가?
- [ ] 파일명이 문서 유형을 명확히 나타내는가?
- [ ] 불필요한 버전 정보가 파일명에 없는가? (예: `_최종`, `_v2`)
- [ ] 한 폴더에 같은 정책 관련 파일들만 있는가?

---

## 📝 신규 정책 추가 절차

### 1단계: 정책 정보 확인

- 정책명 (정식 명칭)
- 도메인 분류 (주거/금융/취업/일반)
- 수집할 문서 종류

### 2단계: 폴더 생성

```bash
# 예: 신규 주거 정책 추가
mkdir -p data/documents/housing/07-새로운정책명
```

### 3단계: 매핑 테이블 업데이트

```python
# 이 문서의 "정책명 매핑 테이블" 섹션에 추가
"새로운정책명": "새로운정책명_정식명칭"
```

### 4단계: 파일 저장

```bash
# PDF 파일 저장
cp 공고문.pdf data/documents/housing/07-새로운정책명/
```

### 5단계: 팀 공유

- 팀 채널에 새 정책 추가 알림
- 이 문서 업데이트 후 커밋/푸시

---

## 🔄 기존 파일 마이그레이션

만약 기존에 규칙 없이 저장된 파일들이 있다면:

### 스크립트로 자동 정리

```python
import os
import shutil

def migrate_files():
    """
    기존 파일들을 새 규칙에 맞게 이동
    """
    old_dir = "data/old_files"
    new_base = "data/documents"
    
    # 파일별 이동 규칙 (수동으로 매핑)
    migration_map = {
        "청년월세.pdf": "housing/01-청년월세지원/공고문.pdf",
        "housing_policy.pdf": "housing/02-청년도약계좌/공고문.pdf",
        # ... 추가 매핑
    }
    
    for old_path, new_path in migration_map.items():
        src = os.path.join(old_dir, old_path)
        dst = os.path.join(new_base, new_path)
        
        # 폴더 생성
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        
        # 파일 이동
        if os.path.exists(src):
            shutil.copy(src, dst)
            print(f"✅ {old_path} → {new_path}")
```

---

## 🤝 팀 협업 가이드

### 역할별 책임

**도메인 담당자** (주거/금융/취업 등):

- 해당 도메인의 신규 정책 파일 추가
- 매핑 테이블 업데이트
- 파일 저장 규칙 준수 확인

**프로젝트 리더**:

- 전체 폴더 구조 관리
- 규칙 위반 사항 확인 및 수정 요청

**전체 팀원**:

- 이 문서 숙지
- 파일 저장 시 체크리스트 확인

### 커밋 메시지 예시

```bash
# 신규 정책 추가
git commit -m "docs: 청년안심주택 정책 문서 추가 (housing)"

# 기존 파일 정리
git commit -m "refactor: 파일 저장 규칙에 맞게 구조 정리"

# 매핑 테이블 업데이트
git commit -m "docs: 정책명 매핑 테이블 업데이트"
```

---

## 📞 문의 사항

- **이 규칙이 왜 필요한지 이해가 안 됩니다**  
    → 벡터 DB에서 정책별로 검색하고 메타데이터를 자동으로 추출하기 위함입니다.
    
- **새 정책을 추가하려면 어떻게 하나요?**  
    → "신규 정책 추가 절차" 섹션을 참고하세요.
    
- **파일명이 길어질 것 같은데요?**  
    → 파일명은 간결하게, 상세 정보는 메타데이터나 파일 내용으로 관리합니다.
    
- **기존 파일들은 어떻게 하나요?**  
    → "기존 파일 마이그레이션" 섹션의 스크립트를 참고하세요.
    

---

**마지막 업데이트**: 2025-11-05  
**문서 관리자**: [팀 리더 이름]  
**버전**: 1.0