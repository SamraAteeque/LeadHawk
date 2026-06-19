"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Filter, Download, MapPin, Instagram, Linkedin } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function LeadsContent() {
  const params   = useSearchParams();
  const srcParam = params.get("source") || "";

  const [leads,    setLeads]    = useState<any[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [source,   setSource]   = useState(srcParam);
  const [status,   setStatus]   = useState("");
  const [city,     setCity]     = useState("");
  const [page,     setPage]     = useState(0);
  const [selected, setSelected] = useState<any>(null);
  const [genEmail, setGenEmail] = useState<any>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [waMessage, setWaMessage]   = useState("");
  const [waLoading, setWaLoading]   = useState(false);
  const [auditData, setAuditData]   = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [template, setTemplate]         = useState("direct");
  const [copiedAudit, setCopiedAudit]   = useState(false);
  const [sending, setSending]           = useState(false);
  const LIMIT = 15;


  useEffect(() => {
    if (selected) {
      setEmailInput(selected.email || "");
      setWaMessage("");
      fetchAudit(selected.id);
      window.dispatchEvent(new CustomEvent('lead-selected', { detail: selected }));
    } else {
      window.dispatchEvent(new CustomEvent('lead-selected', { detail: null }));
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

  useEffect(() => { fetchLeads(); }, [source, status, city, page]);

  async function fetchLeads() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (source) q.set("source", source);
      if (status) q.set("status", status);
      if (city)   q.set("city", city);
      q.set("limit",  String(LIMIT));
      q.set("offset", String(page * LIMIT));
      const r = await fetch(`${API}/api/leads?${q}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setLeads(d.leads || []);
      setTotal(d.total || 0);
    } catch {
      // Local filtering of MOCK_LEADS if backend is down or unreachable
      let filteredMock = MOCK_LEADS;
      if (source) filteredMock = filteredMock.filter(l => l.source === source);
      if (status) filteredMock = filteredMock.filter(l => l.status === status);
      if (city)   filteredMock = filteredMock.filter(l => l.city?.toLowerCase().includes(city.toLowerCase()));
      setLeads(filteredMock);
      setTotal(filteredMock.length);
    }
    setLoading(false);
  }

  async function generateEmail(lead: any, activeTemplate?: string) {
    const t = activeTemplate || template;
    setSelected(lead);
    setGenEmail(null);
    setGenLoading(true);
    try {
      const r = await fetch(`${API}/api/emails/generate/${lead.id}?template=${t}`, { method: "POST" });
      setGenEmail(await r.json());
    } catch {
      setGenEmail({
        subject: `${lead.biz_name} — let's get you online`,
        body: `Hi,\n\nI found ${lead.biz_name} on ${sourceLabel(lead.source)} and noticed there's no website yet.\n\nI'm Samra, a web developer from Lucknow. I build clean, fast websites for local businesses that help them show up on Google.\n\nWould a quick chat work this week?\n\n— Samra\nsamrateq.com`,
      });
    }
    setGenLoading(false);
  }

  async function sendEmailNow() {
    if (!genEmail?.id) return;
    setSending(true);
    try {
      await fetch(`${API}/api/emails/send/${genEmail.id}`, { method: "POST" });
      fetchLeads();
    } catch {}
    setSending(false);
  }

  async function skipLead(id: number) {
    try {
      await fetch(`${API}/api/leads/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "skipped" }),
      });
      fetchLeads();
    } catch {}
  }

  const filtered = leads.filter(l =>
    !search || l.biz_name?.toLowerCase().includes(search.toLowerCase()) || l.city?.toLowerCase().includes(search.toLowerCase())
  );

  const pages = Math.ceil(total / LIMIT);

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: "#0F1117" }}>All Leads</h1>
          <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{total} businesses found without websites</p>
        </div>
        <button className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "14px 16px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search business or city…"
            style={{
              width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              border: "1px solid #E8EAF0", borderRadius: 8, fontSize: 13, color: "#0F1117",
              background: "#F7F8FA", outline: "none",
            }}
          />
        </div>

        {/* Source filter */}
        <select value={source} onChange={e => { setSource(e.target.value); setPage(0); }}
          style={{ padding: "8px 12px", border: "1px solid #E8EAF0", borderRadius: 8, fontSize: 13, background: "#F7F8FA", color: "#374151", cursor: "pointer" }}>
          <option value="">All Sources</option>
          <option value="google_maps">Google Maps</option>
          <option value="instagram">Instagram</option>
          <option value="linkedin">LinkedIn</option>
        </select>

        {/* Status filter */}
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}
          style={{ padding: "8px 12px", border: "1px solid #E8EAF0", borderRadius: 8, fontSize: 13, background: "#F7F8FA", color: "#374151", cursor: "pointer" }}>
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="email_sent">Email Sent</option>
          <option value="replied">Replied</option>
          <option value="skipped">Skipped</option>
        </select>

        {/* City filter */}
        <input
          value={city} onChange={e => { setCity(e.target.value); setPage(0); }}
          placeholder="Filter by city…"
          style={{ padding: "8px 12px", border: "1px solid #E8EAF0", borderRadius: 8, fontSize: 13, background: "#F7F8FA", color: "#374151", outline: "none", width: 150 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap: 20 }}>
        {/* Table */}
        <div className="card" style={{ overflow: "hidden" }}>
          {/* Head */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.1fr 1fr 1fr 0.8fr 1.2fr", padding: "10px 20px", background: "#F7F8FA", borderBottom: "1px solid #E8EAF0" }}>
            {["Business","Source","City","Score","Status","Actions"].map(h => (
              <span key={h} style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>Loading leads…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🦅</div>
              <div style={{ fontSize: 14, color: "#9CA3AF" }}>No leads found. Run the agent to get started.</div>
            </div>
          ) : filtered.map((lead: any) => (
            <div key={lead.id}
              onClick={() => setSelected(selected?.id === lead.id ? null : lead)}
              style={{
                display: "grid", gridTemplateColumns: "2fr 1.1fr 1fr 1fr 0.8fr 1.2fr",
                padding: "12px 20px", borderBottom: "1px solid #F0F2F5",
                cursor: "pointer", alignItems: "center",
                background: selected?.id === lead.id ? "#FFFBEB" : "#fff",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => { if (selected?.id !== lead.id) (e.currentTarget as HTMLElement).style.background = "#FAFAFA"; }}
              onMouseLeave={e => { if (selected?.id !== lead.id) (e.currentTarget as HTMLElement).style.background = "#fff"; }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "#0F1117" }}>{lead.biz_name}</div>
                <div style={{ fontSize: 11.5, color: "#9CA3AF" }}>{lead.category}</div>
              </div>
              <div>
                <span style={{
                  fontSize: 11, padding: "3px 8px", borderRadius: 5, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4,
                  ...(lead.source === "google_maps" ? { background: "#DBEAFE", color: "#1D4ED8" } :
                      lead.source === "instagram"   ? { background: "#FCE7F3", color: "#BE185D" } :
                                                      { background: "#DBEAFE", color: "#1E40AF" })
                }}>
                  {lead.source === "google_maps" && <MapPin size={10} />}
                  {lead.source === "instagram"   && <Instagram size={10} />}
                  {lead.source === "linkedin"    && <Linkedin size={10} />}
                  {sourceLabel(lead.source)}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#374151" }}>{lead.city}</div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor(lead.score) }}>{lead.score}</span>
                <div style={{ height: 3, width: 44, background: "#F0F2F5", borderRadius: 2, marginTop: 4 }}>
                  <div style={{ height: 3, width: `${lead.score}%`, background: scoreColor(lead.score), borderRadius: 2 }} />
                </div>
              </div>
              <div>
                <span className={`status-${statusClass(lead.status)}`} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, fontWeight: 500 }}>
                  {statusLabel(lead.status)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                <button className="btn-primary" onClick={() => generateEmail(lead)}
                  style={{ padding: "5px 10px", fontSize: 11.5 }}>✉ Email</button>
                <button className="btn-outline" onClick={() => skipLead(lead.id)}
                  style={{ padding: "5px 8px", fontSize: 11.5 }}>Skip</button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid #F0F2F5", display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-outline" onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}
                style={{ padding: "5px 12px", fontSize: 12, opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>Page {page+1} of {pages}</span>
              <button className="btn-outline" onClick={() => setPage(p => Math.min(pages-1, p+1))} disabled={page >= pages-1}
                style={{ padding: "5px 12px", fontSize: 12, opacity: page >= pages-1 ? 0.4 : 1 }}>Next →</button>
            </div>
          )}
        </div>

        {/* Email sidebar */}
        {selected && (
          <div className="card" style={{ padding: 20, alignSelf: "start", position: "sticky", top: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="font-display" style={{ fontSize: 14, fontWeight: 600 }}>Lead Outreach</h3>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 18, lineHeight: 1 }}>×</button>
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

            {genLoading ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>🤖 Claude is writing…</div>
            ) : genEmail ? (
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>Subject</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0F1117", lineHeight: 1.4 }}>{genEmail.subject}</div>
                </div>
                <div style={{ borderTop: "1px solid #E8EAF0", paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>Body</div>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{genEmail.body}</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                  <button className="btn-primary" onClick={sendEmailNow} disabled={sending || !selected.email}
                    style={{ flex: 1, padding: "9px 0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
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

export default function LeadsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#9CA3AF" }}>Loading…</div>}>
      <LeadsContent />
    </Suspense>
  );
}

/* ── Helpers ── */
function sourceLabel(src: string) {
  return { google_maps: "Maps", instagram: "Instagram", linkedin: "LinkedIn" }[src] || src;
}
function scoreColor(score: number) {
  if (score >= 80) return "#10B981"; if (score >= 60) return "#F59E0B"; return "#9CA3AF";
}
function statusClass(s: string) {
  return { new: "new", email_sent: "sent", replied: "replied", skipped: "skipped" }[s] || "new";
}
function statusLabel(s: string) {
  return { new: "New", email_sent: "Sent", replied: "Replied!", skipped: "Skipped" }[s] || s;
}

const MOCK_LEADS = [
  { id: 1, biz_name: "Kapoor Sweets & Bakery", category: "Food & Beverage", city: "Lucknow",  source: "google_maps", score: 92, status: "new",       email: "kapoor@example.com" },
  { id: 2, biz_name: "Sharma Dental Clinic",   category: "Healthcare",      city: "Kanpur",   source: "linkedin",   score: 87, status: "email_sent", email: "sharma@example.com" },
  { id: 3, biz_name: "Riya's Boutique",        category: "Fashion",         city: "Lucknow",  source: "instagram",  score: 79, status: "replied",    email: "riya@example.com" },
  { id: 4, biz_name: "Anand Auto Works",       category: "Automotive",      city: "Agra",     source: "google_maps", score: 71, status: "new",       email: null },
  { id: 5, biz_name: "Gupta Travels & Tours",  category: "Travel",          city: "Varanasi", source: "google_maps", score: 65, status: "skipped",   email: "gupta@example.com" },
  { id: 6, biz_name: "Meena Saree Center",     category: "Fashion",         city: "Lucknow",  source: "instagram",  score: 83, status: "new",        email: "meena@example.com" },
  { id: 7, biz_name: "Singh Photography",      category: "Photography",     city: "Agra",     source: "instagram",  score: 76, status: "new",        email: "singh@example.com" },
  { id: 8, biz_name: "Patel Catering Services",category: "Food & Beverage", city: "Kanpur",   source: "linkedin",   score: 69, status: "email_sent", email: "patel@example.com" },
];
