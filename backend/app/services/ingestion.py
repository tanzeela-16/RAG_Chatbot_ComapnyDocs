import os
import uuid
from datetime import datetime

os.environ["ANONYMIZED_TELEMETRY"] = "False"

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain_core.documents import Document
from app.core.config import settings

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

def extract_image_text(file_path: str, filename: str) -> str:
    """Use Groq vision to describe the image"""
    import base64
    from groq import Groq
    from app.core.config import settings

    client = Groq(api_key=settings.groq_api_key)

    with open(file_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    ext = filename.rsplit(".", 1)[-1].lower()
    mime = "image/png" if ext == "png" else "image/jpeg"

    resp = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{image_data}"}
                },
                {
                    "type": "text",
                    "text": "Describe this image in detail. Extract all text, labels, data, diagrams, charts, or any information visible. Be thorough and structured."
                }
            ]
        }],
        max_tokens=1000,
    )
    return resp.choices[0].message.content

def ingest_file(file_path: str, filename: str, session_id: str) -> dict:
    ext = filename.rsplit(".", 1)[-1].lower()
    image_extensions = {"png", "jpg", "jpeg", "gif", "webp", "bmp"}

    if ext in image_extensions:
        print(f"[DEBUG] Processing image: {filename}")
        extracted_text = extract_image_text(file_path, filename)
        docs = [Document(
            page_content=f"Image description for '{filename}':\n{extracted_text}",
            metadata={"source": filename, "type": "image"}
        )]
        chunks = docs
        print(f"[DEBUG] Image described: {len(extracted_text)} characters")
    else:
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
    print(f"[DEBUG] Stored {len(chunks)} chunks under session docs_{session_id}")

    return {
        "filename": filename,
        "chunks": len(chunks),
        "uploaded_at": datetime.utcnow().isoformat()
    }