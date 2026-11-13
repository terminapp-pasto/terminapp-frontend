// Texts and general rules the admin edits in the panel (backend: GET /settings).
// They load once when the page opens; until then (or offline) the defaults are shown.
import { useSyncExternalStore } from "react";
import { apiRequest } from "./api";

export type AppSettings = {
  home_title: string;
  home_highlight: string;
  home_subtitle: string;
  announcement: string;
  chat_welcome: string;
  terminal_address: string;
  terminal_phones: string;
  terminal_email: string;
  sales_window_days: number;
  max_pending_purchases: number;
  boarding_advance_minutes: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  home_title: "¿A dónde viajas hoy",
  home_highlight: "desde Pasto?",
  home_subtitle: "Escríbelo como se lo dirías a una persona. La IA busca las salidas y tú eliges el asiento.",
  announcement: "",
  chat_welcome: "¡Hola! ¿A dónde quieres viajar hoy?",
  terminal_address: "Carrera 6ª No. 16D-50, barrio Madrigal, Pasto",
  terminal_phones: "(602) 729 0265 · 302 728 8990",
  terminal_email: "pqrs@terminalpasto.gov.co",
  sales_window_days: 60,
  max_pending_purchases: 2,
  boarding_advance_minutes: 30,
};

let current: AppSettings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();

function publish(settings: AppSettings) {
  current = settings;
  listeners.forEach((listener) => listener());
}

// Asks the backend again (on load, and right after the admin saves a change).
export function reloadSettings() {
  return apiRequest<Partial<AppSettings>>("/settings")
    .then((settings) => publish({ ...DEFAULT_SETTINGS, ...settings }))
    .catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppSettings() {
  return useSyncExternalStore(subscribe, () => current);
}
