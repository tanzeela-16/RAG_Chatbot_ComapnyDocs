 
import chromadb

client = chromadb.PersistentClient(path="./chroma_db")
cols = client.list_collections()
print("Collections found:", [c.name for c in cols])
for c in cols:
    col = client.get_collection(c.name)
    print(f"  {c.name}: {col.count()} chunks")