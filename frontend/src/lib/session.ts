// frontend/src/lib/session.ts
export type DemoUser = {
  id: string;           // NEW: stable id (we'll use backend-provided id; fallback = email)
  name: string;
  email: string;
  member: boolean;
};

const KEY = "demoUser";

// --- tiny pub-sub so UI reacts to login/logout in the same tab ---
type Listener = (u: DemoUser | null) => void;
const listeners = new Set<Listener>();

function notify(u: DemoUser | null) {
  listeners.forEach((fn) => {
    try { fn(u); } catch {}
  });
}

/** Subscribe to session changes. Returns unsubscribe. */
export function onSessionChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Normalize stored/legacy shapes into DemoUser (adds id if missing). */
function normalize(input: any): DemoUser | null {
  if (!input || typeof input !== "object") return null;
  const name = String(input.name ?? "");
  const email = String(input.email ?? "");
  const member = Boolean(input.member);
  if (!email) return null;
  const id = String(input.id ?? email); // fallback to email if legacy
  return { id, name, email, member };
}

export function getUser(): DemoUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Save user to localStorage and notify listeners.
 * Accepts either the new shape (with id) or legacy (without id).
 */
type AcceptableUser = DemoUser | { id?: string; name: string; email: string; member: boolean };

export function setUser(u: AcceptableUser) {
  if (typeof window === "undefined") return;
  const norm = normalize(u);
  if (!norm) return;
  localStorage.setItem(KEY, JSON.stringify(norm));
  notify(norm);
}

export function clearUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  notify(null);
}
