"""Embedding backend module.

Potion(model2vec)을 우선 시도하고, 가용하지 않으면 sentence-transformers로
자동 폴백합니다. 각 백엔드의 출력 차원은 상이(256 vs 384)할 수 있으므로
`dimension` 속성으로 노출합니다.
"""
from __future__ import annotations

from typing import Iterable, List
import logging

import numpy as np

from .config import RagSettings

LOGGER = logging.getLogger(__name__)


class EmbeddingModel:
  """임베딩 백엔드 관리 클래스.

  - 우선: `minishlab/potion-multilingual-128M` (model2vec 필요, 256차원)
  - 폴백: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384차원)
  """

  def __init__(self, settings: RagSettings) -> None:
    self.settings = settings
    self._backend = None
    self._dimension: int | None = None

  @property
  def dimension(self) -> int | None:
    """현재 백엔드의 임베딩 차원(알 수 없으면 None)."""
    return self._dimension

  def _load_backend(self):
    """백엔드 지연 로드. Potion→ST 순으로 시도."""
    if self._backend is not None:
      return
    # Try model2vec (Potion)
    try:
      from model2vec import StaticModel  # type: ignore
      self._backend = StaticModel.from_pretrained(self.settings.embedding_model_id)
      # Potion outputs 256-dim
      self._dimension = 256
      LOGGER.info("Loaded Potion model via model2vec: %s", self.settings.embedding_model_id)
      return
    except Exception as e:
      # If Potion is explicitly requested, do not fallback
      if "minishlab/potion" in (self.settings.embedding_model_id or ""):
        raise RuntimeError(
          "Potion (minishlab/potion-multilingual-128M) is required but model2vec is not available. "
          "Install with: pip install model2vec. Original error: %s" % e
        )
      LOGGER.warning("Potion/model2vec not available (%s). Falling back to sentence-transformers.", e)

    # Fallback: sentence-transformers
    try:
      from sentence_transformers import SentenceTransformer  # type: ignore
      # Pick multilingual small model for CPU if Potion unavailable
      fallback_id = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
      self._backend = SentenceTransformer(fallback_id, device=self.settings.embedding_device)
      # Known dim for the fallback model
      self._dimension = 384
      LOGGER.info("Loaded fallback embedding model: %s", fallback_id)
    except Exception as e:
      raise RuntimeError(f"Failed to initialize any embedding backend: {e}")

  def embed(self, texts: Iterable[str]) -> List[List[float]]:
    """문자열 Iterable을 임베딩 리스트로 변환(float32 리스트).

    - Potion: `StaticModel.encode`
    - ST: `SentenceTransformer.encode(normalize_embeddings=True)`
    """
    self._load_backend()
    texts_list = [t if isinstance(t, str) else str(t) for t in texts]

    # Potion
    if self._backend.__class__.__name__ == "StaticModel":
      vecs = self._backend.encode(texts_list)  # type: ignore[attr-defined]
      if isinstance(vecs, np.ndarray):
        return vecs.astype(np.float32).tolist()
      return np.array(vecs, dtype=np.float32).tolist()

    # Sentence-Transformers
    embeddings = self._backend.encode(texts_list, convert_to_numpy=True, normalize_embeddings=True)
    return embeddings.astype(np.float32).tolist()


