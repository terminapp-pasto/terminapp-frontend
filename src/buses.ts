// Bus photo and colors for each company.
//
// Every company uses the same photo: public/buses/bus.jpg (a free-license
// photo). To give a company its own photo, save it in public/buses/ and put
// its path in that company's "photo". If a photo file does not exist, an
// illustration in the company's color is drawn instead.

type BusStyle = { color: string; photo: string };

const SHARED_PHOTO = "/buses/bus.jpg";
const DEFAULT_COLOR = "#7c3aed";

const COMPANY_COLORS: Record<string, string> = {
  "EXPRESO BOLIVARIANO": "#0f7a3d",
  TRANSIPIALES: "#c2410c",
  TRANSANDONA: "#1d4ed8",
  "CONTINENTAL BUS": "#b91c1c",
};

// Company-specific photos; companies not listed here use the shared photo.
const COMPANY_PHOTOS: Record<string, string> = {};

export function getBusStyle(company: string): BusStyle {
  return {
    color: COMPANY_COLORS[company] ?? DEFAULT_COLOR,
    photo: COMPANY_PHOTOS[company] ?? SHARED_PHOTO,
  };
}
