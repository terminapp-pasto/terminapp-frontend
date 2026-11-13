// "Enviar itinerario a mi WhatsApp": builds the trip text and opens WhatsApp with it
// already written. It uses wa.me links, so it needs no API, key or backend.
import { formatDuration, formatLongDate, formatPrice } from "./api";
import type { Purchase } from "./types";

const COLOMBIA_PREFIX = "57";

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function arrivalTime(purchase: Pick<Purchase, "departure_time" | "duration_min">) {
  return addMinutes(purchase.departure_time, purchase.duration_min);
}

export function itineraryText(purchase: Purchase, ticketCode: (ticketId: number) => string) {
  const lines = [
    "🚌 *Mi viaje en TerminAPP*",
    "",
    `*${purchase.origin} → ${purchase.destination}*`,
    `📅 ${formatLongDate(purchase.date)}`,
    `🕒 Sale ${purchase.departure_time} · llega aprox. ${arrivalTime(purchase)} (${formatDuration(purchase.duration_min)})`,
    `🚍 ${purchase.company}`,
  ];
  if (purchase.booking_code) lines.push(`🔖 Código de reserva: *${purchase.booking_code}*`);
  lines.push("", "*Pasajeros*");
  for (const ticket of purchase.tickets) {
    // only the seat and the name: the document number is not sent through chats
    lines.push(`• Asiento ${ticket.seat}: ${ticket.passenger} (${ticketCode(ticket.ticket_id)})`);
  }
  lines.push(
    "",
    `💳 Total: ${formatPrice(purchase.total)}`,
    "📍 Terminal de Transportes de Pasto. Llega 30 minutos antes con tu documento."
  );
  return lines.join("\n");
}

// With a phone it opens the chat with that number (your own number = "message yourself");
// without one, WhatsApp asks who to send it to.
export function whatsappLink(text: string, phone?: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const number = digits.length === 10 ? COLOMBIA_PREFIX + digits : digits;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
