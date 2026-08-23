"""
Query-time retrieval against the ChromaDB collection built by build_index.py.
"""
import os
import sys
import chromadb

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from utils.nvidia_client import embed_texts  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db")
COLLECTION_NAME = "gridguard_protection_guidelines"

_client = None
_collection = None


def get_collection():
    global _client, _collection
    if _collection is None:
        if not os.path.isdir(CHROMA_DIR):
            raise RuntimeError(
                "ChromaDB index not found. Run `python rag/build_index.py` first."
            )
        _client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = _client.get_collection(COLLECTION_NAME)
    return _collection


def retrieve(query, top_k=4):
    """
    Embed the query with the NVIDIA embedding model (input_type='query') and
    return the top_k most relevant knowledge-base chunks with their source.
    """
    collection = get_collection()
    query_vec = embed_texts([query], input_type="query")[0]
    results = collection.query(query_embeddings=[query_vec], n_results=top_k)

    hits = []
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    dists = results.get("distances", [[]])[0]
    for doc, meta, dist in zip(docs, metas, dists):
        hits.append({
            "text": doc,
            "source": meta.get("source"),
            "relevance": round(1 - dist, 4) if dist is not None else None,
        })
    return hits
