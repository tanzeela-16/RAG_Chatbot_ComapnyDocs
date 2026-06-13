from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse, SourceChunk
from app.services.retrieval import retrieve_chunks
from app.services.llm import generate_answer

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    chunks = retrieve_chunks(req.message, req.session_id)
    if not chunks:
        return ChatResponse(
            answer="I couldn't find any relevant information in your uploaded documents. Please upload some documents first.",
            sources=[],
            session_id=req.session_id,
        )
    answer = generate_answer(req.message, chunks, [m.dict() for m in req.history])
    sources = [SourceChunk(text=c["text"][:200], source=c["source"], page=c.get("page")) for c in chunks[:3]]
    return ChatResponse(answer=answer, sources=sources, session_id=req.session_id)