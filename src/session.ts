// Stores the session in the browser so the user does not have to log in on
// every visit. Only the token and the user's public data are stored, never
// the password.

export type User = {
  id: number;
  name: string;
  email: string;
};

export type Session = {
  token: string;
  user: User;
};

const STORAGE_KEY = "terminapp_session";

export function loadSession(): Session | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const session = saved ? (JSON.parse(saved) as Session) : null;
    // a session saved in the old (Spanish) format is discarded
    return session?.user?.name ? session : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // if the browser blocks storage, the session only lasts while the page is open
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to remove
  }
}
