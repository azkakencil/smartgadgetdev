// Otentikasi 3 Lapisan Keamanan
const AUTH_KEY = "glassdeploy_auth_v3";
const AUTH_USER_KEY = "glassdeploy_auth_name";

export interface AuthAnswers {
  day: string;
  month: string;
  year: string;
  code: string;
  name: string;
}

export function isLoggedIn(): boolean {
  try {
    return sessionStorage.getItem(AUTH_KEY) === "ok" ||
           localStorage.getItem(AUTH_KEY) === "ok";
  } catch {
    return false;
  }
}

export function getLoggedName(): string {
  try {
    return localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY) || "kholifadilmubarok";
  } catch {
    return "kholifadilmubarok";
  }
}

export function tryLogin(answers: AuthAnswers, remember: boolean): { success: boolean; error?: string } {
  // Verifikasi Lapisan 1: Tanggal Lahir (28 6 2013)
  const d = answers.day.trim();
  const m = answers.month.trim();
  const y = answers.year.trim();

  // Izinkan variasi "06" atau "6", "028" atau "28"
  if (parseInt(d) !== 28 || parseInt(m) !== 6 || parseInt(y) !== 2013) {
    return { success: false, error: "Lapisan 1: Tanggal lahir tidak tepat!" };
  }

  // Verifikasi Lapisan 2: Kode Akses (SMARTGADGET12345)
  if (answers.code.trim() !== "SMARTGADGET12345") {
    return { success: false, error: "Lapisan 2: Kode akses tidak valid!" };
  }

  // Verifikasi Lapisan 3: Nama (kholifadilmubarok)
  if (answers.name.trim().toLowerCase() !== "kholifadilmubarok") {
    return { success: false, error: "Lapisan 3: Nama pengguna tidak sesuai!" };
  }

  // Jika semua verifikasi lolos
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(AUTH_KEY, "ok");
  storage.setItem(AUTH_USER_KEY, answers.name.trim());

  return { success: true };
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
