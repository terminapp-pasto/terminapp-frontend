// Data types returned by the backend.

import type { DocumentType } from "./validation";

export type Departure = {
  schedule_id: number;
  company: string;
  origin: string;
  destination: string;
  departure_time: string;
  duration_min: number;
  price: number;
  available_seats: number; // free seats that day
  date?: string; // YYYY-MM-DD
};

export type SeatStatus = "FREE" | "TAKEN";

export type SeatMap = {
  departure: Departure & { capacity: number; plate?: string };
  date: string;
  free_seats: number;
  seats: { number: number; status: SeatStatus }[];
};

export type PassengerForm = {
  seat: number;
  name: string;
  document_type: DocumentType;
  document: string;
};

export type Reservation = {
  payment_id: number;
  booking_code: string; // 6 characters, e.g. "K7M2QX": shown when boarding
  status: PurchaseStatus;
  total: number;
  seats: number[];
  passengers: PassengerForm[];
  expires_at: string;
};

export type PaymentSession = {
  status: PurchaseStatus;
  client_secret: string | null;
  ui_mode?: string;
  expires_at?: string; // when the open payment (and the seat hold) ends
};

export type PurchaseStatus = "RESERVED" | "PAYING" | "PAID" | "CANCELLED" | "EXPIRED";

export type TicketPassenger = {
  ticket_id: number;
  seat: number;
  passenger: string;
  document_type: DocumentType;
  document: string;
};

export type Purchase = {
  payment_id: number;
  booking_code: string;
  status: PurchaseStatus;
  date: string;
  departure_time: string;
  duration_min: number;
  company: string;
  origin: string;
  destination: string;
  unit_price: number;
  total: number;
  purchased_at: string;
  expires_at: string | null; // time until which an unpaid reservation is held
  tickets: TicketPassenger[];
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  text: string;
  departures?: Departure[];
};
