import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  get,
  set,
  remove,
  update,
} from "firebase/database";

// ===== Firebase configuration =====
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDjtjN29yc03BeAOeAvEsqQX23JuIMhLQg",
    authDomain: "deploy2-ed9ce.firebaseapp.com",
    projectId: "deploy2-ed9ce",
    storageBucket: "deploy2-ed9ce.firebasestorage.app",
    messagingSenderId: "405598518951",
    appId: "1:405598518951:web:e20cc22b8aead19306e582",
    measurementId: "G-WNCHPBHJ0G"
  };
let app: FirebaseApp;
let db: ReturnType<typeof getDatabase>;

try {
  app = initializeApp(FIREBASE_CONFIG);
  db = getDatabase(app);
} catch (e) {
  console.error("Firebase init failed:", e);
}

function getDb() {
  return db;
}

// ===== Page type =====
export interface Page {
  id: string;
  title: string;
  html: string;
  createdAt: number;
  updatedAt: number;
  views: number;
  uniqueVisitors: number;
  createdBy?: string;
  updatedBy?: string;
  visitLog?: { ts: number; ua?: string }[];
}

// ===== Visitor ID Management =====
const LS_VISITOR_KEY = "glassdeploy_visitor_id";

function getVisitorId(): string {
  let id = localStorage.getItem(LS_VISITOR_KEY);
  if (!id) {
    id = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(LS_VISITOR_KEY, id);
  }
  return id;
}

// ----- Pages (RTDB) -----
export async function listPages(): Promise<Page[]> {
  const database = getDb();
  if (!database) return [];
  try {
    const pagesRef = ref(database, "pages");
    const snapshot = await get(pagesRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list: Page[] = Object.values(data);
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  } catch (e) {
    console.error("listPages RTDB error:", e);
  }
  return [];
}

export async function getPage(id: string): Promise<Page | null> {
  const database = getDb();
  if (!database) return null;
  try {
    const pageRef = ref(database, `pages/${id}`);
    const snapshot = await get(pageRef);
    if (snapshot.exists()) {
      return snapshot.val() as Page;
    }
  } catch (e) {
    console.error("getPage RTDB error:", e);
  }
  return null;
}

export async function savePage(page: Page, userName?: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  try {
    const now = Date.now();
    const pageData: Page = {
      ...page,
      updatedAt: now,
      updatedBy: userName || page.updatedBy || "kholifadilmubarok",
    };
    await set(ref(database, `pages/${page.id}`), pageData);
  } catch (e) {
    console.error("savePage RTDB error:", e);
  }
}

export async function deletePage(id: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  try {
    await remove(ref(database, `pages/${id}`));
    await remove(ref(database, `visits/${id}`));
  } catch (e) {
    console.error("deletePage RTDB error:", e);
  }
}

// ----- Visit tracking (RTDB) -----
export async function recordVisit(id: string): Promise<void> {
  const visitorId = getVisitorId();
  const visitedKey = `visited_${id}_${visitorId}`;
  const alreadyVisited = !!localStorage.getItem(visitedKey);

  const database = getDb();
  if (!database) return;

  try {
    const pageRef = ref(database, `pages/${id}`);
    const snapshot = await get(pageRef);
    if (snapshot.exists()) {
      const currentData = snapshot.val() as Page;
      const newViews = (currentData.views || 0) + 1;
      const newUnique = (currentData.uniqueVisitors || 0) + (alreadyVisited ? 0 : 1);

      await update(pageRef, {
        views: newViews,
        uniqueVisitors: newUnique,
      });

      const visitId = `${Date.now()}_${visitorId.slice(0, 6)}`;
      await set(ref(database, `visits/${id}/${visitId}`), {
        ts: Date.now(),
        ua: navigator.userAgent.slice(0, 200),
        visitor: visitorId,
      });

      localStorage.setItem(visitedKey, "1");
    }
  } catch (e) {
    console.error("recordVisit RTDB error:", e);
  }
}

export async function getVisitLog(id: string): Promise<{ ts: number; ua?: string }[]> {
  const database = getDb();
  if (!database) return [];
  try {
    const visitsRef = ref(database, `visits/${id}`);
    const snapshot = await get(visitsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list: { ts: number; ua?: string }[] = Object.values(data);
      return list.sort((a, b) => b.ts - a.ts);
    }
  } catch (e) {
    console.error("getVisitLog RTDB error:", e);
  }
  return [];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

// ===== Manajemen Perangkat & Hak Akses Otomatis =====

export interface DeviceSession {
  id: string;
  name: string;
  ua: string;
  deviceName: string;
  role: "admin" | "editor";
  banned: boolean;
  lastActive: number;
  createdAt?: number;
}

const LS_SESSION_KEY = "glassdeploy_device_session_id";

export function getDeviceSessionId(): string {
  let id = localStorage.getItem(LS_SESSION_KEY);
  if (!id) {
    id = "ds_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(LS_SESSION_KEY, id);
  }
  return id;
}

export function parseDeviceName(ua: string): { name: string; isAdminDevice: boolean } {
  const lower = ua.toLowerCase();

  // Khusus HP Infinix Smart 8 Pro
  const isInfinixSmart8Pro =
    lower.includes("x6525") ||
    (lower.includes("infinix") && (lower.includes("smart 8") || lower.includes("pro")));

  // Khusus HP Vivo Y12s
  const isVivoY12s =
    lower.includes("y12s") ||
    lower.includes("v2026") ||
    lower.includes("v2027") ||
    lower.includes("v2033") ||
    (lower.includes("vivo") && lower.includes("y12"));

  if (isInfinixSmart8Pro) {
    return { name: "Infinix Smart 8 Pro", isAdminDevice: true };
  }
  if (isVivoY12s) {
    return { name: "Vivo Y12s", isAdminDevice: true };
  }

  // Pengenalan perangkat generik
  let name = "Unknown Device";
  if (lower.includes("android")) {
    const match = ua.match(/Android\s+[\d\.]+;\s+([^)]+)\)/);
    if (match && match[1]) {
      name = match[1].trim();
    } else {
      name = "Android Device";
    }
  } else if (lower.includes("iphone")) {
    name = "iPhone";
  } else if (lower.includes("ipad")) {
    name = "iPad";
  } else if (lower.includes("windows")) {
    name = "Windows PC";
  } else if (lower.includes("macintosh")) {
    name = "Mac";
  } else if (lower.includes("linux")) {
    name = "Linux PC";
  }

  return { name, isAdminDevice: false };
}

export async function registerDeviceSession(userName: string): Promise<{ role: "admin" | "editor"; banned: boolean }> {
  const database = getDb();
  if (!database) return { role: "editor", banned: false };

  const sid = getDeviceSessionId();
  const sessionRef = ref(database, `deploy_devices/${sid}`);

  try {
    // Ambil seluruh daftar perangkat untuk mengecek berapa perangkat yang sudah terdaftar
    const allDevicesSnap = await get(ref(database, "deploy_devices"));
    let totalRegistered = 0;
    let isOneOfFirstTwo = false;

    if (allDevicesSnap.exists()) {
      const allData = allDevicesSnap.val();
      const list = Object.values(allData) as DeviceSession[];
      totalRegistered = list.length;

      // Urutkan berdasarkan waktu pendaftaran
      list.sort((a, b) => (a.createdAt || a.lastActive) - (b.createdAt || b.lastActive));
      
      // Cek apakah sesi ini termasuk dalam 2 perangkat pertama
      const firstTwoIds = list.slice(0, 2).map((d) => d.id);
      if (firstTwoIds.includes(sid)) {
        isOneOfFirstTwo = true;
      }
    }

    const snap = await get(sessionRef);
    const ua = navigator.userAgent;
    const { name: deviceName, isAdminDevice } = parseDeviceName(ua);
    
    // ATURAN BARU: 2 perangkat yang langsung masuk langsung dijadikan Admin!
    // Jika sesi ini belum ada dan total yang terdaftar kurang dari 2, maka langsung Admin.
    // Jika sesi ini sudah ada dan ia termasuk 2 perangkat pertama, maka pastikan ia Admin.
    // Jika bukan, ia tetap bisa Admin jika ia menggunakan HP Infinix/Vivo yang sah.
    let role: "admin" | "editor" = "editor";
    if (isAdminDevice) {
      role = "admin";
    } else if (snap.exists() && isOneOfFirstTwo) {
      role = "admin";
    } else if (!snap.exists() && totalRegistered < 2) {
      role = "admin";
    }

    const now = Date.now();

    if (snap.exists()) {
      const data = snap.val() as DeviceSession;
      if (data.banned) {
        return { role: data.role, banned: true };
      }
      
      // Jika sebelumnya ia terdaftar sebagai 2 perangkat pertama, pastikan role-nya admin
      const finalRole = isOneOfFirstTwo ? "admin" : role;

      const updates: Partial<DeviceSession> = {
        lastActive: now,
        name: userName,
        ua,
        deviceName,
        role: finalRole,
      };
      if (!data.createdAt) {
        updates.createdAt = now;
      }
      await update(sessionRef, updates);
      return { role: finalRole, banned: false };
    } else {
      const newSession: DeviceSession = {
        id: sid,
        name: userName,
        ua,
        deviceName,
        role,
        banned: false,
        lastActive: now,
        createdAt: now,
      };
      await set(sessionRef, newSession);
      return { role, banned: false };
    }
  } catch (e) {
    console.error("registerDeviceSession error:", e);
    return { role: "editor", banned: false };
  }
}

export async function listDeviceSessions(): Promise<DeviceSession[]> {
  const database = getDb();
  if (!database) return [];
  try {
    const snap = await get(ref(database, "deploy_devices"));
    if (snap.exists()) {
      const data = snap.val();
      const list = Object.values(data) as DeviceSession[];
      return list.sort((a, b) => b.lastActive - a.lastActive);
    }
  } catch (e) {
    console.error("listDeviceSessions error:", e);
  }
  return [];
}

export async function setDeviceBanStatus(sessionId: string, banned: boolean): Promise<void> {
  const database = getDb();
  if (!database) return;
  try {
    await update(ref(database, `deploy_devices/${sessionId}`), { banned });
  } catch (e) {
    console.error("setDeviceBanStatus error:", e);
    throw e;
  }
}

export async function clearAllDeviceSessions(): Promise<void> {
  const database = getDb();
  if (!database) return;
  try {
    await remove(ref(database, "deploy_devices"));
    localStorage.removeItem("glassdeploy_device_session_id");
  } catch (e) {
    console.error("clearAllDeviceSessions error:", e);
    throw e;
  }
}

export async function checkIfDeviceIsBanned(): Promise<boolean> {
  const database = getDb();
  if (!database) return false;
  const sid = getDeviceSessionId();
  try {
    const snap = await get(ref(database, `deploy_devices/${sid}`));
    if (snap.exists()) {
      const data = snap.val() as DeviceSession;
      return !!data.banned;
    }
  } catch (e) {
    console.error("checkIfDeviceIsBanned error:", e);
  }
  return false;
}
