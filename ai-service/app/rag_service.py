"""
RAG (Retrieval-Augmented Generation) 서비스

TODO:
- 문서 로딩 및 청킹
- 벡터 임베딩 생성
- ChromaDB 저장 및 검색
- 검색 결과 기반 응답 생성
"""

from typing import List, Dict
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter


class RAGService:
    """RAG 기반 문서 검색 및 응답 생성 서비스"""
    
    def __init__(self):
        # 임베딩 모델 (한국어 지원)
        self.embeddings = HuggingFaceEmbeddings(
            model_name="jhgan/ko-sroberta-multitask",
            model_kwargs={'device': 'cpu'}
        )
        
        # 텍스트 분할기
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        # Vector Store (나중에 초기화)
        self.vector_store = None
    
    def load_documents(self, document_path: str):
        """
        문서 로드 및 벡터 스토어에 저장
        
        TODO: PDF, DOCX 파일 파싱
        """
        pass
    
    async def search(self, query: str, k: int = 5) -> List[Dict]:
        """
        유사 문서 검색
        
        Args:
            query: 검색 쿼리
            k: 반환할 문서 수
            
        Returns:
            검색된 문서 리스트
        """
        if not self.vector_store:
            return []
        
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
            raise Exception(f"문서 검색 실패: {str(e)}")
    
    async def get_augmented_response(self, query: str, context_docs: List[Dict]) -> str:
        """
        검색된 문서를 바탕으로 응답 생성
        
        TODO: LangChain과 통합
        """
        pass


# 전역 인스턴스
rag_service = RAGService()
