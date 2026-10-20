// Imagen y color de los buses de cada empresa.
//
// Para poner una FOTO REAL de un bus: guarda la imagen en la carpeta public/buses/
// (por ejemplo public/buses/bolivariano.jpg) y escribe su ruta en "foto":
//   "EXPRESO BOLIVARIANO": { color: "#0f7a3d", foto: "/buses/bolivariano.jpg" },
// Usa fotos propias o con permiso de la empresa. Si no hay foto, se dibuja una
// ilustración con el color de la empresa.

type DatosBus = { color: string; foto?: string };

const BUSES: Record<string, DatosBus> = {
  "EXPRESO BOLIVARIANO": { color: "#0f7a3d" },
  TRANSIPIALES: { color: "#c2410c" },
  TRANSANDONA: { color: "#1d4ed8" },
  "CONTINENTAL BUS": { color: "#b91c1c" },
};

export function datosDelBus(empresa: string): DatosBus {
  return BUSES[empresa] ?? { color: "#7c3aed" };
}
