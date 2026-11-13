// Bus photo and colors for each company.
//
// Each company looks for its own photo, named after the company in lowercase with
// hyphens: "EXPRESO BOLIVARIANO" -> public/buses/expreso-bolivariano.jpg. If that file
// does not exist, the shared photo public/buses/bus.jpg is used, and if that is
// missing too, an illustration in the company's color is drawn.

type BusStyle = { color: string; photo: string; fallbackPhoto: string };

const SHARED_PHOTO = "/buses/bus.jpg";
const DEFAULT_COLOR = "#7c3aed";

const COMPANY_COLORS: Record<string, string> = {
  "EXPRESO BOLIVARIANO": "#0f7a3d",
  TRANSIPIALES: "#c2410c",
  TRANSANDONA: "#1d4ed8",
  "CONTINENTAL BUS": "#b91c1c",
};

// "EXPRESO BOLIVARIANO" -> "expreso-bolivariano", "TRANSANDOÑA" -> "transandona"
export function companySlug(company: string) {
  return company
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getBusStyle(company: string): BusStyle {
  return {
    color: COMPANY_COLORS[company] ?? DEFAULT_COLOR,
    photo: `/buses/${companySlug(company)}.jpg`,
    fallbackPhoto: SHARED_PHOTO,
  };
}
