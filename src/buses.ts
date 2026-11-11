// Bus photos and colors for each company.
//
// TO ADD THE REAL PHOTOS:
// 1. Take a photo of the bus (or ask the company for one) and save it in
//    public/buses/ with the name shown below in "photo". Example:
//    public/buses/expreso-bolivariano.jpg
// 2. Done: the page shows it automatically. If the file does not exist, an
//    illustration in the company's color is drawn instead.
//
// Use photos you took or have the company's permission for: the photos on
// their websites and social media are copyrighted.

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
