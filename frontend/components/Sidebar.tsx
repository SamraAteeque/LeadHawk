"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Mail, Settings,
  MapPin, Instagram, Linkedin, Zap, BarChart2
} from "lucide-react";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const navMain = [
  { href: "/",        icon: LayoutDashboard, label: "Dashboard"  },
  { href: "/leads",   icon: Users,           label: "All Leads"  },
  { href: "/emails",  icon: Mail,            label: "Emails"     },
];

const navSources = [
  { href: "/leads?source=google_maps", icon: MapPin,    label: "Google Maps" },
  { href: "/leads?source=instagram",   icon: Instagram, label: "Instagram"   },
  { href: "/leads?source=linkedin",    icon: Linkedin,  label: "LinkedIn"    },
];

export default function Sidebar() {
  const path = usePathname();
  const [agentStatus, setAgentStatus] = useState<"running"|"done"|"failed"|"never_run">("never_run");
  const [running, setRunning]         = useState(false);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, []);

  async function fetchStatus() {
    try {
      const r = await fetch(`${API}/api/agent/status`);
      const d = await r.json();
      setAgentStatus(d.status);
    } catch {}
  }

  async function triggerAgent() {
    setRunning(true);
    try {
      await fetch(`${API}/api/agent/run`, { method: "POST" });
      setTimeout(fetchStatus, 1000);
    } catch {}
    setTimeout(() => setRunning(false), 3000);
  }

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href.split("?")[0]);

  return (
    <aside style={{
      width: 230,
      minHeight: "100vh",
      background: "#fff",
      borderRight: "1px solid #E8EAF0",
      display: "flex",
      flexDirection: "column",
      padding: "20px 0",
      flexShrink: 0,
      position: "sticky",
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "0 20px 28px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34,
          background: "linear-gradient(135deg,#F59E0B,#D97706)",
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
        }}>🦅</div>
        <span className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "#0F1117", letterSpacing: -0.4 }}>
          Lead<span style={{ color: "#F59E0B" }}>Hawk</span>
        </span>
      </div>

      {/* Main nav */}
      <div style={{ padding: "0 12px", marginBottom: 8 }}>
        <p style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase", padding: "0 8px", marginBottom: 6 }}>Menu</p>
        {navMain.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div className={isActive(href) ? "nav-active" : "nav-item-sidebar"} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8, marginBottom: 1,
              cursor: "pointer", fontSize: 13.5,
              fontWeight: isActive(href) ? 600 : 400,
              background: isActive(href) ? "#FEF3C7" : "transparent",
              color: isActive(href) ? "#D97706" : "#6B7280",
              transition: "all 0.15s",
            }}>
              <Icon size={16} strokeWidth={isActive(href) ? 2.2 : 1.8} />
              {label}
            </div>
          </Link>
        ))}
      </div>

      {/* Sources nav */}
      <div style={{ padding: "0 12px", marginTop: 16, marginBottom: 8 }}>
        <p style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase", padding: "0 8px", marginBottom: 6 }}>Sources</p>
        {navSources.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 10px", borderRadius: 8, marginBottom: 1,
              cursor: "pointer", fontSize: 13, color: "#6B7280",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F7F8FA")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </div>
          </Link>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Settings */}
      <div style={{ padding: "0 12px", marginBottom: 14 }}>
        <Link href="/settings" style={{ textDecoration: "none" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "7px 10px", borderRadius: 8,
            cursor: "pointer", fontSize: 13.5, color: "#6B7280",
            background: path === "/settings" ? "#FEF3C7" : "transparent",
            transition: "all 0.15s",
          }}>
            <Settings size={16} strokeWidth={1.8} />
            Settings
          </div>
        </Link>
      </div>

      {/* Agent pulse card */}
      <div style={{
        margin: "0 12px",
        background: agentStatus === "running" ? "#FEF3C7" : "#F7F8FA",
        border: `1px solid ${agentStatus === "running" ? "#FDE68A" : "#E8EAF0"}`,
        borderRadius: 10,
        padding: "14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: agentStatus === "running" ? "#10B981" : agentStatus === "done" ? "#10B981" : "#9CA3AF",
            display: "inline-block",
            animation: agentStatus === "running" ? "pulse 2s infinite" : "none",
            boxShadow: agentStatus === "running" ? "0 0 0 3px rgba(16,185,129,0.2)" : "none",
          }} />
          <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: "#0F1117" }}>
            {agentStatus === "running" ? "Agent running…" : agentStatus === "done" ? "Agent ready" : "Agent idle"}
          </span>
        </div>
        <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12 }}>
          {agentStatus === "running" ? "Scraping leads now…" : "Runs daily at 8:00 AM"}
        </p>
        <button
          onClick={triggerAgent}
          disabled={running || agentStatus === "running"}
          className="btn-primary"
          style={{ width: "100%", padding: "8px 0", fontSize: 12.5, opacity: (running || agentStatus === "running") ? 0.6 : 1 }}
        >
          {running ? "Starting…" : "Run Agent Now"}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; }
          50% { opacity:0.5; }
        }
      `}</style>
    </aside>
  );
}
