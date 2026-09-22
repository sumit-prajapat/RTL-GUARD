"""
RAG retrieval service for RTL-guard.
Loads the pre-built FAISS index and retrieves the top-k most relevant bug patterns
based on vector embedding similarity with the submitted Verilog code.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_INDEX_DIR = BACKEND_DIR / "data" / "faiss_index"
MODEL_NAME = "all-MiniLM-L6-v2"


class RAGService:
    _instance: Optional["RAGService"] = None

    def __init__(self, index_dir: Path = DEFAULT_INDEX_DIR):
        self.index_dir = index_dir
        self.index: Optional[faiss.Index] = None
        self.documents: List[Dict[str, Any]] = []
        self.chunk_to_doc: List[int] = []
        self.model: Optional[SentenceTransformer] = None
        self._load_resources()

    @classmethod
    def get_instance(cls) -> "RAGService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_resources(self):
        """Loads FAISS index, metadata, and sentence-transformers embedding model."""
        index_file = self.index_dir / "index.faiss"
        metadata_file = self.index_dir / "metadata.json"

        if not index_file.exists() or not metadata_file.exists():
            print(f"[RAGService] Warning: FAISS index or metadata missing at {self.index_dir}")
            return

        print(f"[RAGService] Loading FAISS index from {index_file}...")
        self.index = faiss.read_index(str(index_file))

        with open(metadata_file, "r", encoding="utf-8") as f:
            meta = json.load(f)
            self.documents = meta.get("documents", [])
            self.chunk_to_doc = meta.get("chunk_to_doc_idx", [])

        print(f"[RAGService] Loading embedding model: {MODEL_NAME}...")
        self.model = SentenceTransformer(MODEL_NAME)
        print(f"[RAGService] Ready. {len(self.documents)} bug patterns available.")

    def retrieve(self, code_query: str, k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieves the top-k deduplicated bug pattern documents most relevant to code_query.
        """
        if self.index is None or self.model is None or not self.documents:
            print("[RAGService] Index not loaded. Returning empty context.")
            return []

        # Generate normalized embedding query
        emb = self.model.encode([code_query], convert_to_numpy=True, normalize_embeddings=True)
        emb = emb.astype(np.float32)

        # Retrieve up to 3*k chunks to allow deduplication across chunks of the same pattern
        search_k = min(len(self.chunk_to_doc), max(k * 3, 10))
        scores, indices = self.index.search(emb, search_k)

        seen_patterns = set()
        matched_docs: List[Dict[str, Any]] = []

        for idx in indices[0]:
            if idx < 0 or idx >= len(self.chunk_to_doc):
                continue
            doc_idx = self.chunk_to_doc[idx]
            doc = self.documents[doc_idx]
            pattern_id = doc["pattern_id"]

            if pattern_id not in seen_patterns:
                seen_patterns.add(pattern_id)
                matched_docs.append(doc)
                if len(matched_docs) == k:
                    break

        return matched_docs


def get_rag_service() -> RAGService:
    """Factory function returning the singleton RAGService instance."""
    return RAGService.get_instance()
