"""
ChromaDB 데이터 확인 스크립트
현재 저장된 문서 및 컬렉션 정보를 조회합니다.
"""

import chromadb
from chromadb.config import Settings as ChromaSettings

def check_local_chromadb():
    """로컬 ChromaDB 확인 (ai-service 컨테이너 내부)"""
    print("=" * 60)
    print("🔍 로컬 ChromaDB 확인 (./chroma_db)")
    print("=" * 60)
    
    try:
        # 로컬 ChromaDB 클라이언트 연결
        client = chromadb.PersistentClient(
            path="./chroma_db",
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        
        # 1. 모든 컬렉션 리스트
        collections = client.list_collections()
        print(f"\n📚 총 컬렉션 수: {len(collections)}")
        
        for collection in collections:
            print(f"\n{'='*60}")
            print(f"📦 컬렉션 이름: {collection.name}")
            print(f"{'='*60}")
            
            # 2. 컬렉션 내 문서 개수
            count = collection.count()
            print(f"📊 저장된 문서 청크 수: {count}개")
            
            if count > 0:
                # 3. 샘플 데이터 조회 (최대 5개)
                sample_size = min(5, count)
                results = collection.get(limit=sample_size)
                
                print(f"\n📄 샘플 데이터 ({sample_size}개):")
                print("-" * 60)
                
                for i, (doc_id, document, metadata) in enumerate(zip(
                    results['ids'],
                    results['documents'],
                    results['metadatas']
                ), 1):
                    print(f"\n[{i}] ID: {doc_id[:30]}...")
                    print(f"내용 (앞부분): {document[:150]}...")
                    if metadata:
                        print(f"메타데이터: {metadata}")
                
                # 4. 검색 테스트
                print(f"\n{'='*60}")
                print("🔎 검색 테스트: '청년 일자리'")
                print("=" * 60)
                
                search_results = collection.query(
                    query_texts=["청년 일자리"],
                    n_results=3
                )
                
                print(f"검색 결과 {len(search_results['documents'][0])}개:")
                for i, (doc, metadata, distance) in enumerate(zip(
                    search_results['documents'][0],
                    search_results['metadatas'][0],
                    search_results['distances'][0]
                ), 1):
                    print(f"\n[{i}] 유사도 점수: {1 - distance:.4f}")
                    print(f"내용: {doc[:200]}...")
                    if metadata:
                        print(f"출처: {metadata.get('source', 'N/A')}")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")


def check_docker_chromadb():
    """Docker Compose ChromaDB 확인"""
    print("\n" + "=" * 60)
    print("🐳 Docker ChromaDB 확인 (chromadb:8000)")
    print("=" * 60)
    
    try:
        # Docker Compose의 ChromaDB 연결
        # 컨테이너 내부에서 실행 시: chromadb:8000
        # 호스트에서 실행 시: localhost:8001
        client = chromadb.HttpClient(
            host="chromadb",  # Docker Compose 서비스 이름
            port=8000,  # 컨테이너 내부 포트
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        
        collections = client.list_collections()
        print(f"\n📚 총 컬렉션 수: {len(collections)}")
        
        if len(collections) == 0:
            print("⚠️  저장된 컬렉션이 없습니다.")
        else:
            for collection in collections:
                print(f"\n📦 컬렉션: {collection.name}")
                print(f"   문서 수: {collection.count()}개")
        
    except Exception as e:
        print(f"❌ 연결 실패: {e}")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🗄️  ChromaDB 데이터 확인 도구")
    print("=" * 60)
    
    # 로컬 ChromaDB 확인 (현재 사용 중)
    check_local_chromadb()
    
    # Docker ChromaDB 확인
    check_docker_chromadb()
    
    print("\n" + "=" * 60)
    print("✅ 확인 완료")
    print("=" * 60)

