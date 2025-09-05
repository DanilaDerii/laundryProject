// frontend/src/lib/session.ts
export type DemoUser = {
  name: string;
  email: string;
  member: boolean;
};

const KEY = "demoUser";

// --- tiny pub-sub so UI reacts to login/logout in the same tab ---
type Listener = (u: DemoUser | null) => void;
const listeners = new Set<Listener>();

function notify(u: DemoUser | null) {
  // call subscribers in the same tick
  listeners.forEach((fn) => {
    try { fn(u); } catch {}
  });
}

/** Subscribe to session changes. Returns unsubscribe. */
export function onSessionChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getUser(): DemoUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
}

export function setUser(u: DemoUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(u));
  notify(u);
}

export function clearUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  notify(null);
}
