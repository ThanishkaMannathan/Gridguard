"""
Chunks the markdown protection guideline documents in ./knowledge_base,
embeds each chunk using the NVIDIA nv-embedqa-e5-v5 model, and stores the
vectors in a local persistent ChromaDB collection.

Run once (or whenever knowledge_base/*.md changes):
    python build_index.py

Requires NVIDIA_API_KEY to be set in the environment (backend/.env).
"""
import os
import sys
import glob
import chromadb

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from utils.nvidia_client import embed_texts  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KB_DIR = os.path.join(BASE_DIR, "knowledge_base")
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db")
COLLECTION_NAME = "gridguard_protection_guidelines"

CHUNK_SIZE = 900       # characters
CHUNK_OVERLAP = 150    # characters


def chunk_text(text, source, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Split on paragraph boundaries first, then pack into ~chunk_size chunks."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current = ""
    for p in paragraphs:
        if len(current) + len(p) + 2 <= chunk_size:
            current = f"{current}\n\n{p}" if current else p
        else:
            if current:
                chunks.append(current)
            # start new chunk, carrying a small overlap tail from previous chunk
            tail = current[-overlap:] if current else ""
            current = f"{tail}\n\n{p}" if tail else p
    if current:
        chunks.append(current)
    return [{"text": c, "source": source} for c in chunks]


def load_and_chunk_docs():
    all_chunks = []
    for path in sorted(glob.glob(os.path.join(KB_DIR, "*.md"))):
        with open(path, "r") as f:
            text = f.read()
        source = os.path.basename(path)
        all_chunks.extend(chunk_text(text, source))
    return all_chunks


def build_index():
    chunks = load_and_chunk_docs()
    if not chunks:
        print(f"No markdown files found in {KB_DIR}")
        return

    print(f"Loaded {len(chunks)} chunks from {KB_DIR}")
    texts = [c["text"] for c in chunks]

    print("Embedding chunks via NVIDIA nv-embedqa-e5-v5 ...")
    embeddings = embed_texts(texts, input_type="passage")

    os.makedirs(CHROMA_DIR, exist_ok=True)
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    collection = client.create_collection(COLLECTION_NAME)

    ids = [f"chunk-{i:04d}" for i in range(len(chunks))]
    metadatas = [{"source": c["source"], "chunk_index": i} for i, c in enumerate(chunks)]

    collection.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
    print(f"Indexed {len(chunks)} chunks into ChromaDB collection '{COLLECTION_NAME}' at {CHROMA_DIR}")


if __name__ == "__main__":
    build_index()
