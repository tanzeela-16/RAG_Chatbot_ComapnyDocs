from pydantic import BaseModel
from typing import Optional, List

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    session_id: str
    history: List[ChatMessage] = []

class SourceChunk(BaseModel):
    text: str
    source: str
    page: Optional[int] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    session_id: str

class DocumentInfo(BaseModel):
    id: str
    filename: str
    chunks: int
    uploaded_at: str