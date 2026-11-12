import { useEffect } from "react";
import { formatDuration, formatLongDate } from "./api";
import { BusIcon } from "./Icons";
import type { Purchase } from "./types";
import { DOCUMENT_TYPES } from "./validation";

type Props = {
  purchase: Purchase;
  ticketCode: (ticketId: number) => string;
  onClose: () => void;
};

const BOARDING_ADVANCE_MINUTES = 30;

// Ticket to show when boarding, like an airline boarding pass: one stub per
// passenger with the booking code, the seat and the full document.
function TicketPass({ purchase, ticketCode, onClose }: Props) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="checkout-backdrop" onClick={onClose}>
      <div
        className="checkout narrow ticket-pass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-pass-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="checkout-header">
          <div>
            <h2 id="ticket-pass-title">
              {purchase.origin} → {purchase.destination}
            </h2>
            <p>
              {purchase.company} · {formatDuration(purchase.duration_min)} de viaje
            </p>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar (Esc)">
            ×
          </button>
        </header>

        <div className="checkout-main">
          <div className="pass-summary">
            <div>
              <span>Fecha</span>
              <strong>{formatLongDate(purchase.date)}</strong>
            </div>
            <div>
              <span>Salida</span>
              <strong>{purchase.departure_time}</strong>
            </div>
            <div>
              <span>Código de reserva</span>
              <strong className="pass-code">{purchase.booking_code}</strong>
            </div>
          </div>

          <ul className="pass-list">
            {purchase.tickets.map((ticket) => (
              <li key={ticket.ticket_id} className="pass-stub">
                <BusIcon />
                <div className="pass-passenger">
                  <strong>{ticket.passenger}</strong>
                  <span>
                    {DOCUMENT_TYPES[ticket.document_type ?? "CC"].label} {ticket.document}
                  </span>
                  <small>Tiquete {ticketCode(ticket.ticket_id)}</small>
                </div>
                <div className="pass-seat">
                  <span>Asiento</span>
                  <b>{ticket.seat}</b>
                </div>
              </li>
            ))}
          </ul>

          <p className="note">
            Llega al Terminal de Pasto {BOARDING_ADVANCE_MINUTES} minutos antes y muestra este tiquete con tu
            documento al abordar.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TicketPass;
