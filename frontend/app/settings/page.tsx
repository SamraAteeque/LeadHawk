"use client";
import { useEffect, useState } from "react";
import { Save, Plus, X, Key, User, Mail, Globe, MapPin, Tag, Clock, Send, Linkedin, Instagram, Zap } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SettingsPage() {
  const [form,    setForm]    = useState<any>(DEFAULT_SETTINGS);
  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [catInput,  setCatInput]  = useState("");

  useEffect(() => {
    fetch(`${API}/api/settings/`).then(r => r.json()).then(d => setForm(d)).catch(() => {});
  }, []);

  async function save() {
    setLoading(true);
    try {
      await fetch(`${API}/api/settings/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setLoading(false);
  }

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const addCity = () => {
    if (cityInput.trim() && !form.target_cities.includes(cityInput.trim())) {
      set("target_cities", [...form.target_cities, cityInput.trim()]);
      setCityInput("");
    }
  };
  const removeCity = (c: string) => set("target_cities", form.target_cities.filter((x: string) => x !== c));

  const addCat = () => {
    if (catInput.trim() && !form.target_categories.includes(catInput.trim())) {
      set("target_categories", [...form.target_categories, catInput.trim()]);
      setCatInput("");
    }
  };
  const removeCat = (c: string) => set("target_categories", form.target_categories.filter((x: string) => x !== c));

  return (
    <div style={{ padding: "28px 32px", maxWidth: 780 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: "#0F1117" }}>Settings</h1>
          <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Configure your LeadHawk AI agent</p>
        </div>
        <button className="btn-primary" onClick={save} disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", fontSize: 14 }}>
          <Save size={15} />
          {saved ? "Saved ✓" : loading ? "Saving…" : "Save Settings"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Your Profile */}
        <Section icon={<User size={16} />} title="Your Profile" subtitle="Used in AI-generated cold emails">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Your Name">
              <input value={form.your_name || ""} onChange={e => set("your_name", e.target.value)} style={inputStyle} placeholder="Samra Ateeque" />
            </Field>
            <Field label="Your Email">
              <input value={form.your_email || ""} onChange={e => set("your_email", e.target.value)} style={inputStyle} placeholder="samra@samrateq.com" type="email" />
            </Field>
            <Field label="Portfolio / Website" full>
              <input value={form.your_portfolio || ""} onChange={e => set("your_portfolio", e.target.value)} style={inputStyle} placeholder="samrateq.com" />
            </Field>
          </div>
        </Section>

        {/* Target Cities */}
        <Section icon={<MapPin size={16} />} title="Target Cities" subtitle="Agent will scrape leads from these cities">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {form.target_cities?.map((c: string) => (
              <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "#FEF3C7", color: "#D97706", borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
                {c}
                <button onClick={() => removeCity(c)} style={{ background: "none", border: "none", cursor: "pointer", color: "#D97706", padding: 0, display: "flex" }}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={cityInput} onChange={e => setCityInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addCity()}
              placeholder="Add city (e.g. Jaipur)…" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addCity} className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13 }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </Section>

        {/* Target Categories */}
        <Section icon={<Tag size={16} />} title="Business Categories" subtitle="Types of businesses to target">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {form.target_categories?.map((c: string) => (
              <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: "#F0F2F5", color: "#374151", borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
                {c}
                <button onClick={() => removeCat(c)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 0, display: "flex" }}><X size={12} /></button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={catInput} onChange={e => setCatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addCat()}
              placeholder="Add category (e.g. gyms)…" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addCat} className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13 }}>
              <Plus size={14} /> Add
            </button>
          </div>
        </Section>

        {/* Agent config */}
        <Section icon={<Clock size={16} />} title="Agent Schedule" subtitle="When and how many leads to process daily">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label="Daily Run Time">
              <input type="time" value={form.run_time || "08:00"} onChange={e => set("run_time", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Min Score to Email">
              <input type="number" min={0} max={100} value={form.min_score || 60} onChange={e => set("min_score", +e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Daily Email Limit">
              <input type="number" min={1} max={200} value={form.daily_email_limit || 30} onChange={e => set("daily_email_limit", +e.target.value)} style={inputStyle} />
            </Field>
          </div>
        </Section>

        {/* API Keys */}
        <Section icon={<Key size={16} />} title="API Keys" subtitle="Required for AI email generation and sending">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Anthropic API Key (for Claude)">
              <input type="password" value={form.anthropic_api_key || ""} onChange={e => set("anthropic_api_key", e.target.value)}
                style={inputStyle} placeholder="sk-ant-api03-…" />
            </Field>
          </div>
        </Section>

        {/* AI Custom Preamble */}
        <Section icon={<Zap size={16} />} title="AI Voice & Custom Prompting" subtitle="Tailor the style, language, and custom tone of your outreach pitches">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Custom Outreach Instructions">
              <textarea
                value={form.custom_prompt || ""}
                onChange={e => set("custom_prompt", e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: "vertical", height: "auto" }}
                placeholder="e.g. Write in a warm, conversational style. Keep emails ultra-short. Mention that I live nearby and build high-speed, SEO-focused landing pages."
              />
            </Field>
          </div>
        </Section>

        {/* Gmail */}
        <Section icon={<Mail size={16} />} title="Gmail (Email Sender)" subtitle="Used to send cold emails automatically">
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#92400E", lineHeight: 1.6 }}>
            💡 <strong>Gmail App Password setup:</strong> myaccount.google.com → Security → 2-Step Verification ON → Search "App Passwords" → Create → Copy 16-char password
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Gmail Address">
              <input value={form.gmail_user || ""} onChange={e => set("gmail_user", e.target.value)}
                style={inputStyle} placeholder="your@gmail.com" type="email" />
            </Field>
            <Field label="App Password (16 chars)">
              <input type="password" value={form.gmail_app_password || ""} onChange={e => set("gmail_app_password", e.target.value)}
                style={inputStyle} placeholder="xxxx xxxx xxxx xxxx" />
            </Field>
          </div>
        </Section>

        {/* LinkedIn */}
        <Section icon={<Linkedin size={16} />} title="LinkedIn (Optional)" subtitle="For scraping LinkedIn company pages">
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#1E40AF", lineHeight: 1.6 }}>
            ⚠ Use a secondary LinkedIn account — scraping may flag your primary account.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="LinkedIn Email">
              <input value={form.linkedin_email || ""} onChange={e => set("linkedin_email", e.target.value)}
                style={inputStyle} placeholder="linkedin@email.com" type="email" />
            </Field>
            <Field label="LinkedIn Password">
              <input type="password" value={form.linkedin_password || ""} onChange={e => set("linkedin_password", e.target.value)}
                style={inputStyle} placeholder="password" />
            </Field>
          </div>
        </Section>

      </div>

      <div style={{ paddingTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn-primary" onClick={save} disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 28px", fontSize: 14 }}>
          <Save size={15} />
          {saved ? "Saved ✓" : loading ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, subtitle, children }: any) {
  return (
    <div className="card" style={{ padding: "22px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ color: "#F59E0B" }}>{icon}</div>
        <h2 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "#0F1117" }}>{title}</h2>
      </div>
      <p style={{ fontSize: 12.5, color: "#9CA3AF", marginBottom: 18, paddingLeft: 26 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function Field({ label, children, full }: any) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid #E8EAF0", borderRadius: 8,
  fontSize: 13.5, color: "#0F1117", background: "#FAFAFA",
  outline: "none", fontFamily: "Inter, sans-serif",
};

const DEFAULT_SETTINGS = {
  your_name: "Samra Ateeque", your_email: "", your_portfolio: "samrateq.com",
  target_cities: ["Lucknow", "Kanpur", "Agra", "Varanasi"],
  target_categories: ["restaurants", "clinics", "boutiques", "salons"],
  min_score: 60, daily_email_limit: 30, run_time: "08:00",
  anthropic_api_key: "", gmail_user: "", gmail_app_password: "",
  linkedin_email: "", linkedin_password: "", custom_prompt: "",
};
