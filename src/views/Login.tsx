import { useState } from "react";
import { tryLogin, type AuthAnswers } from "../lib/auth";
import { checkIfDeviceIsBanned } from "../lib/firebase";
import { useTheme } from "../lib/theme";
import { SunIcon, MoonIcon, ArrowLeftIcon } from "../components/Icons";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const { theme, toggle } = useTheme();

  // Multi-step security layers
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (step === 1) {
      if (!day || !month || !year) {
        setError("Lengkapi tanggal, bulan, dan tahun terlebih dahulu.");
        return;
      }
      // Validasi cepat di step 1 untuk kenyamanan, atau biarkan di akhir
      if (parseInt(day) !== 28 || parseInt(month) !== 6 || parseInt(year) !== 2013) {
        setError("Tanggal lahir yang Anda masukkan tidak terdaftar pada sistem.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!code) {
        setError("Masukkan kode akses terlebih dahulu.");
        return;
      }
      if (code.trim() !== "SMARTGADGET12345") {
        setError("Kode akses salah. Periksa kembali huruf besar/kecil.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!name) {
        setError("Masukkan nama verifikasi Anda.");
        return;
      }

      setLoading(true);
      checkIfDeviceIsBanned().then((isBanned) => {
        if (isBanned) {
          setError("Akses Ditolak: Perangkat Anda telah diblokir secara permanen oleh Admin.");
          setLoading(false);
          return;
        }

        setTimeout(() => {
          const answers: AuthAnswers = { day, month, year, code, name };
          const res = tryLogin(answers, remember);

          if (res.success) {
            onSuccess();
          } else {
            setError(res.error || "Gagal memverifikasi akses.");
            setLoading(false);
          }
        }, 300);
      }).catch(() => {
        setError("Gagal memverifikasi status perangkat.");
        setLoading(false);
      });
    }
  }

  function handleBack() {
    setError("");
    if (step > 1) setStep((s) => (s - 1) as any);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <button className="btn-icon absolute top-4 right-4" onClick={toggle} title="Ganti Tema">
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="glass p-8 w-full max-w-md transition-all">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <span
            className="w-10 h-10 rounded-xl grid place-items-center text-lg font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            ◆
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">GlassDeploy</h1>
            <p className="text-xs text-secondary">HTML deploy & analytics</p>
          </div>
        </div>

        {/* Progress Indikator Lapisan */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex-1 flex flex-col gap-1">
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  background:
                    step >= num ? "var(--accent)" : "var(--input-border)",
                  opacity: step >= num ? 1 : 0.4,
                }}
              />
              <span className={`text-[10px] text-center ${step === num ? "font-semibold" : "text-secondary"}`}>
                Lapis {num}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Tanggal Lahir */}
        {step === 1 && (
          <form onSubmit={handleNext} className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-semibold mb-1">Otentikasi Keamanan</h2>
              <p className="text-xs text-secondary">
                Lapisan 1: Masukkan tanggal, bulan, dan tahun otorisasi.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-secondary mb-1">Hari</label>
                <input
                  type="number"
                  className="glass-input text-center"
                  placeholder="dd"
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    setError("");
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] text-secondary mb-1">Bulan</label>
                <input
                  type="number"
                  className="glass-input text-center"
                  placeholder="mm"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    setError("");
                  }}
                />
              </div>

              <div>
                <label className="block text-[11px] text-secondary mb-1">Tahun</label>
                <input
                  type="number"
                  className="glass-input text-center"
                  placeholder="yyyy"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setError("");
                  }}
                />
              </div>
            </div>

            {error && <ErrorMessage msg={error} />}

            <button type="submit" className="btn-primary w-full mt-2">
              Lanjutkan
            </button>
          </form>
        )}

        {/* Step 2: Kode Akses */}
        {step === 2 && (
          <form onSubmit={handleNext} className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Kode Rahasia</h2>
                <p className="text-xs text-secondary">
                  Lapisan 2: Masukkan kode akses sistem.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBack}
                className="btn-icon text-xs py-1.5 px-2.5"
                title="Kembali"
              >
                <ArrowLeftIcon size={14} />
              </button>
            </div>

            <div>
              <input
                type="password"
                className="glass-input font-mono tracking-widest text-center"
                placeholder="•••••••••••••••"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                autoFocus
              />
            </div>

            {error && <ErrorMessage msg={error} />}

            <button type="submit" className="btn-primary w-full mt-2">
              Lanjutkan
            </button>
          </form>
        )}

        {/* Step 3: Nama Konfirmasi */}
        {step === 3 && (
          <form onSubmit={handleNext} className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Verifikasi Akhir</h2>
                <p className="text-xs text-secondary">
                  Lapisan 3: Masukkan nama pengguna yang telah terdaftar.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBack}
                className="btn-icon text-xs py-1.5 px-2.5"
                title="Kembali"
              >
                <ArrowLeftIcon size={14} />
              </button>
            </div>

            <div>
              <input
                type="text"
                className="glass-input text-center font-medium"
                placeholder="nama lengkap"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                autoFocus
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-current"
              />
              Ingat sesi saya di perangkat ini
            </label>

            {error && <ErrorMessage msg={error} />}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? "Membuka Akses..." : "Masuk"}
            </button>
          </form>
        )}

        <p className="text-[11px] text-muted mt-6 text-center">
          Sistem dilindungi oleh 3 lapisan otentikasi. Semua pengguna yang mengetahui informasi ini dapat melakukan deploy.
        </p>
      </div>
    </div>
  );
}

function ErrorMessage({ msg }: { msg: string }) {
  return (
    <div
      className="text-xs p-3 rounded-lg text-danger"
      style={{
        background: "color-mix(in srgb, var(--danger) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--danger) 25%, transparent)",
      }}
    >
      {msg}
    </div>
  );
}
