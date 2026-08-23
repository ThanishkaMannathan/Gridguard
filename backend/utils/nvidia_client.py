"""
Thin wrapper around the NVIDIA NIM API (OpenAI-compatible) used for both
text embeddings (RAG retrieval) and chat completion (fault diagnosis).

Requires env var NVIDIA_API_KEY. Get a key at https://build.nvidia.com
Never hardcode the key -- it is read from the environment only.
"""
import os
from openai import OpenAI

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
GENERATION_MODEL = "meta/llama-3.1-70b-instruct"
EMBEDDING_MODEL = "nvidia/nv-embedqa-e5-v5"

_client = None


def get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("NVIDIA_API_KEY")
        if not api_key:
            raise RuntimeError(
                "NVIDIA_API_KEY is not set. Add it to backend/.env (see .env.example)."
            )
        _client = OpenAI(base_url=NVIDIA_BASE_URL, api_key=api_key)
    return _client


def embed_texts(texts, input_type="passage"):
    """
    Embed a list of strings with the NVIDIA nv-embedqa-e5-v5 model.
    input_type: 'passage' when embedding knowledge-base chunks,
                'query' when embedding a search query.
    Returns a list of float vectors, one per input text.
    """
    client = get_client()
    resp = client.embeddings.create(
        input=texts,
        model=EMBEDDING_MODEL,
        encoding_format="float",
        extra_body={"input_type": input_type, "truncate": "END"},
    )
    return [d.embedding for d in resp.data]


def chat_complete(messages, temperature=0.2, max_tokens=350):
    """
    Call the NVIDIA-hosted Llama 3.1 70B instruct model for generation.
    `messages` follows the standard OpenAI chat format:
      [{"role": "system"/"user"/"assistant", "content": "..."}]
    Returns the assistant's text response.
    """
    client = get_client()
    resp = client.chat.completions.create(
        model=GENERATION_MODEL,
        messages=messages,
        temperature=temperature,
        top_p=0.9,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content
