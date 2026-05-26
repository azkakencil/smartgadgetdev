import { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "./lib/theme";
import { isLoggedIn, logout, getLoggedName } from "./lib/auth";
import { registerDeviceSession } from "./lib/firebase";
import Dashboard from "./views/Dashboard";
import Editor from "./views/Editor";
import Analytics from "./views/Analytics";
import PublicViewer from "./views/PublicViewer";
import Login from "./views/Login";
import DeviceSessionsModal from "./components/DeviceSessionsModal";
import { SunIcon, MoonIcon } from "./components/Icons";

type AppRoute =
  | { name: "dashboard" }
  | { name: "new" }
  | { name: "edit"; id: string }
  | { name: "analytics"; id: string };

function parseHash(): { isPublic: boolean; route: AppRoute; publicId?: string } {
  const raw = (window.location.hash || "").replace(/^#/, "");
  if (!raw) return { isPublic: false, route: { name: "dashboard" } };
  if (raw === "__new") return { isPublic: false, route: { name: "new" } };
  if (raw.startsWith("__edit/")) return { isPublic: false, route: { name: "edit", id: raw.slice(7) } };
  if (raw.startsWith("__analytics/"))
    return { isPublic: false, route: { name: "analytics", id: raw.slice(12) } };
  return { isPublic: true, publicId: raw, route: { name: "dashboard" } };
}

function setHash(h: string) {
  window.location.hash = h;
}

function LogoutIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function AppInner() {
  const { theme, toggle } = useTheme();
  const [hashState, setHashState] = useState(parseHash());
  const [authed, setAuthed] = useState(isLoggedIn());
  
  // State untuk Hak Akses & Perangkat
  const [userRole, setUserRole] = useState<"admin" | "editor">("editor");
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  const loggedName = getLoggedName();

  useEffect(() => {
    const onHash = () => setHashState(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Registrasi dan pemeriksaan status Banned perangkat
  useEffect(() => {
    if (authed) {
      registerDeviceSession(loggedName).then((status) => {
        if (status.banned) {
          alert("Akses Ditolak: Perangkat ini telah diblokir secara permanen oleh Admin.");
          logout();
          setAuthed(false);
        } else {
          setUserRole(status.role);
        }
      });
    }
  }, [authed, loggedName]);

  // Halaman Publik: Siapapun bisa melihat tanpa otentikasi
  if (hashState.isPublic && hashState.publicId) {
    return (
      <PublicViewer
        id={hashState.publicId}
        onBackToApp={() => setHash("")}
      />
    );
  }

  // Lapisan Keamanan: Jika belum lolos 3 lapis, arahkan ke Login
  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  const route = hashState.route;

  function handleLogout() {
    if (!confirm("Keluar dari sesi terlindungi ini?")) return;
    logout();
    setAuthed(false);
    setHash("");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 px-4 sm:px-6 py-3" style={{ backdropFilter: "blur(12px)" }}>
        <div className="max-w-6xl mx-auto glass px-4 py-2.5 flex items-center justify-between gap-3">
          <button
            className="flex items-center gap-2 font-semibold text-base hover:opacity-80 transition-opacity"
            onClick={() => setHash("")}
          >
            <span
              className="w-7 h-7 rounded-lg grid place-items-center font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            >
              ◆
            </span>
            GlassDeploy
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tombol Nama Pengguna (Mengklik ini akan membuka daftar perangkat) */}
            <button
              onClick={() => setShowDeviceModal(true)}
              className="flex items-center gap-1.5 text-xs text-secondary px-3 py-1.5 rounded-full transition-all hover:scale-105 cursor-pointer"
              style={{
                background: "var(--input-bg)",
                border: userRole === "admin" ? "1px solid var(--accent)" : "1px solid var(--input-border)",
              }}
              title="Klik untuk melihat daftar perangkat terhubung"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: userRole === "admin" ? "var(--accent)" : "var(--text-secondary)" }}
              />
              <span className="font-medium truncate max-w-[130px]">{loggedName}</span>
              <span className="text-[9px] uppercase opacity-60 font-bold ml-0.5">
                [{userRole}]
              </span>
            </button>

            <button className="btn-icon" onClick={toggle} title="Ganti Tema">
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>

            <button className="btn-icon text-danger" onClick={handleLogout} title="Keluar">
              <LogoutIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {route.name === "dashboard" && (
          <Dashboard
            onNew={() => setHash("__new")}
            onEdit={(id) => setHash(`__edit/${id}`)}
            onAnalytics={(id) => setHash(`__analytics/${id}`)}
            onView={(id) => setHash(id)}
          />
        )}
        {route.name === "new" && (
          <Editor
            editId={null}
            onBack={() => setHash("")}
            onDeployed={(id) => setHash(`__analytics/${id}`)}
          />
        )}
        {route.name === "edit" && (
          <Editor
            editId={route.id}
            onBack={() => setHash("")}
            onDeployed={(id) => setHash(`__analytics/${id}`)}
          />
        )}
        {route.name === "analytics" && (
          <Analytics
            id={route.id}
            onBack={() => setHash("")}
            onView={(id) => setHash(id)}
          />
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-muted w-full">
        GlassDeploy · HTML hosting sederhana dengan analitik bawaan
      </footer>

      {/* Modal Daftar Perangkat */}
      {showDeviceModal && (
        <DeviceSessionsModal
          currentRole={userRole}
          onClose={() => setShowDeviceModal(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
