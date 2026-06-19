"use client";
import { useEffect, useState } from "react";
import { TrendingUp, Mail, Users, MessageSquare, MapPin, Instagram, Linkedin, ChevronRight, Send } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const [stats, setStats]   = useState<any>(null);
  const [leads, setLeads]   = useState<any[]>(MOCK_LEADS);
  const [selected, setSelected] = useState<any>(null);
  const [email, setEmail]   = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending]       = useState(false);
  const [filter, setFilter] = useState("all");
  const [emailInput, setEmailInput] = useState("");
  const [waMessage, setWaMessage]   = useState("");
  const [waLoading, setWaLoading]   = useState(false);
  const [auditData, setAuditData]   = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [template, setTemplate]         = useState("direct");
  const [copiedAudit, setCopiedAudit]   = useState(false);

  useEffect(() => {
    if (selected) {
      setEmailInput(selected.email || "");
      setWaMessage("");
      fetchAudit(selected.id);
      window.dispatchEvent(new CustomEvent("lead-selected", { detail: selected }));
    } else {
      window.dispatchEvent(new CustomEvent("lead-selected", { detail: null }));
    }
  }, [selected]);

  async function fetchAudit(leadId: number) {
    setAuditLoading(true);
    setAuditData(null);
    try {
      const r = await fetch(`${API}/api/leads/${leadId}/audit`, { method: "POST" });
      const d = await r.json();
      setAuditData(d);
    } catch {}
    setAuditLoading(false);
  }

  async function saveEmail() {
    if (!selected) return;
    try {
      const r = await fetch(`${API}/api/leads/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
      const updated = await r.json();
      setSelected(updated);
      fetchLeads();
    } catch {}
  }

  async function generateWhatsAppMsg() {
    if (!selected) return;
    setWaLoading(true);
    setWaMessage("");
    try {
      const r = await fetch(`${API}/api/leads/${selected.id}/generate-whatsapp`, { method: "POST" });
      const d = await r.json();
      setWaMessage(d.message || "");
    } catch {
      setWaMessage(`Hi! I noticed ${selected.biz_name} doesn't have a website yet. I build websites for local businesses. Let me know if you'd be open to a quick chat!`);
    }
    setWaLoading(false);
  }

  function openWhatsApp() {
    if (!selected || !selected.phone) return;
    let cleanPhone = selected.phone.replace(/[^0-9]/g, "");
    
    // Handle leading zero (e.g. 09876543210 -> 9876543210)
    if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // Handle leading 910 (e.g. 9109876543210 -> 919876543210)
    if (cleanPhone.length === 13 && cleanPhone.startsWith("910")) {
      cleanPhone = "91" + cleanPhone.substring(3);
    }
    
    // Prepend India country code (91) if it's a 10 digit number
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }
    
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, "_blank");
  }

  useEffect(() => {
    fetchStats();
    fetchLeads();
  }, [filter]);

  async function fetchStats() {
    try {
      const r = await fetch(`${API}/api/leads/stats`);
      setStats(await r.json());
    } catch { setStats(MOCK_STATS); }
  }

  async function fetchLeads() {
    try {
      const params = filter !== "all" ? `?status=${filter}&date=today` : "?date=today";
      const r = await fetch(`${API}/api/leads${params}&limit=8`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setLeads(d.leads || []);
    } catch {
      // Local filtering of MOCK_LEADS if backend is down or unreachable
      let filteredMock = MOCK_LEADS;
      if (filter !== "all") {
        filteredMock = MOCK_LEADS.filter(l => l.status === filter);
      }
      setLeads(filteredMock);
    }
  }

  async function generateEmail(lead: any, activeTemplate?: string) {
    const t = activeTemplate || template;
    setSelected(lead);
    setEmail(null);
    setGenerating(true);
    try {
      const r = await fetch(`${API}/api/emails/generate/${lead.id}?template=${t}`, { method: "POST" });
      setEmail(await r.json());
    } catch {
      setEmail({
        subject: `${lead.biz_name} — your customers are searching for you online`,
        body: `Hi,\n\nI came across ${lead.biz_name} on ${sourceLabel(lead.source)} and noticed you don't have a website yet.\n\nI'm Samra, a web developer from Lucknow — I build fast, professional websites that help local businesses show up on Google and get more clients.\n\nWould you be open to a quick chat this week?\n\n— Samra Ateeque\nsamrateq.com`,
      });
    }
    setGenerating(false);
  }

  async function sendEmailNow() {
    if (!email?.id) return;
    setSending(true);
    try {
      await fetch(`${API}/api/emails/send/${email.id}`, { method: "POST" });
      fetchLeads();
    } catch {}
    setSending(false);
  }

  const s = stats || MOCK_STATS;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: "#0F1117", marginBottom: 4 }}>
          Good morning, Samra 👋
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Leads Today",  value: s.today_leads,  icon: Users,          sub: `${s.total_leads} total`,      color: "#F59E0B" },
          { label: "Emails Sent",  value: s.emails_sent,  icon: Mail,           sub: "this week",                   color: "#3B82F6" },
          { label: "Reply Rate",   value: `${s.reply_rate}%`, icon: TrendingUp, sub: `${s.replied} replied`,        color: "#10B981" },
          { label: "Pipeline",     value: "₹2.4L",        icon: MessageSquare,  sub: "5 warm leads",                color: "#8B5CF6" },
        ].map(({ label, value, icon: Icon, sub, color }) => (
          <div key={label} className="card" style={{ padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} color={color} />
              </div>
            </div>
            <div className="font-display" style={{ fontSize: 30, fontWeight: 700, color: "#0F1117", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Source breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Google Maps", icon: MapPin,    src: "google_maps", color: "#3B82F6", bg: "#DBEAFE" },
          { label: "Instagram",   icon: Instagram, src: "instagram",   color: "#EC4899", bg: "#FCE7F3" },
          { label: "LinkedIn",    icon: Linkedin,  src: "linkedin",    color: "#2563EB", bg: "#DBEAFE" },
        ].map(({ label, icon: Icon, src, color, bg }) => (
          <Link key={src} href={`/leads?source=${src}`} style={{ textDecoration: "none" }}>
            <div className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8EAF0"; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-display" style={{ fontSize: 20, fontWeight: 700, color: "#0F1117" }}>
                  {s.by_source?.[src] || 0}
                </div>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>{label} leads</div>
              </div>
              <ChevronRight size={16} color="#D1D5DB" />
            </div>
          </Link>
        ))}
      </div>

      {/* Analytics Insights */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* Chart 1: Weekly Lead Acquisition (SVG Line graph) */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "#0F1117" }}>Lead Acquisition Trend</h3>
              <p style={{ fontSize: 12, color: "#9CA3AF" }}>Leads captured over the last 7 days</p>
            </div>
            <span style={{ fontSize: 11.5, color: "#10B981", fontWeight: 600, background: "#10B98115", padding: "2px 8px", borderRadius: 4 }}>+24% vs last week</span>
          </div>

          <div style={{ position: "relative" }}>
            <svg viewBox="0 0 500 150" width="100%" height="150" style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              {/* Horizontal grid lines */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1="65" x2="500" y2="65" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4" />

              {/* Area path */}
              <path d="M 0 120 C 40 100, 80 110, 120 70 C 160 30, 200 90, 240 60 C 280 30, 320 40, 360 20 C 400 0, 440 30, 500 10 L 500 150 L 0 150 Z" 
                fill="url(#chart-grad)" />

              {/* Line path */}
              <path d="M 0 120 C 40 100, 80 110, 120 70 C 160 30, 200 90, 240 60 C 280 30, 320 40, 360 20 C 400 0, 440 30, 500 10" 
                fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Interactive nodes */}
              <circle cx="120" cy="70" r="5" fill="#F59E0B" stroke="#FFF" strokeWidth="2" />
              <circle cx="240" cy="60" r="5" fill="#F59E0B" stroke="#FFF" strokeWidth="2" />
              <circle cx="360" cy="20" r="5" fill="#F59E0B" stroke="#FFF" strokeWidth="2" />
              <circle cx="500" cy="10" r="5" fill="#F59E0B" stroke="#FFF" strokeWidth="2" />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Outreach Funnel (Horizontal funnel bars) */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <h3 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "#0F1117", marginBottom: 2 }}>Conversion Funnel</h3>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 18 }}>Your outbound campaign efficiency</p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Leads Found", count: s.total_leads || 248, pct: 100, color: "#3B82F6" },
              { label: "Emails Generated", count: (s.emails_sent + 12) || 103, pct: Math.round(((s.emails_sent + 12) / (s.total_leads || 248)) * 100) || 41, color: "#8B5CF6" },
              { label: "Outreach Sent", count: s.emails_sent || 91, pct: Math.round((s.emails_sent / (s.total_leads || 248)) * 100) || 36, color: "#EC4899" },
              { label: "Replies Received", count: s.replied || 6, pct: s.emails_sent ? Math.round((s.replied / s.emails_sent) * 100) : 6.6, color: "#10B981", isConversion: true },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, color: "#374151" }}>{item.label}</span>
                  <span style={{ color: "#6B7280", fontWeight: 600 }}>{item.count} <span style={{ color: "#9CA3AF", fontWeight: 400, fontSize: 11 }}>({item.pct}% {item.isConversion ? "conv." : "of total"})</span></span>
                </div>
                <div style={{ height: 8, background: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.isConversion ? item.pct * 5 : item.pct}%`, background: item.color, borderRadius: 4, transition: "width 0.8s ease-out" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leads table + email preview */}
      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 20 }}>
        {/* Table */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E8EAF0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 className="font-display" style={{ fontSize: 15, fontWeight: 600 }}>Today's Leads</h2>
            <div style={{ display: "flex", gap: 6 }}>
              {["all","new","email_sent","replied"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "1px solid",
                  borderColor: filter === f ? "#F59E0B" : "#E8EAF0",
                  background:  filter === f ? "#FEF3C7" : "transparent",
                  color:       filter === f ? "#D97706"  : "#9CA3AF",
                  fontWeight:  filter === f ? 600 : 400,
                }}>
                  {f === "all" ? "All" : f === "email_sent" ? "Sent" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Table head */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.9fr 1fr 0.9fr", padding: "10px 20px", background: "#F7F8FA", borderBottom: "1px solid #E8EAF0" }}>
            {["Business","Source","Score","Status","Action"].map(h => (
              <span key={h} style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {leads.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 13.5 }}>
              No leads found today matching this filter.
            </div>
          ) : (
            leads.map((lead: any) => (
              <div key={lead.id} onClick={() => setSelected(lead)}
                style={{
                  display: "grid", gridTemplateColumns: "2fr 1.2fr 0.9fr 1fr 0.9fr",
                  padding: "13px 20px", borderBottom: "1px solid #F0F2F5",
                  cursor: "pointer", alignItems: "center",
                  background: selected?.id === lead.id ? "#FFFBEB" : "#fff",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (selected?.id !== lead.id) (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; }}
                onMouseLeave={e => { if (selected?.id !== lead.id) (e.currentTarget as HTMLElement).style.background = "#fff"; }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "#0F1117" }}>{lead.biz_name}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>{lead.category} · {lead.city}</div>
                </div>
                <div>
                  <span className={`source-${srcClass(lead.source)}`} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {sourceLabel(lead.source)}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: scoreColor(lead.score) }}>{lead.score}</div>
                  <div style={{ height: 3, width: 48, background: "#F0F2F5", borderRadius: 2, marginTop: 4 }}>
                    <div style={{ height: 3, width: `${lead.score}%`, background: scoreColor(lead.score), borderRadius: 2 }} />
                  </div>
                </div>
                <div>
                  <span className={`status-${lead.status?.replace("_sent","").replace("email","sent")}`} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 500 }}>
                    {statusLabel(lead.status)}
                  </span>
                </div>
                <div>
                  <button
                    onClick={e => { e.stopPropagation(); generateEmail(lead); }}
                    className="btn-primary"
                    style={{ padding: "5px 10px", fontSize: 11.5 }}
                  >
                    {lead.status === "new" ? "✉ Generate" : "View"}
                  </button>
                </div>
              </div>
            ))
          )}

          <div style={{ padding: "12px 20px", borderTop: "1px solid #F0F2F5" }}>
            <Link href="/leads" style={{ fontSize: 13, color: "#F59E0B", fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              View all leads <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Email preview drawer */}
        {selected && (
          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 className="font-display" style={{ fontSize: 14, fontWeight: 600 }}>Lead Outreach</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 18 }}>×</button>
            </div>

            <div style={{ background: "#F7F8FA", borderRadius: 8, padding: "12px", marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 13.5, fontWeight: 600, color: "#0F1117" }}>{selected.biz_name}</strong>
                {auditData && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: auditData.score >= 80 ? "#10B98115" : "#F59E0B15", color: auditData.score >= 80 ? "#10B981" : "#D97706", padding: "2px 6px", borderRadius: 4 }}>
                    Score: {auditData.score}/100
                  </span>
                )}
              </div>

              {/* Presence Audit checklist display */}
              <div style={{ borderTop: "1px solid #E8EAF0", borderBottom: "1px solid #E8EAF0", padding: "8px 0", display: "flex", flexDirection: "column", gap: 6 }}>
                {auditLoading ? (
                  <div style={{ fontSize: 11.5, color: "#9CA3AF" }}>Running presence audit check...</div>
                ) : auditData ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {auditData.checklist?.map((item: any, idx: number) => (
                        <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <span style={{ fontSize: 11 }}>{item.status === "fail" ? "❌" : item.status === "warning" ? "⚠️" : "✅"}</span>
                          <div style={{ fontSize: 11, color: "#6B7280" }}>
                            <strong style={{ color: "#374151" }}>{item.label}</strong>: {item.detail}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn-outline"
                      onClick={() => {
                        navigator.clipboard.writeText(auditData.audit_text);
                        setCopiedAudit(true);
                        setTimeout(() => setCopiedAudit(false), 2000);
                      }}
                      style={{ padding: "4px 8px", fontSize: 11, marginTop: 4 }}
                    >
                      {copiedAudit ? "Audit Copied ✓" : "📋 Copy Audit Report"}
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 11.5, color: "#9CA3AF" }}>Presence details unavailable.</div>
                )}
              </div>
              
              {/* Email edit */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4 }}>Email Address</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="email"
                    placeholder="Add email address..."
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    style={{ flex: 1, padding: "5px 8px", fontSize: 12, border: "1px solid #E8EAF0", borderRadius: 6, outline: "none", background: "#fff" }}
                  />
                  <button className="btn-outline" onClick={saveEmail} style={{ padding: "4px 8px", fontSize: 11 }}>Save</button>
                </div>
              </div>

              {/* WhatsApp / Phone details */}
              {selected.phone && (
                <div style={{ borderTop: "1px solid #E8EAF0", paddingTop: 8, marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>📞 {selected.phone}</span>
                    <button
                      className="btn-outline"
                      onClick={generateWhatsAppMsg}
                      disabled={waLoading}
                      style={{ padding: "4px 8px", fontSize: 11.5, background: "#10B98112", color: "#10B981", borderColor: "#10B98133" }}
                    >
                      {waLoading ? "Writing..." : "WhatsApp AI"}
                    </button>
                  </div>

                  {waMessage && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                      <textarea
                        value={waMessage}
                        onChange={e => setWaMessage(e.target.value)}
                        rows={4}
                        style={{ width: "100%", padding: 8, fontSize: 12, border: "1px solid #E8EAF0", borderRadius: 6, outline: "none", resize: "none", background: "#fff", lineHeight: 1.4 }}
                      />
                      <button
                        className="btn-primary"
                        onClick={openWhatsApp}
                        style={{ padding: "6px 0", fontSize: 12, background: "#10B981", borderColor: "#10B981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      >
                        Send on WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {generating ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
                  <div style={{ fontSize: 13, color: "#9CA3AF" }}>Claude is writing your email…</div>
                </div>
              </div>
            ) : email ? (
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>Subject</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0F1117", lineHeight: 1.4 }}>{email.subject}</div>
                </div>
                <div style={{ borderTop: "1px solid #E8EAF0", paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>Body</div>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{email.body}</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                  <button className="btn-primary" onClick={sendEmailNow} disabled={sending || !selected.email}
                    style={{ flex: 1, padding: "9px 0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Send size={14} />
                    {sending ? "Sending…" : "Send Now"}
                  </button>
                  <button className="btn-outline" onClick={() => generateEmail(selected)}
                    style={{ padding: "9px 14px", fontSize: 13 }}>Regenerate</button>
                </div>
                {!selected.email && (
                  <p style={{ fontSize: 11, color: "#EF4444", marginTop: 8, textAlign: "center" }}>⚠ No email found for this lead</p>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Template selector */}
                <div>
                  <label style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.4, display: "block", marginBottom: 6 }}>Outreach Template</label>
                  <select
                    value={template}
                    onChange={e => setTemplate(e.target.value)}
                    style={{ width: "100%", padding: "6px 10px", fontSize: 12.5, border: "1px solid #E8EAF0", borderRadius: 6, background: "#fff", outline: "none", cursor: "pointer", color: "#374151" }}
                  >
                    <option value="direct">Direct Value Pitch</option>
                    <option value="audit">SEO & Visibility Audit</option>
                    <option value="mockup">Free landing page Mockup concept</option>
                    <option value="social_proof">Social proof & Case Study highlights</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✉</div>
                    <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>Click a lead then generate its email</div>
                    <button className="btn-primary" onClick={() => generateEmail(selected)} style={{ padding: "9px 20px", fontSize: 13 }}>
                      Generate Email
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */
function sourceLabel(src: string) {
  return { google_maps: "Maps", instagram: "Instagram", linkedin: "LinkedIn" }[src] || src;
}
function srcClass(src: string) {
  return { google_maps: "maps", instagram: "insta", linkedin: "li" }[src] || "maps";
}
function scoreColor(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#9CA3AF";
}
function statusLabel(s: string) {
  return { new: "New", email_sent: "Sent", replied: "Replied!", skipped: "Skipped" }[s] || s;
}

const MOCK_STATS = { today_leads: 37, total_leads: 248, emails_sent: 91, replied: 6, reply_rate: 6.6, by_source: { google_maps: 18, instagram: 12, linkedin: 7 } };
const MOCK_LEADS = [
  { id: 1, biz_name: "Kapoor Sweets & Bakery", category: "Food & Beverage", city: "Lucknow",  source: "google_maps", score: 92, status: "new",        email: "kapoor@example.com" },
  { id: 2, biz_name: "Sharma Dental Clinic",   category: "Healthcare",      city: "Kanpur",   source: "linkedin",   score: 87, status: "email_sent",  email: "sharma@example.com" },
  { id: 3, biz_name: "Riya's Boutique",        category: "Fashion",         city: "Lucknow",  source: "instagram",  score: 79, status: "replied",     email: "riya@example.com"   },
  { id: 4, biz_name: "Anand Auto Works",       category: "Automotive",      city: "Agra",     source: "google_maps", score: 71, status: "new",        email: null },
  { id: 5, biz_name: "Gupta Travels & Tours",  category: "Travel",          city: "Varanasi", source: "google_maps", score: 65, status: "skipped",    email: "gupta@example.com"  },
];
