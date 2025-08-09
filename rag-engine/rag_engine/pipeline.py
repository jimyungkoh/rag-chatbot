"""End-to-end RAG pipeline orchestration.

전처리 → 임베딩 → 벡터 저장/검색을 하나의 인터페이스로 제공합니다.
"""
from __future__ import annotations

from typing import Iterable, Dict, Any, List
import uuid

from .config import RagSettings
from .preprocess import Preprocessor
from .embedding import EmbeddingModel
from .vector_store import ChromaVectorStore


class RagPipeline:
  """RAG 파이프라인 진입점.

  전처리기/임베더/벡터 스토어를 합성하여 ingest/query를 제공합니다.
  """

  def __init__(self, settings: RagSettings | None = None) -> None:
    """구성 요소 초기화."""
    self.settings = settings or RagSettings()
    self.preprocessor = Preprocessor(self.settings)
    self.embedder = EmbeddingModel(self.settings)
    self.store = ChromaVectorStore(self.settings)

  async def ingest_conversation(self, messages: Iterable[str], metadata: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """대화 인제스트: 전처리→임베딩→업서트.

    반환: 업서트된 문서 id/텍스트/임베딩 차원 메타정보
    """
    preprocessed = await self.preprocessor.preprocess(messages)
    vectors = self.embedder.embed([preprocessed])
    doc_id = str(uuid.uuid4())
    self.store.upsert(
      ids=[doc_id],
      embeddings=vectors,
      documents=[preprocessed],
      metadatas=[metadata or {}],
    )
    return {"id": doc_id, "text": preprocessed, "vector_dim": self.embedder.dimension}

  def similarity_search(self, query_text: str, top_k: int | None = None) -> Dict[str, Any]:
    """쿼리 텍스트 임베딩 후 Top-K 유사 문서 검색."""
    top_k = top_k or self.settings.default_top_k
    qv = self.embedder.embed([query_text])
    return self.store.query(query_embeddings=qv, top_k=top_k)


