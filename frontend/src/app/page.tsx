"use client";
import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Upload, Send, FileText, Trash2, Bot, User, Loader2, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { uploadDocument, sendMessage, getDocuments, deleteDocuments } from "@/lib/api";

type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };
type Source = { text: string; source: string; page?: number };
type Doc = { filename: string; chunks: number };

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 2. Add this NEW useEffect right here to generate the ID safely on the browser
useEffect(() => {
  setSessionId(uuidv4());
}, []); // Empty brackets means "run only once when the page loads"

// 3. Keep your existing auto-scroll useEffect exactly as it was
useEffect(() => { 
  bottomRef.current?.scrollIntoView({ behavior: "smooth" }); 
}, [messages]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadDocument(file, sessionId);
      const updated = await getDocuments(sessionId);
      setDocs(updated);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await sendMessage(input, sessionId, messages.map(m => ({ role: m.role, content: m.content })));
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer, sources: res.sources }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error getting response. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    await deleteDocuments(sessionId);
    setDocs([]);
    setMessages([]);
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-violet-600" />
            <span className="font-semibold text-gray-900">DocMind RAG</span>
          </div>
          <p className="text-xs text-gray-400">Upload docs · Ask anything</p>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Processing..." : "Upload Document"}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleUpload} />

          {docs.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Documents ({docs.length})</span>
                <button onClick={handleDelete} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                {docs.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 bg-violet-50 rounded-lg border border-violet-100">
                    <FileText className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate font-medium">{d.filename}</p>
                      <p className="text-xs text-gray-400">{d.chunks} chunks indexed</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {docs.length === 0 && (
            <div className="mt-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No documents yet</p>
              <p className="text-xs text-gray-400 mt-1">Upload PDF, DOCX, or TXT</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 space-y-1">
            <p>Session: <span className="font-mono">{sessionId ? `${sessionId.slice(0, 8)}...` : "Loading..."}</span></p>
            <p className="text-gray-300">Powered by GPT-4o-mini + ChromaDB</p>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900">Company Knowledge Assistant</h1>
            <p className="text-xs text-gray-400">Ask questions about your uploaded documents</p>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${docs.length > 0 ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${docs.length > 0 ? "bg-green-500" : "bg-gray-300"}`} />
            {docs.length > 0 ? `${docs.length} doc${docs.length > 1 ? "s" : ""} loaded` : "No docs loaded"}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Ready to answer your questions</h2>
              <p className="text-sm text-gray-400 max-w-sm">Upload a document on the left, then ask anything about its contents. I'll cite my sources.</p>
              <div className="mt-6 grid grid-cols-2 gap-2 max-w-md">
                {["What are the key points?", "Summarize this document", "What risks are mentioned?", "List all action items"].map(q => (
                  <button key={q} onClick={() => setInput(q)} className="text-left text-xs text-gray-600 bg-white border border-gray-200 hover:border-violet-300 hover:bg-violet-50 rounded-lg p-2.5 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-violet-600" />
                </div>
              )}
              <div className={`max-w-2xl ${msg.role === "user" ? "order-first" : ""}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-violet-600 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"}`}>
                  {msg.content}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-1.5 ml-1">
                    <button
                      onClick={() => setExpandedSources(expandedSources === i ? null : i)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600 transition-colors"
                    >
                      {expandedSources === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""} cited
                    </button>
                    {expandedSources === i && (
                      <div className="mt-2 space-y-1.5">
                        {msg.sources.map((s, j) => (
                          <div key={j} className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-xs">
                            <div className="font-medium text-amber-800 mb-1">
                              📄 {s.source}{s.page ? ` · page ${s.page}` : ""}
                            </div>
                            <p className="text-amber-700 leading-relaxed">"{s.text}..."</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-violet-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:"0ms"}} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:"150ms"}} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:"300ms"}} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={docs.length > 0 ? "Ask anything about your documents..." : "Upload a document first..."}
              disabled={docs.length === 0 || loading}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || docs.length === 0}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-300 mt-2">Answers are grounded in your documents only</p>
        </div>
      </main>
    </div>
  );
}