from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from app.core.config import settings

embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"}
)

def retrieve_chunks(query: str, session_id: str, k: int = 5):
    try:
        vs = Chroma(
            collection_name=f"docs_{session_id}",
            embedding_function=embeddings,
            persist_directory=settings.chroma_persist_dir,
        )

        count = vs._collection.count()
        print(f"[DEBUG] Collection docs_{session_id} has {count} chunks")

        if count == 0:
            print(f"[DEBUG] Empty collection — session mismatch or no upload yet")
            return []

        results = vs.similarity_search(query, k=k)
        print(f"[DEBUG] Retrieved {len(results)} chunks for: '{query[:60]}'")

        return [
            {
                "text": doc.page_content,
                "source": doc.metadata.get("source", "unknown"),
                "page": doc.metadata.get("page", None),
            }
            for doc in results
        ]
    except Exception as e:
        print(f"[ERROR] Retrieval error: {e}")
        return []