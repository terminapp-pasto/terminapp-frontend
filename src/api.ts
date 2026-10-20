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

export function formatoPrecio(valor: number) {
  return "$" + valor.toLocaleString("es-CO");
}

export function formatoDuracion(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
