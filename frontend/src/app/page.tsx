"use client";
import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Upload, Send, FileText, Trash2, Bot, User,
  Loader2, BookOpen, ChevronDown, ChevronUp, Image
} from "lucide-react";
import { uploadDocument, sendMessage, getDocuments, deleteDocuments } from "@/lib/api";

type Message = { role: "user" | "assistant"; content: string; sources?: Source[] };
type Source = { text: string; source: string; page?: number };
type Doc = { filename: string; chunks: number };

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "bmp"];
const isImage = (name: string) => IMAGE_EXTS.includes(name.split(".").pop()?.toLowerCase() || "");

export default function Home() {
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") return uuidv4();
    const saved = localStorage.getItem("rag_session_id");
    if (saved) return saved;
    const newId = uuidv4();
    localStorage.setItem("rag_session_id", newId);
    return newId;
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDocuments(sessionId).then(setDocs).catch(() => {});
  }, [sessionId]);

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
    localStorage.removeItem("rag_session_id");
    window.location.reload();
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">DocMind RAG</span>
          </div>
          <p className="text-xs text-slate-400 ml-10">AI-powered document assistant</p>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 shadow-sm shadow-violet-200"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Processing..." : "Upload Document"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handleUpload}
          />
          <p className="text-center text-xs text-slate-400 mt-2">PDF · DOCX · TXT · Images</p>

          {docs.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Documents ({docs.length})
                </span>
                <button
                  onClick={handleDelete}
                  title="Clear all documents & start new session"
                  className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {docs.map((d, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 bg-violet-50 rounded-xl border border-violet-100">
                    {isImage(d.filename)
                      ? <Image className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                      : <FileText className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 truncate font-medium">{d.filename}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{d.chunks} chunks indexed</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {docs.length === 0 && (
            <div className="mt-8 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No documents yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload files to get started</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-400 space-y-1">
            <p>Session: <span className="font-mono text-slate-500" suppressHydrationWarning>{sessionId.slice(0, 8)}...</span></p>
            <p className="text-slate-300">Powered by Groq · LlamaIndex · ChromaDB</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="font-bold text-slate-900 text-lg">Company Knowledge Assistant</h1>
            <p className="text-xs text-slate-400">Ask questions about your uploaded documents</p>
          </div>
          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium ${docs.length > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-400 border border-slate-200"}`}>
            <span className={`w-2 h-2 rounded-full ${docs.length > 0 ? "bg-emerald-500" : "bg-slate-300"}`} />
            {docs.length > 0 ? `${docs.length} doc${docs.length > 1 ? "s" : ""} loaded` : "No docs loaded"}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 bg-violet-100 rounded-3xl flex items-center justify-center mb-5 shadow-inner">
                <Bot className="w-10 h-10 text-violet-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Ready to answer your questions</h2>
              <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                Upload a document or image on the left, then ask anything about its contents. I'll cite my sources.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-2.5 max-w-md">
                {[
                  "Summarize this document",
                  "What are the key points?",
                  "Explain the main concepts",
                  "List all action items"
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-left text-sm text-slate-600 bg-white border border-slate-200 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 rounded-xl p-3 transition-all font-medium shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-violet-200">
                  <Bot className="w-4 h-4 text-violet-600" />
                </div>
              )}

              <div className={`max-w-2xl ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-violet-600 text-white rounded-br-sm shadow-sm shadow-violet-200"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-headings:font-semibold prose-strong:text-slate-900 prose-ul:my-1 prose-li:my-0.5 prose-p:my-1 prose-blockquote:border-violet-400 prose-blockquote:text-slate-500 prose-blockquote:bg-violet-50 prose-blockquote:rounded prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:not-italic">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 ml-1 w-full">
                    <button
                      onClick={() => setExpandedSources(expandedSources === i ? null : i)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 transition-colors font-medium"
                    >
                      {expandedSources === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""} cited
                    </button>
                    {expandedSources === i && (
                      <div className="mt-2 space-y-2">
                        {msg.sources.map((s, j) => (
                          <div key={j} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                            <div className="font-semibold text-amber-800 mb-1.5 flex items-center gap-1.5">
                              <FileText className="w-3 h-3" />
                              {s.source}{s.page ? ` · page ${s.page}` : ""}
                            </div>
                            <p className="text-amber-700 leading-relaxed italic">"{s.text}..."</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center shrink-0 border border-violet-200">
                <Bot className="w-4 h-4 text-violet-600" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="bg-white border-t border-slate-200 p-4 shadow-lg">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={docs.length > 0 ? "Ask anything about your documents..." : "Upload a document first to start chatting..."}
              disabled={docs.length === 0 || loading}
              className="flex-1 border-2 border-slate-300 hover:border-slate-400 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || docs.length === 0}
              className="bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white disabled:text-slate-400 p-3 rounded-xl transition-all shadow-sm shadow-violet-200 disabled:shadow-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2.5">
            Answers are grounded in your documents only · Powered by Groq + ChromaDB
          </p>
        </div>
      </main>
    </div>
  );
}