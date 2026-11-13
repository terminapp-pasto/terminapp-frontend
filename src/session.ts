// Stores the session in the browser so the user does not have to log in on
// every visit. Only the token and the user's public data are stored, never
// the password.

// user = traveller; company = employee of one bus company; admin = the terminal
export type Role = "user" | "company" | "admin";

export type User = {
  id: number;
  name: string;
  email: string;
  role?: Role;
  company_id?: number | null;
  company?: string | null;
};

export function isStaff(user: User | undefined) {
  return user?.role === "admin" || (user?.role === "company" && Boolean(user.company_id));
}

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

// The last contact phone typed in a purchase, so the next purchase and the
// "Enviar itinerario a mi WhatsApp" button already know it.
const PHONE_KEY = "terminapp_phone";

export function loadContactPhone() {
  try {
    return localStorage.getItem(PHONE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveContactPhone(phone: string) {
  try {
    localStorage.setItem(PHONE_KEY, phone);
  } catch {
    // without storage the phone is simply asked again
  }
}
