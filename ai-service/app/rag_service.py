"""
RAG (Retrieval-Augmented Generation) 서비스

TODO:
- 문서 로딩 및 청킹
- 벡터 임베딩 생성
- ChromaDB 저장 및 검색
- 검색 결과 기반 응답 생성
"""

import os
import time
from glob import glob
from typing import List, Dict, Optional
from langchain_upstage import UpstageEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from app.config import settings
import logging
import chromadb
from chromadb.config import Settings as ChromaSettings

logger = logging.getLogger(__name__)


class RAGService:
    """RAG 기반 문서 검색 및 응답 생성 서비스"""
    
    def __init__(self):
        self.embeddings = None
        self.chroma_client = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.vector_chunk_size,
            chunk_overlap=settings.vector_chunk_overlap,
            length_function=len,
        )
        self.vector_store = None
        self.has_documents = False
        self.collection_name = "youth_policy_docs"
        
        # 초기화 시도
        self._initialize()
    
    def _initialize(self):
        """서비스 초기화 (백그라운드 문서 로드)"""
        logger.info("🚀 RAGService 초기화 시작...")
        try:
            # ChromaDB 클라이언트 초기화
            logger.info("🔌 ChromaDB 클라이언트 초기화 시작...")
            self._initialize_chroma_client()
            
            # Upstage API 키 확인
            if settings.upstage_api_key:
                self.embeddings = UpstageEmbeddings(
                    model=settings.upstage_embedding_model,
                    api_key=settings.upstage_api_key
                )
                logger.info("✅ Upstage 임베딩 모델 초기화 완료")
                
                # 백그라운드에서 문서 로드 시작
                import threading
                threading.Thread(
                    target=self._background_load,
                    daemon=True,
                    name="DocumentLoader"
                ).start()
                logger.info("📥 백그라운드에서 문서 로딩 시작...")
            else:
                logger.warning("UPSTAGE_API_KEY가 설정되지 않았습니다.")
        except Exception as e:
            logger.error(f"❌ RAG 서비스 초기화 실패: {e}")
            import traceback
            logger.error(traceback.format_exc())
    
    def _initialize_chroma_client(self):
        """ChromaDB 클라이언트 초기화"""
        import time
        
        # Docker ChromaDB 연결 시도 (재시도 로직 포함)
        chroma_host = settings.chroma_host
        chroma_port = settings.chroma_port
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                logger.info(f"ChromaDB 연결 시도 ({attempt + 1}/{max_retries}): http://{chroma_host}:{chroma_port}")
                
                self.chroma_client = chromadb.HttpClient(
                    host=chroma_host,
                    port=chroma_port,
                    settings=ChromaSettings(
                        anonymized_telemetry=False,
                        allow_reset=True
                    )
                )
                
                # 연결 테스트
                collections = self.chroma_client.list_collections()
                logger.info(f"✅ ChromaDB 연결 성공! (기존 컬렉션: {len(collections)}개)")
                return  # 성공하면 바로 리턴
                
            except Exception as e:
                logger.warning(f"❌ ChromaDB 연결 실패 ({attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    logger.info(f"⏳ {retry_delay}초 후 재시도...")
                    time.sleep(retry_delay)
                else:
                    logger.warning("ChromaDB 연결 최종 실패. 로컬 모드로 전환합니다.")
        
        # 모든 재시도 실패 - 로컬 모드로 fallback
        try:
            logger.info("로컬 PersistentClient 모드로 초기화 시도...")
            self.chroma_client = chromadb.PersistentClient(
                path="./chroma_db",
                settings=ChromaSettings(
                    anonymized_telemetry=False
                )
            )
            logger.info("✅ ChromaDB 로컬 모드로 초기화 완료")
        except Exception as e2:
            logger.error(f"❌ ChromaDB 로컬 초기화도 실패: {e2}")
            self.chroma_client = None
    
    def _background_load(self):
        """백그라운드에서 문서 로드 (자동 증분 업데이트 포함)"""
        try:
            logger.info("📚 백그라운드 문서 처리 시작...")
            
            # 기존 컬렉션 확인
            try:
                existing_collection = self.chroma_client.get_collection(self.collection_name)
                doc_count = existing_collection.count()
                
                if doc_count > 0:
                    logger.info(f"✅ 기존 컬렉션 발견: {self.collection_name} ({doc_count}개 청크)")
                    logger.info("🔍 새 PDF 파일 자동 확인 중...")
                    
                    # 기존 벡터 스토어 로드
                    self.vector_store = Chroma(
                        client=self.chroma_client,
                        collection_name=self.collection_name,
                        embedding_function=self.embeddings
                    )
                    self.has_documents = True
                    
                    # 증분 업데이트 자동 실행
                    added_pdf_count, skipped_pdf_count = self.add_documents_incremental(force_reload=False)
                    
                    if added_pdf_count > 0:
                        logger.info(f"✨ 새 PDF 파일 {added_pdf_count}개 자동 추가됨!")
                    else:
                        logger.info("📦 새 PDF 없음. 기존 데이터 사용")
                    
                    logger.info("✅ 백그라운드 문서 처리 완료!")
                    return
                    
            except Exception as e:
                logger.info(f"기존 컬렉션 없음: {e}. 전체 로딩 시작...")
            
            # 기존 컬렉션이 없으면 전체 로딩
            logger.info("📥 전체 문서 로딩 시작...")
            self.load_documents()
            logger.info("✅ 백그라운드 문서 로딩 완료!")
            
        except Exception as e:
            logger.error(f"❌ 백그라운드 문서 처리 실패: {e}")
            logger.info("💡 첫 요청 시 지연 로딩으로 재시도됩니다.")
    
    def load_documents(self):
        """
        문서 로드 및 ChromaDB 벡터 스토어 생성
        data/documents/ 폴더의 모든 PDF 파일을 로드
        """
        try:
            if not self.chroma_client or not self.embeddings:
                logger.warning("ChromaDB 클라이언트 또는 임베딩이 초기화되지 않았습니다")
                self.has_documents = False
                return
            
            # ChromaDB에 기존 컬렉션이 있는지 확인
            try:
                # embedding_function 없이 컬렉션 확인 (단순 존재 여부만)
                existing_collection = self.chroma_client.get_collection(
                    name=self.collection_name
                )
                doc_count = existing_collection.count()
                
                if doc_count > 0:
                    logger.info(f"✅ 기존 컬렉션 발견: {self.collection_name} ({doc_count}개 문서)")
                    logger.info("📦 기존 데이터를 사용합니다. 새로 로딩하지 않습니다.")
                    
                    # 기존 컬렉션을 벡터 스토어로 사용
                    self.vector_store = Chroma(
                        client=self.chroma_client,
                        collection_name=self.collection_name,
                        embedding_function=self.embeddings
                    )
                    self.has_documents = True
                    return
                else:
                    logger.info("기존 컬렉션이 비어있습니다. 새로 로딩합니다.")
            except Exception as e:
                logger.info(f"기존 컬렉션 없음: {e}. 새로 생성합니다.")
            
            # PDF 파일 찾기
            pdf_files = []
            if os.path.exists(settings.documents_path):
                pdf_files = sorted({
                    *glob(f"{settings.documents_path}/**/*.pdf", recursive=True),
                    *glob(f"{settings.documents_path}/**/*.PDF", recursive=True),
                })
            
            existing_files = [f for f in pdf_files if os.path.isfile(f)]
            
            if not existing_files:
                logger.warning(f"PDF 파일을 찾을 수 없습니다: {settings.documents_path}")
                self.has_documents = False
                return
            
            logger.info(f"PDF 파일 {len(existing_files)}개 발견")
            
            # PDF 로드
            documents = []
            for file_path in existing_files:
                try:
                    loader = PyPDFLoader(file_path)
                    docs = loader.load()
                    documents.extend(docs)
                    logger.info(f"로드 완료: {os.path.basename(file_path)}")
                except Exception as e:
                    logger.error(f"파일 로드 실패 {file_path}: {e}")
            
            if not documents:
                logger.warning("로드된 문서가 없습니다")
                self.has_documents = False
                return
            
            # 텍스트 분할
            splits = self.text_splitter.split_documents(documents)
            logger.info(f"문서 청크 {len(splits)}개 생성")
            
            # ChromaDB 벡터 스토어 생성
            try:
                # 기존 컬렉션 삭제 (재로드 시)
                try:
                    self.chroma_client.delete_collection(self.collection_name)
                    logger.info(f"기존 컬렉션 '{self.collection_name}' 삭제")
                except:
                    pass
                
                # Chroma 벡터 스토어 생성
                self.vector_store = Chroma.from_documents(
                    documents=splits,
                    embedding=self.embeddings,
                    client=self.chroma_client,
                    collection_name=self.collection_name
                )
                self.has_documents = True
                logger.info(f"ChromaDB 벡터 스토어 생성 완료 (컬렉션: {self.collection_name})")
                
            except Exception as e:
                logger.error(f"ChromaDB 벡터 스토어 생성 실패: {e}")
                self.has_documents = False
                
        except Exception as e:
            logger.error(f"문서 로드 실패: {e}")
            self.has_documents = False
    
    def search(self, query: str, k: int = None) -> List[Dict]:
        """
        유사 문서 검색 (지연 로딩 포함)
        
        Args:
            query: 검색 쿼리
            k: 반환할 문서 수 (기본값: settings.vector_search_k)
            
        Returns:
            검색된 문서 리스트 [{"content": str, "metadata": dict}]
        """
        # Fallback: 백그라운드 로딩 실패 시 지연 로딩
        if not self.has_documents and self.embeddings:
            logger.info("📥 문서가 로드되지 않음. 지연 로딩 시작...")
            self.load_documents()
        
        if not self.vector_store or not self.has_documents:
            return []
        
        if k is None:
            k = settings.vector_search_k
        
        try:
            docs = self.vector_store.similarity_search(query, k=k)
            return [
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata
                }
                for doc in docs
            ]
        except Exception as e:
            logger.error(f"문서 검색 실패: {e}")
            return []
    
    def get_retriever(self):
        """벡터 스토어의 retriever 반환 (지연 로딩 fallback 포함)"""
        # Fallback: 백그라운드 로딩 실패 시 지연 로딩
        if not self.has_documents and self.embeddings:
            logger.info("📥 문서가 로드되지 않음. 지연 로딩 시작...")
            self.load_documents()
        
        if not self.vector_store:
            return None
        return self.vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": settings.vector_search_k}
        )
    
    def format_docs(self, docs) -> str:
        """문서를 문자열로 포맷팅"""
        if not docs:
            return ""
        return "\n\n".join([doc.page_content for doc in docs])
    
    def add_documents(self, documents: list) -> tuple:
        """
        기존 벡터 저장소에 새 문서들을 증분 추가 (Low-level API)
        
        Why: 전체 재생성 없이 새 Document 객체들만 임베딩하여 추가
        실생활 비유: 도서관에 새 책들만 추가로 정리하기
        
        Args:
            documents: 추가할 Document 객체 리스트
            
        Returns:
            tuple[int, int]: (추가된 문서 수, 건너뛴 문서 수)
        """
        if not self.vector_store:
            logger.error("❌ 벡터 저장소가 로드되지 않았습니다")
            return 0, 0
        
        if not documents:
            logger.warning("❌ 추가할 문서가 없습니다")
            return 0, 0
        
        logger.info(f"📚 Document 객체 증분 추가: {len(documents)}개 문서 검사")
        
        try:
            # Step 1: 기존 문서 목록 조회
            existing_sources = self._get_existing_document_sources()
            
            # Step 2: 새 문서 필터링 (중복 제거)
            new_documents = []
            skipped_count = 0
            
            for doc in documents:
                source = doc.metadata.get("source", "")
                if source and source in existing_sources:
                    logger.debug(f"⏭️ 이미 존재하는 문서 건너뛰기: {source}")
                    skipped_count += 1
                else:
                    new_documents.append(doc)
            
            if not new_documents:
                logger.info("ℹ️ 추가할 새 문서가 없습니다 (모두 기존 문서)")
                return 0, skipped_count
            
            logger.info(f"📄 새 문서 {len(new_documents)}개 발견, 임베딩 추가 중...")
            
            # Step 3: 새 문서들을 기존 벡터 저장소에 추가
            self.vector_store.add_documents(new_documents)
            
            logger.info(f"✅ Document 객체 추가 완료!")
            logger.info(f"  - 추가된 문서: {len(new_documents)}개")
            logger.info(f"  - 건너뛴 문서: {skipped_count}개")
            
            return len(new_documents), skipped_count
            
        except Exception as e:
            logger.error(f"❌ Document 객체 추가 실패: {e}")
            return 0, 0
    
    def _get_existing_document_sources(self) -> set:
        """
        기존 ChromaDB에 있는 문서들의 source 목록 조회
        
        Returns:
            set: 기존 문서의 source 경로들
        """
        try:
            if not self.chroma_client:
                return set()
            
            # ChromaDB에서 모든 문서의 메타데이터 조회
            collection = self.chroma_client.get_collection(self.collection_name)
            result = collection.get(include=["metadatas"])
            
            # source 필드만 추출
            existing_sources = set()
            if result and result.get("metadatas"):
                for metadata in result["metadatas"]:
                    if metadata and "source" in metadata:
                        existing_sources.add(metadata["source"])
            
            logger.info(f"📋 기존 문서 {len(existing_sources)}개 확인됨")
            return existing_sources
            
        except Exception as e:
            logger.warning(f"기존 문서 목록 조회 실패: {e}")
            return set()
    
    def add_documents_incremental(self, force_reload: bool = False) -> tuple:
        """
        증분 업데이트: 새 PDF 문서만 ChromaDB에 추가
        
        Why: 기존 벡터 저장소에 새 문서만 추가
        실생활 비유: 도서관에 새 책들만 추가로 정리하기
        
        Args:
            force_reload: True면 전체 재로딩 (기존 컬렉션 삭제)
            
        Returns:
            tuple[int, int]: (추가된 문서 수, 건너뛴 문서 수)
        """
        logger.info("\n" + "="*60)
        logger.info("📚 증분 업데이트 모드")
        logger.info(f"새 문서를 벡터 저장소에 추가합니다: {settings.documents_path}")
        logger.info("="*60)
        
        try:
            # Step 1: 시스템 준비 상태 확인
            logger.info("\n[Step 1] 시스템 준비 상태 확인")
            if not self.chroma_client or not self.embeddings:
                logger.error("❌ RAG 시스템 초기화 실패!")
                logger.info("ChromaDB 클라이언트 또는 임베딩이 초기화되지 않았습니다")
                return 0, 0
            logger.info("✅ 시스템 준비 완료")
            
            # force_reload=True면 기존 컬렉션 삭제 후 전체 재로딩
            if force_reload:
                logger.info("\n[전체 재로딩 모드]")
                try:
                    logger.info("🔄 기존 컬렉션 삭제 중...")
                    self.chroma_client.delete_collection(name=self.collection_name)
                    self.vector_store = None
                    self.has_documents = False
                    logger.info("✅ 기존 컬렉션 삭제 완료")
                except Exception as e:
                    logger.info(f"ℹ️ 기존 컬렉션 없음: {e}")
                
                logger.info("🔄 전체 문서 로딩 시작...")
                self.load_documents()
                logger.info("\n✅ 전체 재로딩 완료!")
                return -1, 0  # -1은 전체 재로딩을 의미
            
            # Step 2: PDF 파일 탐색
            logger.info("\n[Step 2] PDF 파일 탐색")
            pdf_files = []
            if os.path.exists(settings.documents_path):
                pdf_files = sorted({
                    file for pattern in ["**/*.pdf", "**/*.PDF"]
                    for file in glob(os.path.join(settings.documents_path, pattern), recursive=True)
                })
            
            if not pdf_files:
                logger.warning(f"❌ PDF 파일을 찾을 수 없습니다: {settings.documents_path}")
                return 0, 0
            
            logger.info(f"✅ PDF 파일 {len(pdf_files)}개 발견")
            
            # Step 3: 기존 문서와 비교
            logger.info("\n[Step 3] 기존 문서와 중복 확인")
            existing_sources = self._get_existing_document_sources()
            
            # 새 문서 필터링
            new_pdf_files = []
            skipped_count = 0
            
            for pdf_file in pdf_files:
                if pdf_file in existing_sources:
                    logger.debug(f"  ⏭️ 건너뛰기: {os.path.basename(pdf_file)} (이미 존재)")
                    skipped_count += 1
                else:
                    new_pdf_files.append(pdf_file)
                    logger.info(f"  ➕ 새 문서: {os.path.basename(pdf_file)}")
            
            logger.info(f"\n📊 비교 결과:")
            logger.info(f"  - 전체 파일: {len(pdf_files)}개")
            logger.info(f"  - 새 문서: {len(new_pdf_files)}개")
            logger.info(f"  - 기존 문서 (건너뜀): {skipped_count}개")
            
            if not new_pdf_files:
                logger.info("\n💡 새로 추가된 문서가 없습니다.")
                logger.info("모든 문서가 이미 ChromaDB에 존재합니다.")
                return 0, skipped_count
            
            # Step 4: 새 문서 로딩 및 청킹
            logger.info(f"\n[Step 4] 새 문서 로딩 및 청킹 ({len(new_pdf_files)}개)")
            new_documents = []
            loaded_count = 0
            
            for i, pdf_file in enumerate(new_pdf_files, 1):
                try:
                    logger.info(f"  [{i}/{len(new_pdf_files)}] 로딩 중: {os.path.basename(pdf_file)}")
                    loader = PyPDFLoader(pdf_file)
                    docs = loader.load()
                    chunks = self.text_splitter.split_documents(docs)
                    new_documents.extend(chunks)
                    loaded_count += 1
                    logger.info(f"  ✅ 완료: {len(chunks)}개 청크 생성")
                except Exception as e:
                    logger.error(f"  ❌ 실패: {os.path.basename(pdf_file)} - {e}")
            
            if not new_documents:
                logger.warning("❌ 새 문서에서 청크를 추출하지 못했습니다")
                return 0, skipped_count
            
            logger.info(f"\n✅ 로딩 완료: 총 {len(new_documents)}개 청크 생성됨")
            
            # Step 5: ChromaDB에 추가
            logger.info("\n[Step 5] ChromaDB에 문서 추가")
            
            # 기존 벡터 스토어가 없으면 새로 생성
            if not self.vector_store:
                logger.info("벡터 스토어 초기화 중...")
                self.vector_store = Chroma(
                    client=self.chroma_client,
                    collection_name=self.collection_name,
                    embedding_function=self.embeddings
                )
            
            # Low-level add_documents() 호출
            logger.info("임베딩 생성 및 저장 중... (시간이 걸릴 수 있습니다)")
            added_chunks, skipped_chunks = self.add_documents(new_documents)
            
            self.has_documents = True
            
            # 최종 결과 (PDF 파일 개수 반환)
            logger.info("\n" + "="*60)
            logger.info("✅ 증분 업데이트 완료!")
            logger.info(f"  - 추가된 PDF 파일: {loaded_count}개")
            logger.info(f"  - 건너뛴 PDF 파일: {skipped_count}개 (이미 존재)")
            logger.info(f"  - 생성된 청크 (Document): {len(new_documents)}개")
            logger.info(f"  - ChromaDB에 저장된 청크: {added_chunks}개")
            logger.info("\n💡 이제 챗봇이 새로운 문서를 검색할 수 있습니다!")
            logger.info("="*60)
            
            return loaded_count, skipped_count
            
        except Exception as e:
            logger.error("\n" + "="*60)
            logger.error(f"❌ 증분 업데이트 중 오류 발생: {e}")
            logger.error("="*60)
            import traceback
            logger.error(traceback.format_exc())
            return 0, 0


# 전역 인스턴스
rag_service = RAGService()
