from fastapi import APIRouter
from chromadb import PersistentClient
from app.core.config import settings

router = APIRouter()

@router.get("/documents/{session_id}")
async def list_documents(session_id: str):
    try:
        client = PersistentClient(path=settings.chroma_persist_dir)
        col = client.get_collection(f"docs_{session_id}")
        results = col.get(include=["metadatas"])
        seen = {}
        for meta in results["metadatas"]:
            src = meta.get("source", "unknown")
            seen[src] = seen.get(src, 0) + 1
        return [{"filename": k, "chunks": v} for k, v in seen.items()]
    except Exception:
        return []

@router.delete("/documents/{session_id}")
async def delete_documents(session_id: str):
    try:
        client = PersistentClient(path=settings.chroma_persist_dir)
        client.delete_collection(f"docs_{session_id}")
        return {"message": "All documents deleted"}
    except Exception:
        return {"message": "Nothing to delete"}