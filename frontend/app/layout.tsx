import "./globals.css";
import Sidebar from "@/components/Sidebar";
import CopilotWidget from "@/components/CopilotWidget";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>LeadHawk AI</title>
        <meta name="description" content="Autonomous lead generation for freelance developers" />
      </head>
      <body>
        <div className="layout-wrapper" style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <main className="layout-main" style={{ flex: 1, minHeight: "100vh", overflowY: "auto" }}>
            {children}
          </main>
        </div>
        <CopilotWidget />
      </body>
    </html>
  );
}
