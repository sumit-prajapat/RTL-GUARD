#!/usr/bin/env python3
"""
Ingestion script for the RTL-guard Bug-Pattern Knowledge Base.
Parses markdown files in backend/corpus/bug_patterns/, generates vector embeddings
using sentence-transformers, and builds/saves a local FAISS vector index.
"""

import json
import os
import re
from pathlib import Path
from typing import List, Dict, Any

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# Base paths
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
CORPUS_DIR = BACKEND_DIR / "corpus" / "bug_patterns"
INDEX_DIR = BACKEND_DIR / "data" / "faiss_index"
MODEL_NAME = "all-MiniLM-L6-v2"


def parse_markdown_pattern(file_path: Path) -> Dict[str, Any]:
    """Parse a single bug pattern markdown file into structured sections."""
    content = file_path.read_text(encoding="utf-8")

    pattern_id_match = re.search(r"^#\s*Pattern:\s*([a-zA-Z0-9_\-]+)", content, re.MULTILINE)
    pattern_id = pattern_id_match.group(1).strip() if pattern_id_match else file_path.stem

    name_match = re.search(r"##\s*Name\s*\n+([^\n#]+)", content)
    name = name_match.group(1).strip() if name_match else pattern_id

    tags_match = re.search(r"##\s*Tags\s*\n+([^\n#]+)", content)
    tags = [t.strip() for t in tags_match.group(1).split(",")] if tags_match else []

    explanation_match = re.search(r"##\s*Explanation\s*\n+(.*?)(?=\n##|\Z)", content, re.DOTALL)
    explanation = explanation_match.group(1).strip() if explanation_match else ""

    bad_example_match = re.search(r"##\s*Bad Example\s*\n+```(?:verilog)?\s*\n(.*?)\n```", content, re.DOTALL)
    bad_example = bad_example_match.group(1).strip() if bad_example_match else ""

    fixed_example_match = re.search(r"##\s*Fixed Example\s*\n+```(?:verilog)?\s*\n(.*?)\n```", content, re.DOTALL)
    fixed_example = fixed_example_match.group(1).strip() if fixed_example_match else ""

    why_match = re.search(r"##\s*Why It Matters\s*\n+(.*?)(?=\n##|\Z)", content, re.DOTALL)
    why_it_matters = why_match.group(1).strip() if why_match else ""

    # Synthesize rich multi-perspective text representation for retrieval
    # Includes tags, pattern name, explanation, why it matters, and bad/fixed code signatures
    searchable_chunk = (
        f"Pattern: {name} ({pattern_id})\n"
        f"Tags: {', '.join(tags)}\n"
        f"Description: {explanation}\n"
        f"Hardware Consequence: {why_it_matters}\n"
        f"Anti-pattern code:\n{bad_example}\n"
        f"Correct code pattern:\n{fixed_example}"
    )

    return {
        "pattern_id": pattern_id,
        "name": name,
        "tags": tags,
        "explanation": explanation,
        "bad_example": bad_example,
        "fixed_example": fixed_example,
        "why_it_matters": why_it_matters,
        "searchable_chunk": searchable_chunk,
        "full_markdown": content,
        "file_name": file_path.name,
    }


def build_and_save_index():
    """Builds FAISS index from corpus documents using multi-chunk indexing."""
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    pattern_files = sorted(CORPUS_DIR.glob("*.md"))

    if not pattern_files:
        raise FileNotFoundError(f"No pattern files found in {CORPUS_DIR}")

    print(f"Loading embedding model: {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)

    documents = []
    chunks = []
    chunk_to_doc_idx = []

    print(f"Parsing {len(pattern_files)} pattern files from {CORPUS_DIR}...")
    for doc_idx, pf in enumerate(pattern_files):
        doc = parse_markdown_pattern(pf)
        documents.append(doc)
        print(f"  - Parsed: [{doc['pattern_id']}] {doc['name']}")

        # Chunk 1: Rich semantic summary (tags, description, consequences)
        summary_text = (
            f"Pattern: {doc['name']} ({doc['pattern_id']})\n"
            f"Tags: {', '.join(doc['tags'])}\n"
            f"Explanation: {doc['explanation']}\n"
            f"Hardware Impact: {doc['why_it_matters']}"
        )
        chunks.append(summary_text)
        chunk_to_doc_idx.append(doc_idx)

        # Chunk 2: Code anti-pattern snippet with inline comments
        if doc["bad_example"]:
            code_text = f"Anti-pattern Verilog for {doc['pattern_id']}:\n{doc['bad_example']}"
            chunks.append(code_text)
            chunk_to_doc_idx.append(doc_idx)

        # Chunk 3: Comprehensive combined chunk
        combined_text = doc["searchable_chunk"]
        chunks.append(combined_text)
        chunk_to_doc_idx.append(doc_idx)

    print(f"Generating embeddings for {len(chunks)} multi-view chunks...")
    embeddings = model.encode(chunks, convert_to_numpy=True, normalize_embeddings=True)
    embeddings = embeddings.astype(np.float32)

    dimension = embeddings.shape[1]
    print(f"Embedding dimension: {dimension}")

    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings)
    print(f"FAISS index built. Total indexed vectors: {index.ntotal}")

    index_file = INDEX_DIR / "index.faiss"
    faiss.write_index(index, str(index_file))
    print(f"Saved FAISS index to {index_file}")

    metadata = {
        "documents": documents,
        "chunk_to_doc_idx": chunk_to_doc_idx,
    }
    metadata_file = INDEX_DIR / "metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Saved metadata for {len(documents)} patterns ({len(chunks)} chunks) to {metadata_file}")

    return index, documents


if __name__ == "__main__":
    build_and_save_index()
