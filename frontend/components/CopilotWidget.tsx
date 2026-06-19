"use client";
import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Sparkles } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  role: "user" | "copilot";
  content: string;
}

export default function CopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "copilot", content: "Hi! I'm your LeadHawk AI Copilot. Ask me to draft emails, write WhatsApp pitches, handle client objections, or give local SEO tips!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeLead, setActiveLead] = useState<any>(null);

  const listRef = useRef<HTMLDivElement>(null);

  // Listen to active lead selection events across the dashboard and leads list
  useEffect(() => {
    const handleLeadSelected = (e: Event) => {
      const lead = (e as CustomEvent).detail;
      setActiveLead(lead);
    };

    window.addEventListener("lead-selected", handleLeadSelected);
    return () => {
      window.removeEventListener("lead-selected", handleLeadSelected);
    };
  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const currentMessages = [...messages, userMsg];
      
      const response = await fetch(`${API}/api/agent/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          lead_id: activeLead ? activeLead.id : null
        })
      });

      const data = await response.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "copilot", content: data.reply }]);
      } else {
        throw new Error();
      }
    } catch {
      setMessages(prev => [...prev, { role: "copilot", content: "Sorry, I'm having trouble connecting to the backend. Please check if the backend is running." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: "linear-gradient(135deg, #F59E0B, #D97706)",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 4px 18px rgba(217, 119, 6, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          outline: "none",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 6px 22px rgba(217, 119, 6, 0.5)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 18px rgba(217, 119, 6, 0.4)";
        }}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Slide-out Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            right: 24,
            width: 360,
            height: 500,
            borderRadius: 16,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(228, 230, 235, 0.8)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.12)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            overflow: "hidden",
            animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              background: "#0F1117",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, #F59E0B, #D97706)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                }}
              >
                🦅
              </div>
              <div>
                <h4 className="font-display" style={{ fontSize: 13.5, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  LeadHawk Copilot
                </h4>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                  <span style={{ fontSize: 10, color: "#9CA3AF" }}>Online Assistant</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Active Context Banner */}
          {activeLead && (
            <div
              style={{
                background: "#FEF3C7",
                borderBottom: "1px solid #FDE68A",
                padding: "8px 16px",
                fontSize: 11,
                color: "#B45309",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={12} color="#D97706" />
              <span>
                Targeting context: <strong>{activeLead.biz_name}</strong>
              </span>
            </div>
          )}

          {/* Messages Log */}
          <div
            ref={listRef}
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: "#FAFBFD",
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    ...(m.role === "user"
                      ? {
                          background: "#0F1117",
                          color: "#fff",
                          borderBottomRightRadius: 2,
                        }
                      : {
                          background: "#fff",
                          color: "#374151",
                          border: "1px solid #E8EAF0",
                          borderBottomLeftRadius: 2,
                        }),
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    borderBottomLeftRadius: 2,
                    background: "#fff",
                    border: "1px solid #E8EAF0",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span className="dot" style={{ animationDelay: "0s" }} />
                  <span className="dot" style={{ animationDelay: "0.2s" }} />
                  <span className="dot" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            style={{
              padding: "12px 14px",
              borderTop: "1px solid #E8EAF0",
              background: "#fff",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Copilot a question..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #E8EAF0",
                borderRadius: 8,
                fontSize: 13,
                outline: "none",
                background: "#F7F8FA",
                color: "#0F1117",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: input.trim() && !loading ? "linear-gradient(135deg, #F59E0B, #D97706)" : "#F3F4F6",
                color: input.trim() && !loading ? "#fff" : "#9CA3AF",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Inline styles for dots animation and slideUp */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .dot {
          width: 6px;
          height: 6px;
          background: #9CA3AF;
          border-radius: 50%;
          display: inline-block;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}
