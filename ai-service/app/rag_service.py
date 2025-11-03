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
        """백그라운드에서 문서 로드"""
        try:
            logger.info("📚 백그라운드 문서 로딩 시작...")
            self.load_documents()
            logger.info("✅ 백그라운드 문서 로딩 완료!")
        except Exception as e:
            logger.error(f"❌ 백그라운드 문서 로딩 실패: {e}")
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


# 전역 인스턴스
rag_service = RAGService()
