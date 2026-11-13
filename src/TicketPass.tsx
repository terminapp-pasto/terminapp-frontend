import { formatDuration, formatLongDate } from "./api";
import { ArrowRightIcon, BusIcon, WhatsAppIcon } from "./Icons";
import ScreenShell from "./ScreenShell";
import { loadContactPhone } from "./session";
import type { Purchase } from "./types";
import { documentLabel } from "./validation";
import { itineraryText, whatsappLink } from "./whatsapp";

type Props = {
  purchase: Purchase;
  ticketCode: (ticketId: number) => string;
  onClose: () => void;
};

const BOARDING_ADVANCE_MINUTES = 30;

// Ticket to show when boarding (a full page, not a window), like an airline boarding pass: one stub per
// passenger with the booking code, the seat and the full document.
function TicketPass({ purchase, ticketCode, onClose }: Props) {
  return (
    <ScreenShell
      titleId="ticket-pass-title"
      title={
        <>
          {purchase.origin} <ArrowRightIcon size={18} /> {purchase.destination}
        </>
      }
      subtitle={`${purchase.company} · ${formatDuration(purchase.duration_min)} de viaje`}
      backLabel="Mis viajes"
      onBack={onClose}
    >
      <div className="screen-page">
        <div className="screen-card ticket-pass">
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
                    {documentLabel(ticket.document_type ?? "CC")} {ticket.document}
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
          <a
            className="whatsapp-button full-width"
            href={whatsappLink(itineraryText(purchase, ticketCode), purchase.contact_phone ?? loadContactPhone())}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon size={18} /> Enviar itinerario a mi WhatsApp
          </a>
        </div>
      </div>
    </ScreenShell>
  );
}

export default TicketPass;
