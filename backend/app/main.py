from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import upload, chat, documents

app = FastAPI(title="RAG Company Docs API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(documents.router, prefix="/api", tags=["Documents"])

@app.get("/health")
def health():
    return {"status": "ok"}