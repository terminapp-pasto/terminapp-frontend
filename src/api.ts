// Conexión con el backend. El frontend nunca llama a la IA ni a la base de
// datos directamente: todo pasa por la API.

export const API_URL =
  import.meta.env.VITE_API_URL ?? "https://terminapp-backend.onrender.com";

export const ERROR_CONEXION =
  "No pudimos conectar con el servidor. Revisa tu internet e intenta de nuevo.";

// Saca el mensaje de error que manda FastAPI en "detail".
export function mensajeDeError(datos: unknown, porDefecto: string) {
  if (datos && typeof datos === "object" && "detail" in datos) {
    const detalle = (datos as { detail: unknown }).detail;
    if (typeof detalle === "string") return detalle;
  }
  return porDefecto;
}

export class ErrorApi extends Error {
  estado: number;

  constructor(mensaje: string, estado: number) {
    super(mensaje);
    this.estado = estado;
  }
}

type Opciones = {
  metodo?: "GET" | "POST";
  cuerpo?: unknown;
  token?: string;
};

// Llama al backend y devuelve el JSON; si algo falla lanza ErrorApi con el
// mensaje en español que mandó el servidor.
export async function pedir<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const encabezados: Record<string, string> = {};
  if (opciones.cuerpo !== undefined) encabezados["Content-Type"] = "application/json";
  if (opciones.token) encabezados["Authorization"] = `Bearer ${opciones.token}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: opciones.metodo ?? "GET",
      headers: encabezados,
      body:
        opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(ERROR_CONEXION, 0);
  }

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok || datos === null) {
    throw new ErrorApi(
      mensajeDeError(datos, "El servidor respondió con un error."),
      respuesta.status
    );
  }
  return datos as T;
}

export function textoDeError(error: unknown) {
  return error instanceof ErrorApi ? error.message : ERROR_CONEXION;
}

// Fecha de hoy (más algunos días) en formato AAAA-MM-DD, con la hora del usuario.
export function fechaISO(diasDespues = 0) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diasDespues);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function formatoFecha(iso: string) {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatoPrecio(valor: number) {
  return "$" + valor.toLocaleString("es-CO");
}

export function formatoDuracion(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
