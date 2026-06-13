import uuid
from datetime import datetime
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from app.core.config import settings

# Free local embeddings — no API key needed
embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"}
)

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
        loader = TextLoader(file_path, encoding="utf-8")

    docs = loader.load()
    print(f"[DEBUG] Loaded {len(docs)} pages from {filename}")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    chunks = splitter.split_documents(docs)
    print(f"[DEBUG] Split into {len(chunks)} chunks")

    for chunk in chunks:
        chunk.metadata["source"] = filename
        chunk.metadata["doc_id"] = str(uuid.uuid4())

    vs = get_vectorstore(session_id)
    vs.add_documents(chunks)
    vs.persist()
    print(f"[DEBUG] Stored {len(chunks)} chunks under session docs_{session_id}")

    return {
        "filename": filename,
        "chunks": len(chunks),
        "uploaded_at": datetime.utcnow().isoformat()
    }