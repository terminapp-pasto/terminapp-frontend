// Fotos y colores de los buses de cada empresa.
//
// PARA PONER LAS FOTOS REALES:
// 1. Toma la foto del bus (o pídela a la empresa) y guárdala en la carpeta
//    public/buses/ con el nombre que aparece abajo en "foto". Ejemplo:
//    public/buses/expreso-bolivariano.jpg
// 2. Listo: la página la muestra sola. Si el archivo no existe, se dibuja una
//    ilustración con el color de la empresa.
//
// Usa fotos tomadas por ti o con permiso de la empresa: las fotos de sus
// páginas y redes sociales tienen derechos de autor.

type DatosBus = { color: string; foto?: string };

const BUSES: Record<string, DatosBus> = {
  "EXPRESO BOLIVARIANO": { color: "#0f7a3d", foto: "/buses/expreso-bolivariano.jpg" },
  TRANSIPIALES: { color: "#c2410c", foto: "/buses/transipiales.jpg" },
  TRANSANDONA: { color: "#1d4ed8", foto: "/buses/transandona.jpg" },
  "CONTINENTAL BUS": { color: "#b91c1c", foto: "/buses/continental-bus.jpg" },
};

export function datosDelBus(empresa: string): DatosBus {
  return BUSES[empresa] ?? { color: "#7c3aed" };
}
