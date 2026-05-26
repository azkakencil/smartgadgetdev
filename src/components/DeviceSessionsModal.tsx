import { useEffect, useState } from "react";
import {
  listDeviceSessions,
  setDeviceBanStatus,
  clearAllDeviceSessions,
  getDeviceSessionId,
  type DeviceSession,
} from "../lib/firebase";
import { CloseIcon, TrashIcon } from "./Icons";

interface Props {
  currentRole: "admin" | "editor";
  onClose: () => void;
}

export default function DeviceSessionsModal({ currentRole, onClose }: Props) {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const currentSessionId = getDeviceSessionId();
  const isAdmin = currentRole === "admin";

  async function fetchSessions() {
    setLoading(true);
    const list = await listDeviceSessions();

    const sortedForDisplay = [...list].sort((a, b) => b.lastActive - a.lastActive);
    setSessions(sortedForDisplay);
    setLoading(false);
  }

  useEffect(() => {
    fetchSessions();
  }, []);

  // Tentukan urutan perangkat dari yang paling awal mendaftar
  const chronologicalSessions = [...sessions].sort((a, b) => {
    const timeA = a.createdAt || a.lastActive;
    const timeB = b.createdAt || b.lastActive;
    return timeA - timeB;
  });

  // ATURAN: Ambil ID dari 2 perangkat pertama saja
  const firstTwoDeviceIds = chronologicalSessions.slice(0, 2).map((s) => s.id);

  // Wewenang Ban hanya dimiliki oleh 2 perangkat pertama yang langsung menjadi Admin
  const hasBanAuthority = isAdmin && firstTwoDeviceIds.includes(currentSessionId);

  async function handleToggleBan(session: DeviceSession) {
    if (!hasBanAuthority) return;
    if (session.id === currentSessionId) {
      alert("Anda tidak dapat memblokir perangkat yang sedang Anda gunakan sendiri.");
      return;
    }

    const action = session.banned ? "membuka blokir (Unban)" : "memblokir (Ban)";
    if (!confirm(`Apakah Anda yakin ingin ${action} perangkat "${session.deviceName}"?`)) return;

    setProcessingId(session.id);
    try {
      await setDeviceBanStatus(session.id, !session.banned);
      await fetchSessions();
    } catch (e) {
      alert("Gagal mengubah status blokir perangkat.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleClearAll() {
    if (!hasBanAuthority) return;
    if (!confirm("PERINGATAN: Apakah Anda yakin ingin menghapus SELURUH data perangkat yang terdaftar? Ini akan mereset sistem, dan 2 perangkat yang login berikutnya akan langsung menjadi Admin baru!")) return;

    try {
      await clearAllDeviceSessions();
      alert("Seluruh sesi perangkat berhasil dihapus. Halaman akan dimuat ulang untuk mendaftarkan ulang sesi Anda sebagai Admin pertama!");
      window.location.reload();
    } catch (e) {
      alert("Gagal menghapus data perangkat.");
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Daftar Perangkat Terhubung</h2>
            <p className="text-xs text-secondary mt-1">
              Hanya menampilkan nama seri perangkat yang telah masuk ke web deploy GlassDeploy.
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Tutup">
            <CloseIcon />
          </button>
        </div>

        <div className="glass p-3.5 mb-4 text-xs text-secondary flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            Status Wewenang Ban:{" "}
            <span
              className={`font-semibold px-2.5 py-1 rounded-md inline-block mt-1 sm:mt-0 ${
                hasBanAuthority ? "text-accent-text" : "text-secondary"
              }`}
              style={{
                background: hasBanAuthority ? "var(--accent)" : "var(--hover-bg)",
              }}
            >
              {hasBanAuthority ? "Diizinkan (2 Perangkat Pertama)" : "Tidak Memiliki Hak Ban"}
            </span>
          </div>

          {hasBanAuthority && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-xs text-danger hover:bg-red-500/10 px-2.5 py-1 rounded-lg transition-all border border-red-500/20 cursor-pointer self-start sm:self-auto"
              title="Hapus dan reset seluruh perangkat yang terdaftar"
            >
              <TrashIcon size={14} /> Reset Semua Perangkat
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="text-center py-12 text-secondary text-sm">Memuat daftar perangkat...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-secondary text-sm">Belum ada sesi perangkat yang terekam.</div>
          ) : (
            <div className="space-y-2.5">
              {sessions.map((s) => {
                const isCurrent = s.id === currentSessionId;
                const isProcessing = processingId === s.id;
                const isOneOfFirstTwo = firstTwoDeviceIds.includes(s.id);

                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between gap-3 p-4 rounded-xl transition-all ${
                      s.banned ? "opacity-60" : ""
                    }`}
                    style={{
                      background: "var(--input-bg)",
                      border: isCurrent
                        ? "2px solid var(--accent)"
                        : "1px solid var(--input-border)",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* HANYA NAMA SERI DEVICE */}
                        <span className="font-semibold text-base text-primary">
                          {s.deviceName}
                        </span>

                        {isCurrent && (
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                          >
                            Perangkat Anda
                          </span>
                        )}

                        {isOneOfFirstTwo && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase">
                            Pioneer
                          </span>
                        )}

                        {s.role === "admin" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Admin
                          </span>
                        )}

                        {s.banned && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            Banned
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-secondary mt-1.5 flex items-center gap-3 flex-wrap">
                        <span>Pengguna: <strong>{s.name}</strong></span>
                        <span className="text-muted">•</span>
                        <span>Aktif: {new Date(s.lastActive).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {hasBanAuthority && !isCurrent && (
                      <div>
                        <button
                          onClick={() => handleToggleBan(s)}
                          disabled={isProcessing}
                          className={`text-xs font-medium px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                            s.banned
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/20"
                              : "bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20"
                          }`}
                        >
                          {isProcessing ? "Memproses..." : s.banned ? "Unban" : "Ban"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t text-[11px] text-muted text-center" style={{ borderColor: "var(--input-border)" }}>
          Sistem otomatis mengamankan urutan login. Hanya 2 perangkat pertama yang diberikan wewenang penuh untuk memblokir.
        </div>
      </div>
    </div>
  );
}
