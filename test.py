"""
AI 서비스 테스트 스크립트
프론트엔드 연결 전에 AI 서비스 API를 직접 테스트합니다.
"""

import requests
import json

# AI 서비스 URL
AI_SERVICE_URL = "http://localhost:8000"


def test_health():
    """헬스 체크 테스트"""
    print("=" * 50)
    print("1. 헬스 체크")
    print("=" * 50)

    response = requests.get(f"{AI_SERVICE_URL}/health")
    print(f"상태 코드: {response.status_code}")
    print(f"응답:\n{json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    print()


def test_chat(question: str):
    """챗봇 테스트"""
    print("=" * 50)
    print("2. 챗봇 질문")
    print("=" * 50)
    print(f"질문: {question}")
    print("-" * 50)

    payload = {
        "message": question,
        "user_id": "test_user",
        "session_id": "test_session_001",
    }

    response = requests.post(
        f"{AI_SERVICE_URL}/chat",
        json=payload,
        headers={"Content-Type": "application/json"},
    )

    print(f"상태 코드: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"\n답변:\n{result['response']}")
        print(f"\n세션 ID: {result['session_id']}")
        if result.get("search_source"):
            print(f"검색 소스: {result['search_source']}")
    else:
        print(f"에러: {response.text}")
    print()


def test_search(query: str):
    """문서 검색 테스트"""
    print("=" * 50)
    print("3. 문서 검색")
    print("=" * 50)
    print(f"검색어: {query}")
    print("-" * 50)

    response = requests.get(
        f"{AI_SERVICE_URL}/search", params={"query": query, "limit": 3}
    )

    print(f"상태 코드: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"\n검색 결과 수: {result['count']}")
        for i, doc in enumerate(result["results"], 1):
            print(f"\n결과 {i}:")
            print(f"내용: {doc['content'][:200]}...")
            print(f"파일: {doc.get('source', 'N/A')}")
    else:
        print(f"에러: {response.text}")
    print()


if __name__ == "__main__":
    print("\n🤖 Youth Compass AI 서비스 테스트\n")

    try:
        # 1. 헬스 체크
        test_health()

        # 2. 챗봇 질문 테스트
        # 여기에 원하는 질문을 입력하세요
        test_chat("산업기능요원이 뭐야?")
        test_chat("산업기능요원과 사회복무요원 차이가 뭐야?")

        # 3. 문서 검색 테스트 (선택사항)
        # test_search("청년 주거 지원")

    except requests.exceptions.ConnectionError:
        print("❌ AI 서비스에 연결할 수 없습니다.")
        print("Docker 컨테이너가 실행 중인지 확인하세요: docker-compose ps")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
