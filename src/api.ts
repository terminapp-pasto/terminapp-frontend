// Conexión con el backend. El frontend nunca llama a la IA ni a la base de
// datos directamente: todo pasa por la API.

export const API_URL =
  import.meta.env.VITE_API_URL ?? "https://terminapp-backend.onrender.com";

export const CONNECTION_ERROR =
  "No pudimos conectar con el servidor. Revisa tu internet e intenta de nuevo.";
const SERVER_ERROR = "El servidor respondió con un error.";

// Saca el mensaje de error que manda FastAPI en "detail".
export function getErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string;
};

// Llama al backend y devuelve el JSON; si algo falla lanza ApiError con el
// mensaje en español que mandó el servidor.
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(CONNECTION_ERROR, 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) {
    throw new ApiError(getErrorMessage(data, SERVER_ERROR), response.status);
  }
  return data as T;
}

export function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : CONNECTION_ERROR;
}

// Fecha de hoy (más algunos días) en formato AAAA-MM-DD, con la hora del usuario.
export function isoDate(daysFromToday = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatShortDate(iso: string) {
  return parseIsoDate(iso).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatLongDate(iso: string) {
  return parseIsoDate(iso).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateWithYear(isoDateTime: string) {
  return new Date(isoDateTime).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPrice(amount: number) {
  return "$" + amount.toLocaleString("es-CO");
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
}
