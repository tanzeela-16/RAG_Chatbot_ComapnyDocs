import uuid, os
from datetime import datetime
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from app.core.config import settings

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_vectorstore(session_id: str):
    return Chroma(
        collection_name=f"docs_{session_id}",
        embedding_function=embeddings,
        persist_directory=settings.chroma_persist_dir,
    )

def ingest_file(file_path: str, filename: str, session_id: str) -> dict:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        loader = PyPDFLoader(file_path)
    elif ext in ("docx", "doc"):
        loader = Docx2txtLoader(file_path)
    else:
        loader = TextLoader(file_path)

    docs = loader.load()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    chunks = splitter.split_documents(docs)

    # Tag every chunk with source metadata
    for chunk in chunks:
        chunk.metadata["source"] = filename
        chunk.metadata["doc_id"] = str(uuid.uuid4())

    vs = get_vectorstore(session_id)
    vs.add_documents(chunks)
    vs.persist()

    return {"filename": filename, "chunks": len(chunks), "uploaded_at": datetime.utcnow().isoformat()}