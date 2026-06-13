from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.groq_api_key)

SYSTEM_PROMPT = """You are a helpful assistant that answers questions strictly based on the provided document context.
- Always mention the source document name in your answer
- If the answer is not found in the context, say exactly: "I couldn't find that in the uploaded documents"
- Be concise and precise
- Use bullet points for lists"""

def build_context(chunks: list) -> str:
    parts = []
    for i, c in enumerate(chunks, 1):
        page_info = f" (page {c['page']})" if c.get("page") else ""
        parts.append(f"[{i}] From '{c['source']}'{page_info}:\n{c['text']}")
    return "\n\n".join(parts)

def generate_answer(query: str, chunks: list, history: list) -> str:
    context = build_context(chunks)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for msg in history[-6:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({
        "role": "user",
        "content": f"Context:\n{context}\n\nQuestion: {query}"
    })

    resp = client.chat.completions.create(
        model="llama3-8b-8192",   # free Groq model
        messages=messages,
        temperature=0.2,
        max_tokens=1024,
    )
    return resp.choices[0].message.content