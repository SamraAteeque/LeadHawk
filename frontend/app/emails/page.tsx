"use client";
import { useEffect, useState } from "react";
import { Mail, CheckCircle, Clock, MessageCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function EmailsPage() {
  const [emails,   setEmails]   = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");

  useEffect(() => { fetchEmails(); }, []);

  async function fetchEmails() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/emails/`);
      setEmails(await r.json());
    } catch { setEmails(MOCK_EMAILS); }
    setLoading(false);
  }

  const filtered = emails.filter(e => filter === "all" || e.status === filter);

  const statCounts = {
    all:     emails.length,
    draft:   emails.filter(e => e.status === "draft").length,
    sent:    emails.filter(e => e.status === "sent").length,
    opened:  emails.filter(e => e.status === "opened").length,
    replied: emails.filter(e => e.status === "replied").length,
  };

  return (
    <div style={{ padding: "28px 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: "#0F1117" }}>Emails</h1>
        <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{emails.length} AI-generated emails</p>
      </div>

      {/* Stat pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {(["all","draft","sent","opened","replied"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 16px", borderRadius: 20, fontSize: 13, cursor: "pointer",
            border: "1px solid", fontWeight: filter === f ? 600 : 400,
            borderColor: filter === f ? "#F59E0B" : "#E8EAF0",
            background:  filter === f ? "#FEF3C7"  : "#fff",
            color:       filter === f ? "#D97706"   : "#6B7280",
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({statCounts[f]})
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", gap: 20 }}>
        {/* Email list */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1.2fr 1fr 1fr", padding: "10px 20px", background: "#F7F8FA", borderBottom: "1px solid #E8EAF0" }}>
            {["Subject","Lead","Status","Sent"].map(h => (
              <span key={h} style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#9CA3AF" }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>✉</div>
              <div style={{ fontSize: 14, color: "#9CA3AF" }}>No emails yet. Generate emails from the leads page.</div>
            </div>
          ) : filtered.map((email: any) => (
            <div key={email.id} onClick={() => setSelected(selected?.id === email.id ? null : email)}
              style={{
                display: "grid", gridTemplateColumns: "2.5fr 1.2fr 1fr 1fr",
                padding: "13px 20px", borderBottom: "1px solid #F0F2F5",
                cursor: "pointer", alignItems: "center",
                background: selected?.id === email.id ? "#FFFBEB" : "#fff",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => { if (selected?.id !== email.id) (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; }}
              onMouseLeave={e => { if (selected?.id !== email.id) (e.currentTarget as HTMLElement).style.background = "#fff"; }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 500, color: "#0F1117", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
                {email.subject}
              </div>
              <div style={{ fontSize: 13, color: "#374151" }}>Lead #{email.lead_id}</div>
              <div>
                <StatusBadge status={email.status} />
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                {email.sent_at ? new Date(email.sent_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Not sent"}
              </div>
            </div>
          ))}
        </div>

        {/* Email detail */}
        {selected && (
          <div className="card" style={{ padding: 24, alignSelf: "start", position: "sticky", top: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 className="font-display" style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Email #{selected.id}</h3>
                <StatusBadge status={selected.status} />
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ background: "#F7F8FA", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>SUBJECT</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0F1117" }}>{selected.subject}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Body</div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.75, whiteSpace: "pre-wrap", background: "#FAFAFA", borderRadius: 8, padding: "12px 14px" }}>
                {selected.body}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {selected.status === "draft" && (
                <button className="btn-primary" style={{ flex: 1, padding: "9px 0", fontSize: 13 }}>Send Now</button>
              )}
              <button className="btn-outline" style={{ flex: 1, padding: "9px 0", fontSize: 13 }}>Resend</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
    draft:   { bg: "#F7F8FA", color: "#9CA3AF", icon: <Clock size={11} />,           label: "Draft"   },
    sent:    { bg: "#D1FAE5", color: "#065F46", icon: <CheckCircle size={11} />,      label: "Sent"    },
    opened:  { bg: "#DBEAFE", color: "#1D4ED8", icon: <Mail size={11} />,             label: "Opened"  },
    replied: { bg: "#FEF3C7", color: "#92400E", icon: <MessageCircle size={11} />,    label: "Replied!" },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {s.icon}{s.label}
    </span>
  );
}

const MOCK_EMAILS = [
  { id: 1, lead_id: 1, subject: "Kapoor Sweets — your customers are Googling for you right now",        status: "sent",    sent_at: "2026-06-14T08:05:00Z" },
  { id: 2, lead_id: 2, subject: "Your patients can find you before your competitors — Sharma Dental",   status: "replied", sent_at: "2026-06-13T08:07:00Z" },
  { id: 3, lead_id: 3, subject: "Riya's Boutique deserves a website as beautiful as your collection",   status: "opened",  sent_at: "2026-06-12T08:10:00Z" },
  { id: 4, lead_id: 6, subject: "Meena Saree Center — showcase your collection to Lucknow and beyond",  status: "draft",   sent_at: null },
  { id: 5, lead_id: 7, subject: "Singh Photography — let your work speak for itself online",             status: "sent",    sent_at: "2026-06-13T09:00:00Z" },
];
