"""RAG Engine: preprocessing, embedding, and vector store orchestration.

Public API exposes:
- RagPipeline: end-to-end pipeline for preprocessing → embedding → Chroma upsert/query
- EmbeddingModel: embedding backend (Potion via model2vec or fallback)
- Preprocessor: OpenRouter-backed preprocessor (with local heuristic fallback)
- ChromaVectorStore: wrapper around Chroma HTTP client
"""

from .config import RagSettings
from .preprocess import Preprocessor
from .embedding import EmbeddingModel
from .vector_store import ChromaVectorStore
from .pipeline import RagPipeline

__all__ = [
  "RagSettings",
  "Preprocessor",
  "EmbeddingModel",
  "ChromaVectorStore",
  "RagPipeline",
]


