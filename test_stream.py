"""
스트리밍 응답 테스트 스크립트
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"


def test_streaming_chat(message: str, test_name: str):
    """
    스트리밍 채팅 테스트
    
    Args:
        message: 질문 내용
        test_name: 테스트 이름
    """
    print(f"\n{'='*60}")
    print(f"🧪 {test_name}")
    print(f"📝 질문: {message}")
    print(f"{'='*60}\n")
    
    # 시작 시간
    start_time = time.time()
    first_chunk_time = None
    relevance_check_time = None
    document_search_time = None
    
    try:
        # SSE 스트림 연결
        response = requests.post(
            f"{BASE_URL}/chat-stream",
            json={"message": message},
            headers={"Content-Type": "application/json"},
            stream=True,  # 스트리밍 활성화
            timeout=60
        )
        
        if response.status_code != 200:
            print(f"❌ 오류: HTTP {response.status_code}")
            return
        
        print("🔄 스트리밍 시작...\n")
        print("💬 답변:", end=" ", flush=True)
        
        full_response = ""
        search_source = None
        chunk_count = 0
        relevance_check_completed_time = None
        answer_generation_started_time = None
        llm_streaming_started_time = None
        
        # SSE 스트림 읽기
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                
                # SSE 형식 파싱: "data: {...}"
                if line_str.startswith('data: '):
                    data_str = line_str[6:]  # "data: " 제거
                    
                    try:
                        data = json.loads(data_str)
                        chunk_type = data.get('type')
                        
                        # 첫 청크 시간 기록 (실제 답변 내용이 도착할 때만)
                        # content 타입만 기록하여 LLM 관련성 체크 등이 완료된 후 측정
                        if first_chunk_time is None and chunk_type == 'content':
                            first_chunk_time = time.time()
                            ttfc = first_chunk_time - start_time  # Time To First Chunk
                            print(f"\n\n⚡ 첫 응답까지: {ttfc:.2f}초\n", flush=True)
                            print("💬 답변:", end=" ", flush=True)
                        
                        # 타입별 처리
                        if chunk_type == 'session':
                            session_id = data.get('session_id', '')
                            print(f"[세션: {session_id[:8]}]", end=" ", flush=True)
                        
                        elif chunk_type == 'status':
                            status = data.get('content', '')
                            current_time = time.time()
                            
                            # 각 단계별 시간 측정
                            if "문서 검색 중" in status and document_search_time is None:
                                document_search_time = current_time
                                elapsed = current_time - start_time
                                print(f"\n🔍 {status} ({elapsed:.2f}초)", end=" ", flush=True)
                            elif ("관련성 검사 중" in status or "관련성 확인됨" in status or "관련성 낮음" in status) and relevance_check_time is None:
                                # LangGraph는 노드가 완료된 후 이벤트를 스트리밍하므로
                                # 이 시점이 이미 LLM 호출이 완료된 후입니다
                                relevance_check_time = current_time
                                elapsed = current_time - start_time
                                print(f"\n🔍 {status} ({elapsed:.2f}초)", end=" ", flush=True)
                                if document_search_time:
                                    check_duration = current_time - document_search_time
                                    print(f" [문서 검색: {check_duration:.2f}초]", end="", flush=True)
                            else:
                                print(f"\n🔍 {status}", end=" ", flush=True)
                        
                        elif chunk_type == 'metadata':
                            current_meta_time = time.time()
                            
                            # 관련성 체크 완료 시간 기록
                            if data.get('relevance_check_completed') and relevance_check_completed_time is None:
                                relevance_check_completed_time = current_meta_time
                                if relevance_check_time:
                                    actual_check_duration = relevance_check_completed_time - relevance_check_time
                                    print(f" [LLM 호출 완료: {actual_check_duration:.2f}초]", end="", flush=True)
                            
                            # 답변 생성 시작 시간 기록
                            if data.get('answer_generation_started') and answer_generation_started_time is None:
                                answer_generation_started_time = current_meta_time
                            
                            # LLM 스트리밍 시작 시간 기록
                            if data.get('llm_streaming_started') and llm_streaming_started_time is None:
                                llm_streaming_started_time = current_meta_time
                            
                            # 출처 정보
                            if 'search_source' in data:
                                search_source = data.get('search_source')
                                print(f"\n📊 출처: {search_source}", flush=True)
                        
                        elif chunk_type == 'content':
                            content = data.get('content', '')
                            print(content, end="", flush=True)
                            full_response += content
                            chunk_count += 1
                        
                        elif chunk_type == 'done':
                            search_source = data.get('search_source')
                            print(f"\n\n✅ 완료!", flush=True)
                        
                        elif chunk_type == 'error':
                            error_msg = data.get('content', '')
                            print(f"\n\n❌ 오류: {error_msg}", flush=True)
                            break
                    
                    except json.JSONDecodeError as e:
                        print(f"\n⚠️ JSON 파싱 오류: {e}", flush=True)
        
        # 종료 시간
        end_time = time.time()
        total_time = end_time - start_time
        
        # 통계 출력
        print(f"\n\n{'='*60}")
        print("📊 통계")
        print(f"{'='*60}")
        print(f"⏱️  총 소요 시간: {total_time:.2f}초")
        
        if first_chunk_time:
            ttfc = first_chunk_time - start_time
            print(f"⚡ 첫 응답까지: {ttfc:.2f}초 (체감 속도!)")
            print(f"📝 답변 생성: {total_time - ttfc:.2f}초")
        
        print(f"💬 답변 길이: {len(full_response)}자")
        print(f"📦 청크 수: {chunk_count}개")
        print(f"🔍 출처: {search_source}")
        
        
        # 성능 평가
        if first_chunk_time:
            ttfc = first_chunk_time - start_time
            if ttfc < 1:
                grade = "🌟 초고속"
            elif ttfc < 2:
                grade = "🚀 매우 빠름"
            elif ttfc < 3:
                grade = "✅ 빠름"
            else:
                grade = "⚠️ 보통"
            
            print(f"\n🎯 체감 속도 평가: {grade}")
        
        print(f"{'='*60}\n")
        
        return {
            "success": True,
            "total_time": total_time,
            "first_chunk_time": first_chunk_time - start_time if first_chunk_time else None,
            "response_length": len(full_response),
            "chunk_count": chunk_count,
            "search_source": search_source
        }
    
    except requests.Timeout:
        print(f"\n❌ 타임아웃 (60초 초과)")
        return {"success": False, "error": "Timeout"}
    
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}


def compare_with_normal_chat(message: str):
    """
    일반 채팅과 스트리밍 채팅 비교
    """
    print("\n" + "="*60)
    print("🆚 일반 vs 스트리밍 비교")
    print("="*60)
    
    # 1. 일반 채팅 테스트
    print("\n[1/2] 일반 채팅 테스트...")
    print(f"📝 질문: {message}")
    start = time.time()
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat",
            json={"message": message},
            timeout=60
        )
        normal_time = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            response_text = data.get("response", "")
            search_source = data.get("search_source", "unknown")
            
            print(f"✅ 완료: {normal_time:.2f}초")
            print(f"📄 답변 길이: {len(response_text)}자")
            print(f"🔍 출처: {search_source}")
            
        else:
            print(f"❌ 실패: HTTP {response.status_code}")
            normal_time = None
    except Exception as e:
        print(f"❌ 오류: {e}")
        import traceback
        traceback.print_exc()
        normal_time = None
    
    # 대기
    time.sleep(2)
    
    # 2. 스트리밍 채팅 테스트
    print("\n[2/2] 스트리밍 채팅 테스트...")
    stream_result = test_streaming_chat(message, "스트리밍 테스트")
    
    # 비교 결과
    if normal_time and stream_result and stream_result.get("success"):
        print("\n" + "="*60)
        print("📊 비교 결과")
        print("="*60)
        
        stream_total = stream_result["total_time"]
        stream_first = stream_result.get("first_chunk_time")
        
        print(f"\n일반 채팅:")
        print(f"  총 시간: {normal_time:.2f}초")
        print(f"  체감: {normal_time:.2f}초 (완료 후 한번에 표시)")
        
        print(f"\n스트리밍 채팅:")
        print(f"  총 시간: {stream_total:.2f}초")
        if stream_first:
            print(f"  첫 응답: {stream_first:.2f}초 ⚡")
            print(f"  체감: {stream_first:.2f}초 (실시간 표시)")
        else:
            print(f"  첫 응답: 측정 실패 (content 타입 청크가 없음)")
            print(f"  체감: {stream_total:.2f}초 (실시간 표시)")
        
        if stream_first:
            improvement = ((normal_time - stream_first) / normal_time) * 100
            if improvement > 0:
                print(f"\n💡 체감 속도 개선: {improvement:.1f}% 향상! 🎉")
            else:
                print(f"\n⚠️ 체감 속도: {abs(improvement):.1f}% 느림 (스트리밍은 첫 응답이 빠르지만 총 시간이 더 걸릴 수 있음)")
        else:
            print(f"\n⚠️ 스트리밍 첫 응답 측정 실패")
        print("="*60)


def main():
    """메인 실행"""
    print("="*60)
    print("⚡ 스트리밍 응답 테스트")
    print(f"🕐 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # 서버 연결 확인
    print("\n🔍 서버 연결 확인 중...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ 서버 연결 성공!\n")
        else:
            print(f"❌ 서버 응답 오류: HTTP {response.status_code}\n")
            return
    except Exception as e:
        print(f"❌ 서버 연결 실패: {e}\n")
        return
    
    # 테스트 케이스
    test_cases = [
        ("청년 일자리에서 청년들이 고려하는 사항이 무엇일까?", "PDF 검색 - 일자리"),
        ("세계최고의 축구선수는 누구야?", "웹 검색 - 축구"),
    ]
    
    results = []
    
    # 개별 테스트
    for i, (message, name) in enumerate(test_cases, 1):
        print(f"\n{'#'*60}")
        print(f"테스트 {i}/{len(test_cases)}")
        print(f"{'#'*60}")
        
        result = test_streaming_chat(message, name)
        results.append(result)
        
        if i < len(test_cases):
            print(f"⏳ 다음 테스트까지 3초 대기...")
            time.sleep(3)
    
    # 비교 테스트 (선택적)
    print(f"\n{'#'*60}")
    print("추가 테스트: 일반 vs 스트리밍 비교")
    print(f"{'#'*60}")
    compare_with_normal_chat("청년 주거 지원금은?")
    
    print(f"\n🕐 종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  테스트가 중단되었습니다.")
    except Exception as e:
        print(f"\n\n❌ 예상치 못한 오류: {e}")
        import traceback
        traceback.print_exc()

