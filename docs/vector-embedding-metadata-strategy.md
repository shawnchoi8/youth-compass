# 벡터 임베딩 및 메타데이터 처리 전략

## 📋 개요

벡터 데이터베이스에서 한국어 문서의 임베딩 처리와 메타데이터 활용 방안에 대한 분석 및 개선 제안서입니다.

## 🔍 현재 시스템 분석

### 임베딩 처리 방식
- **임베딩 대상**: 문서 내용(`page_content`)만 벡터로 변환
- **메타데이터**: 별도 저장, 임베딩에 포함되지 않음
- **언어**: 한국어 문서 → 한국어 기반 임베딩 벡터 생성

### 현재 구조
```python
# 도메인 컬렉션 (영어 기반)
domain_collections = {
    "housing": "youth_policy_housing",
    "finance": "youth_policy_finance",
    "employment": "youth_policy_employment",
    "general": "youth_policy_general"
}

# 메타데이터 예시
metadata = {
    "source": "data/documents/housing/01-서울시 청년월세지원/공고문.pdf",
    "domain": "housing"
}
```

## ⚠️ 문제점 식별

### 핵심 문제: 정책별 구분의 어려움

**시나리오**: 사용자가 "청년월세 지원제도 지원자격이 어떻게 돼?" 질문

**문제 상황**:
1. 긴 문서가 여러 청크로 분할됨
2. 중간 청크에는 정책명이 포함되지 않을 수 있음
3. 청크 내용만으로는 어떤 정책인지 구분 어려움

**예시**:
```text
❌ 문제가 되는 청크
"지원자격: 만 19세~39세, 소득 150% 이하, 서울시 거주"
→ 청년월세인지 청년도약계좌인지 알 수 없음
```

## 💡 해결 방안

### 방안 1: 청크 텍스트 강화 (권장)

**개념**: 청크 생성 시 정책명을 텍스트에 포함

```python
# Before
chunk_content = "지원자격: 만 19세~39세, 소득 150% 이하"

# After
enhanced_chunk = """
정책명: 청년월세 지원제도

지원자격: 만 19세~39세, 소득 150% 이하
신청방법: 온라인 신청
"""
```

**장점**:
- ✅ 임베딩에 정책명 포함
- ✅ 검색 정확도 향상
- ✅ 사용자 질문과 직접 매칭

### 방안 2: 메타데이터 기반 필터링

**개념**: 검색 시 메타데이터로 사전 필터링

```python
# 검색 로직
metadata_filter = {"policy_name": "청년월세지원"}
results = vector_store.similarity_search(
    query="지원자격",
    filter=metadata_filter,
    k=4
)
```

**장점**:
- ✅ 정확한 정책별 검색
- ✅ 불필요한 결과 제거

### 방안 3: 하이브리드 검색 (최적)

**개념**: 메타데이터 필터링 + 임베딩 검색 조합

```python
def hybrid_search(query: str, policy_name: str = None):
    # 1단계: 정책별 필터링 (선택적)
    if policy_name:
        policy_chunks = filter_by_policy(policy_name)
        search_space = policy_chunks
    else:
        search_space = all_chunks

    # 2단계: 유사도 검색
    results = similarity_search_within(search_space, query)
    return results
```

## 🚀 권장 구현 방안

### 1. 강화된 메타데이터 구조

```python
metadata = {
    "source": "housing/청년월세지원/공고문.pdf",
    "domain": "housing",                    # 시스템용 (영어)
    "domain_kr": "주거",                   # 사용자용 (한국어)
    "policy_name": "청년월세지원제도",       # 정책명 (한국어)
    "policy_id": "housing_monthly_rent",   # 정책 ID (영어)
    "section": "지원자격",                 # 문서 섹션
    "category": "월세지원",                # 세부 카테고리
    "region": "서울시",                   # 지역 정보
    "page": 3                             # 페이지 번호
}
```

### 2. 청크 텍스트 강화 로직

```python
def enhance_chunk_content(original_content: str, policy_name: str, section: str = None) -> str:
    """청크 내용에 정책 정보 추가"""

    enhanced_content = f"[정책: {policy_name}]"

    if section:
        enhanced_content += f" [{section}]"

    enhanced_content += f"\n\n{original_content}"

    return enhanced_content

# 사용 예시
enhanced_chunk = enhance_chunk_content(
    original_content="지원자격: 만 19세~39세, 소득 150% 이하",
    policy_name="청년월세지원제도",
    section="지원자격"
)
```

### 3. 정책명 추출 로직

```python
def extract_policy_name_from_path(file_path: str) -> str:
    """파일 경로에서 정책명 추출"""

    policy_mapping = {
        "청년월세지원": "청년월세지원제도",
        "청년도약계좌": "청년도약계좌",
        "햇살론유스": "햇살론유스",
        "청년안심주택": "청년안심주택",
        # ... 추가 매핑
    }

    for key, policy_name in policy_mapping.items():
        if key in file_path:
            return policy_name

    return "일반정책"
```

## 📊 기대 효과

### Before vs After

| 구분 | Before | After |
|------|--------|-------|
| **검색 정확도** | 부정확한 매칭 가능 | 정책별 정확한 매칭 |
| **사용자 경험** | 모호한 답변 | 명확한 정책별 답변 |
| **유지보수성** | 영어/한국어 혼재 | 체계적인 구조 |

### 검색 성능 개선

```text
사용자 질문: "청년월세 지원자격이 어떻게 돼?"

Before:
- 여러 정책의 지원자격이 혼재된 결과
- 사용자가 직접 구분해야 함

After:
- 청년월세지원제도 관련 결과만 반환
- 정확하고 구체적인 답변 제공
```

## 🔧 구현 우선순위

### Phase 1: 기본 구조 개선
- [ ] 메타데이터 스키마 확장
- [ ] 정책명 추출 로직 구현
- [ ] 청크 강화 로직 구현

### Phase 2: 검색 로직 개선
- [ ] 하이브리드 검색 구현
- [ ] 메타데이터 필터링 추가
- [ ] 검색 결과 랭킹 개선

### Phase 3: 고도화
- [ ] 자동 정책명 인식
- [ ] 의미적 유사도 개선
- [ ] 사용자 피드백 반영

## ⚡ 즉시 적용 가능한 개선사항

1. **파일 경로 구조 유지**: 현재 `finance`, `housing` 구조 그대로 사용
2. **메타데이터 한국어 추가**: `domain_kr`, `policy_name` 필드 추가
3. **청크 생성 시 정책명 포함**: 임베딩 품질 즉시 개선

---

**작성일**: 2025-11-04
**작성자**: AI Service Team
**검토 필요**: Vector Store 구현부, RAG Service 로직