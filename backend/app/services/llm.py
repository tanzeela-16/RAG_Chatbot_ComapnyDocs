import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"

from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.groq_api_key)

SYSTEM_PROMPT = """You are an intelligent document assistant. When answering questions:

- Use clear markdown formatting in your responses
- Use **bold** for key terms and important concepts  
- Use bullet points or numbered lists when listing multiple items
- Use ### headings to organize longer answers into sections
- Include a brief **Summary** at the top for complex answers
- Always end with: > 📄 *Source: [document name]*
- If the answer is not in the documents, say: "I couldn't find that in the uploaded documents."
- Be concise but thorough — no unnecessary filler text"""

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
        "content": f"Context from documents:\n{context}\n\nQuestion: {query}"
    })
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        temperature=0.3,
        max_tokens=1500,
    )
    return resp.choices[0].message.content