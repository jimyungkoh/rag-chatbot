"""Chroma vector store wrapper.

Docker의 Chroma 서버에 HTTP로 우선 연결하고, 실패 시 로컬 영속 경로로
폴백합니다. 최후 수단은 메모리 클라이언트입니다.
"""
from __future__ import annotations

from typing import List, Dict, Any, Iterable
from pathlib import Path

import chromadb
from chromadb.errors import InvalidArgumentError, NotFoundError  # type: ignore

from .config import RagSettings


class ChromaVectorStore:
  """Chroma 컬렉션 생성/업서트/쿼리를 담당하는 어댑터."""

  def __init__(self, settings: RagSettings) -> None:
    """클라이언트 초기화 및 컬렉션 준비."""
    self.settings = settings
    # Prefer HTTP client to talk to dockerized server
    try:
      self.client = chromadb.HttpClient(host=self.settings.chroma_host, port=self.settings.chroma_port)  # type: ignore[attr-defined]
    except Exception:
      # Fallback to local persistent client to survive across processes
      local_path = Path.home() / ".rag_chromadb"
      local_path.mkdir(parents=True, exist_ok=True)
      try:
        self.client = chromadb.PersistentClient(path=str(local_path))  # type: ignore[attr-defined]
      except Exception:
        # Final fallback: in-memory
        self.client = chromadb.Client()  # type: ignore[call-arg]
    self.collection = self._get_or_create_collection(self.settings.chroma_collection)

  def _get_or_create_collection(self, name: str):
    """컬렉션이 있으면 가져오고, 없으면 생성."""
    try:
      return self.client.get_collection(name)
    except Exception:
      return self.client.create_collection(name=name)

  def upsert(self, ids: List[str], embeddings: List[List[float]], documents: Iterable[str], metadatas: Iterable[Dict[str, Any]] | None = None) -> None:
    """벡터/문서/메타데이터 업서트.

    - 컬렉션이 삭제된 상태(핸들 유효하지 않음) → 재획득 후 재시도
    - 임베딩 차원 불일치(예: 기존 384d 컬렉션) → 컬렉션 삭제 후 재생성 및 재시도
    """
    docs = list(documents)
    metas = list(metadatas) if metadatas is not None else None
    try:
      self.collection.upsert(ids=ids, embeddings=embeddings, documents=docs, metadatas=metas)
      return
    except NotFoundError:
      # Refresh handle and retry once
      self.collection = self._get_or_create_collection(self.settings.chroma_collection)
      self.collection.upsert(ids=ids, embeddings=embeddings, documents=docs, metadatas=metas)
      return
    except InvalidArgumentError as e:
      # Dimension mismatch; enforce 256d-only by recreating collection
      if "dimension" in str(e).lower():
        try:
          self.client.delete_collection(name=self.settings.chroma_collection)
        except Exception:
          pass
        self.collection = self._get_or_create_collection(self.settings.chroma_collection)
        self.collection.upsert(ids=ids, embeddings=embeddings, documents=docs, metadatas=metas)
        return
      raise

  def query(self, query_embeddings: List[List[float]], top_k: int) -> Dict[str, Any]:
    """Top-K 유사도 검색 결과 반환."""
    return self.collection.query(query_embeddings=query_embeddings, n_results=top_k)


