from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.core.config import settings

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def retrieve_chunks(query: str, session_id: str, k: int = 5):
    vs = Chroma(
        collection_name=f"docs_{session_id}",
        embedding_function=embeddings,
        persist_directory=settings.chroma_persist_dir,
    )
    results = vs.similarity_search_with_relevance_scores(query, k=k)
    return [
        {
            "text": doc.page_content,
            "source": doc.metadata.get("source", "unknown"),
            "page": doc.metadata.get("page", None),
            "score": round(score, 3),
        }
        for doc, score in results
        if score > 0.3   # filter low-relevance chunks
    ]