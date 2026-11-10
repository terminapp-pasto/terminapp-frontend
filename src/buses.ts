// Fotos y colores de los buses de cada empresa.
//
// PARA PONER LAS FOTOS REALES:
// 1. Toma la foto del bus (o pídela a la empresa) y guárdala en la carpeta
//    public/buses/ con el nombre que aparece abajo en "photo". Ejemplo:
//    public/buses/expreso-bolivariano.jpg
// 2. Listo: la página la muestra sola. Si el archivo no existe, se dibuja una
//    ilustración con el color de la empresa.
//
// Usa fotos tomadas por ti o con permiso de la empresa: las fotos de sus
// páginas y redes sociales tienen derechos de autor.

type BusStyle = { color: string; photo?: string };

const DEFAULT_COLOR = "#7c3aed";

const BUS_STYLES: Record<string, BusStyle> = {
  "EXPRESO BOLIVARIANO": { color: "#0f7a3d", photo: "/buses/expreso-bolivariano.jpg" },
  TRANSIPIALES: { color: "#c2410c", photo: "/buses/transipiales.jpg" },
  TRANSANDONA: { color: "#1d4ed8", photo: "/buses/transandona.jpg" },
  "CONTINENTAL BUS": { color: "#b91c1c", photo: "/buses/continental-bus.jpg" },
};

export function getBusStyle(company: string): BusStyle {
  return BUS_STYLES[company] ?? { color: DEFAULT_COLOR };
}
