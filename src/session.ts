// Guarda la sesión en el navegador para no pedir el inicio de sesión en cada
// visita. Solo se guarda el token y los datos públicos del usuario, nunca la
// contraseña.

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
    // una sesión guardada con el formato viejo (en español) se descarta
    return session?.user?.name ? session : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // si el navegador no deja guardar, la sesión dura solo mientras la página esté abierta
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada que borrar
  }
}
