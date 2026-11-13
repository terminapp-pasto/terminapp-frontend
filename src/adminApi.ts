// Types and calls of the admin panel (/admin/... routes of the backend).

export type Company = {
  id: number;
  name: string;
  max_seats_per_purchase: number;
  reservation_minutes: number;
  buses: number;
  routes: number;
  departures: number;
};

export type Bus = {
  id: number;
  plate: string;
  capacity: number;
  company_id: number;
  company: string;
  departures: number;
};

export type RouteDeparture = {
  id: number;
  departure_time: string;
  price: number;
  active: boolean;
  bus_id: number | null;
  plate: string | null;
  capacity: number | null;
};

export type AdminRoute = {
  id: number;
  company_id: number;
  company: string;
  origin: string;
  destination: string;
  duration_min: number;
  departures: RouteDeparture[];
};

export type OccupancyRow = {
  schedule_id: number;
  company: string;
  destination: string;
  departure_time: string;
  price: number;
  plate: string;
  capacity: number;
  sold: number;
  held: number;
  free: number;
  occupancy_percent: number;
  revenue: number;
};

export type Occupancy = {
  date: string;
  totals: { departures: number; seats: number; sold: number; held: number; revenue: number; occupancy_percent: number };
  departures: OccupancyRow[];
};

export type AdminDocumentType = {
  code: string;
  name: string;
  min_length: number;
  max_length: number;
  allows_letters: boolean;
  active: boolean;
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "user" | "company" | "admin";
  company_id: number | null;
  company: string | null;
};

// A change the AI prepared: the panel shows it and only "Confirmar" sends it.
export type AssistantAction = { summary: string; path: string; body: Record<string, unknown> };

export const MIN_RESERVATION_MINUTES = 5;
export const MAX_RESERVATION_MINUTES = 30;
export const MAX_SEATS_LIMIT = 10;
export const MIN_PRICE = 1000;
export const MAX_PRICE = 2000000;

export const ROLE_LABELS: Record<AdminUser["role"], string> = {
  user: "Viajero",
  company: "Empresa",
  admin: "Administrador",
};
