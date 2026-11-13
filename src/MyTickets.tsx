import { useEffect, useState } from "react";
import {
  ApiError,
  apiRequest,
  errorText,
  formatDateWithYear,
  formatDuration,
  formatLongDate,
  formatPrice,
  isoDate,
} from "./api";
import { BusIcon, ClockIcon, WhatsAppIcon } from "./Icons";
import { loadContactPhone } from "./session";
import TicketPass from "./TicketPass";
import { arrivalTime, itineraryText, whatsappLink } from "./whatsapp";
import type { Purchase, PurchaseStatus } from "./types";

type SortOrder = "newest" | "oldest";
type TripTab = "upcoming" | "past";

type Props = {
  token: string;
  refreshKey: number;
  onSessionExpired: () => void;
  onResumePayment: (paymentId: number) => void;
};

type HistoryLoad = { key: string; purchases?: Purchase[]; error?: string };

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  PAID: "Pagado",
  RESERVED: "Reservado, sin pagar",
  PAYING: "Pago sin terminar",
  CANCELLED: "Cancelado",
  EXPIRED: "Vencido",
};

const TICKET_CODE_PREFIX = "TP-";
const TICKET_CODE_DIGITS = 6;

function isPending(status: PurchaseStatus) {
  return status === "RESERVED" || status === "PAYING";
}

// A trip is "upcoming" if it has not happened yet and is still alive (paid or awaiting payment).
function isUpcoming(purchase: Purchase) {
  return purchase.date >= isoDate(0) && (purchase.status === "PAID" || isPending(purchase.status));
}

const VISIBLE_DOCUMENT_DIGITS = 4;

// "1085123456" -> "••••3456": the history shows only the end of each document,
// so it is not exposed on a shared screen (the full number is in the ticket).
function maskDocument(document: string) {
  return "••••" + document.slice(-VISIBLE_DOCUMENT_DIGITS);
}

// "2026-11-14" -> { weekday: "vie", day: "14", month: "nov" }, for the date block of each trip.
function calendarParts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return {
    weekday: date.toLocaleDateString("es-CO", { weekday: "short" }).replace(".", ""),
    day: String(day),
    month: date.toLocaleDateString("es-CO", { month: "short" }).replace(".", ""),
  };
}

function ticketCode(ticketId: number) {
  return TICKET_CODE_PREFIX + String(ticketId).padStart(TICKET_CODE_DIGITS, "0");
}

// Trip history, like airlines show it: upcoming and past trips, with the
// passengers, the seats and how much was paid for each purchase.
function MyTickets({ token, refreshKey, onSessionExpired, onResumePayment }: Props) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [tab, setTab] = useState<TripTab>("upcoming");
  const [ownRefresh, setOwnRefresh] = useState(0);
  const [historyLoad, setHistoryLoad] = useState<HistoryLoad | null>(null);
  const [busyPaymentId, setBusyPaymentId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [paymentToConfirmCancel, setPaymentToConfirmCancel] = useState<number | null>(null);
  const [purchaseToShow, setPurchaseToShow] = useState<Purchase | null>(null);
  const savedPhone = loadContactPhone();

  const loadKey = `${sortOrder}|${refreshKey}|${ownRefresh}`;
  const isLoading = historyLoad?.key !== loadKey;

  useEffect(() => {
    let isCurrent = true;
    apiRequest<Purchase[]>(`/my-tickets?order=${sortOrder}`, { token })
      .then((data) => isCurrent && setHistoryLoad({ key: loadKey, purchases: data }))
      .catch((error) => {
        if (!isCurrent) return;
        if (error instanceof ApiError && error.status === 401) onSessionExpired();
        else setHistoryLoad({ key: loadKey, error: errorText(error) });
      });
    return () => {
      isCurrent = false;
    };
  }, [loadKey, sortOrder, token, onSessionExpired]);

  async function cancelPurchase(paymentId: number) {
    setPaymentToConfirmCancel(null);
    setBusyPaymentId(paymentId);
    setActionError("");
    try {
      await apiRequest(`/purchases/${paymentId}/cancel`, { method: "POST", token });
    } catch (error) {
      setActionError(errorText(error));
    }
    setBusyPaymentId(null);
    setOwnRefresh((n) => n + 1);
  }

  const purchases = isLoading ? undefined : historyLoad?.purchases;
  const upcoming = purchases?.filter(isUpcoming) ?? [];
  const past = purchases?.filter((purchase) => !isUpcoming(purchase)) ?? [];
  const shown = tab === "upcoming" ? upcoming : past;
  const paidPurchases = purchases?.filter((purchase) => purchase.status === "PAID") ?? [];
  const totalSpent = paidPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const totalTickets = paidPurchases.reduce((sum, purchase) => sum + purchase.tickets.length, 0);

  return (
    <div className="my-tickets">
      <div className="my-tickets-bar">
        <h3>Mis viajes</h3>
        <select
          aria-label="Ordenar viajes"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
        >
          <option value="newest">Compras más recientes primero</option>
          <option value="oldest">Compras más antiguas primero</option>
        </select>
      </div>

      {purchases && purchases.length > 0 && (
        <div className="trip-stats">
          <div>
            <strong>{paidPurchases.length}</strong>
            <span>{paidPurchases.length === 1 ? "viaje comprado" : "viajes comprados"}</span>
          </div>
          <div>
            <strong>{totalTickets}</strong>
            <span>{totalTickets === 1 ? "tiquete" : "tiquetes"}</span>
          </div>
          <div>
            <strong>{formatPrice(totalSpent)}</strong>
            <span>pagado en total</span>
          </div>
        </div>
      )}

      <div className="trip-tabs" role="tablist" aria-label="Viajes">
        <button type="button" role="tab" aria-selected={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          Próximos {purchases && <span className="tab-count">{upcoming.length}</span>}
        </button>
        <button type="button" role="tab" aria-selected={tab === "past"} onClick={() => setTab("past")}>
          Anteriores y cancelados {purchases && <span className="tab-count">{past.length}</span>}
        </button>
      </div>

      {actionError && (
        <div className="notice error" role="alert">
          {actionError}
        </div>
      )}

      {isLoading && (
        <div className="notice loading">
          <span className="spinner" aria-hidden="true"></span>
          Cargando tus viajes...
        </div>
      )}
      {!isLoading && historyLoad?.error && (
        <div className="notice error" role="alert">
          {historyLoad.error}
        </div>
      )}
      {purchases && shown.length === 0 && (
        <p className="notice">
          {tab === "upcoming"
            ? "No tienes viajes próximos. Busca un viaje en el chat o en el buscador y dale a Comprar."
            : "Aquí aparecerán tus viajes anteriores y las compras canceladas o vencidas."}
        </p>
      )}

      {shown.length > 0 && (
        <ul className="ticket-list">
          {shown.map((purchase) => {
            const statusClass = purchase.status.toLowerCase();
            const date = calendarParts(purchase.date);
            const seats = purchase.tickets.map((ticket) => ticket.seat).join(", ");
            const phone = purchase.contact_phone ?? savedPhone;
            return (
              <li key={purchase.payment_id} className={`ticket ${statusClass}`}>
                <div className="ticket-top">
                  <div className="ticket-date" aria-label={formatLongDate(purchase.date)}>
                    <small>{date.weekday}</small>
                    <b>{date.day}</b>
                    <small>{date.month}</small>
                  </div>
                  <div className="ticket-timeline">
                    <div className="ticket-stop">
                      <b>{purchase.departure_time}</b>
                      <span>{purchase.origin}</span>
                    </div>
                    <div className="ticket-line" aria-label={`${formatDuration(purchase.duration_min)} de viaje`}>
                      <span>{formatDuration(purchase.duration_min)}</span>
                      <i aria-hidden="true">
                        <BusIcon size={16} />
                      </i>
                    </div>
                    <div className="ticket-stop end">
                      <b>{arrivalTime(purchase)}</b>
                      <span>{purchase.destination}</span>
                    </div>
                  </div>
                  <span className={`badge ${statusClass}`}>{STATUS_LABELS[purchase.status]}</span>
                </div>

                <div className="ticket-meta">
                  <span>{purchase.company}</span>
                  {purchase.booking_code && (
                    <span className="booking-code">
                      Reserva <b>{purchase.booking_code}</b>
                    </span>
                  )}
                </div>

                <details className="ticket-passengers" open={isPending(purchase.status)}>
                  <summary>
                    {purchase.tickets.length === 1
                      ? `1 pasajero · asiento ${seats}`
                      : `${purchase.tickets.length} pasajeros · asientos ${seats}`}
                  </summary>
                  <table className="passenger-table">
                    <thead>
                      <tr>
                        <th>Asiento</th>
                        <th>Pasajero</th>
                        <th>Documento</th>
                        {purchase.status === "PAID" && <th>Tiquete</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.tickets.map((ticket) => (
                        <tr key={ticket.ticket_id}>
                          <td>
                            <span className="seat-pill">{ticket.seat}</span>
                          </td>
                          <td>{ticket.passenger}</td>
                          <td title="Por privacidad solo se muestran los últimos dígitos">
                            {ticket.document_type ?? "CC"} {maskDocument(ticket.document)}
                          </td>
                          {purchase.status === "PAID" && (
                            <td className="ticket-code">{ticketCode(ticket.ticket_id)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>

                {isPending(purchase.status) && purchase.expires_at && (
                  <p className="ticket-expires">
                    <ClockIcon size={16} /> Tus asientos quedan apartados hasta las <b>{purchase.expires_at}</b>. Si
                    no pagas antes, se liberan.
                  </p>
                )}

                {isPending(purchase.status) && paymentToConfirmCancel === purchase.payment_id && (
                  <div className="cancel-confirmation" role="alert">
                    <p>
                      ¿Cancelar esta compra? {purchase.tickets.length === 1 ? "Se libera el asiento" : "Se liberan los asientos"}{" "}
                      {seats} y no se puede deshacer.
                    </p>
                    <div className="ticket-actions">
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => cancelPurchase(purchase.payment_id)}
                      >
                        Sí, cancelar
                      </button>
                      <button type="button" className="secondary-button" onClick={() => setPaymentToConfirmCancel(null)}>
                        No, conservarla
                      </button>
                    </div>
                  </div>
                )}

                <div className="ticket-footer">
                  <div className="ticket-total">
                    <small>
                      {purchase.tickets.length} × {formatPrice(purchase.unit_price)} · compra del{" "}
                      {formatDateWithYear(purchase.purchased_at)}
                    </small>
                    <strong>
                      {purchase.status === "PAID" ? "Pagaste " : "Total "}
                      {formatPrice(purchase.total)}
                    </strong>
                  </div>

                  {purchase.status === "PAID" && (
                    <div className="ticket-actions">
                      <a
                        className="whatsapp-button"
                        href={whatsappLink(itineraryText(purchase, ticketCode), phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <WhatsAppIcon size={18} /> Enviar itinerario a mi WhatsApp
                      </a>
                      <button type="button" className="primary-button" onClick={() => setPurchaseToShow(purchase)}>
                        Ver tiquete
                      </button>
                    </div>
                  )}
                  {isPending(purchase.status) && paymentToConfirmCancel !== purchase.payment_id && (
                    <div className="ticket-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={busyPaymentId !== null}
                        onClick={() => setPaymentToConfirmCancel(purchase.payment_id)}
                      >
                        {busyPaymentId === purchase.payment_id ? "Cancelando..." : "Cancelar compra"}
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={busyPaymentId !== null}
                        onClick={() => onResumePayment(purchase.payment_id)}
                      >
                        {purchase.status === "PAYING" ? "Terminar el pago" : "Pagar"}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {purchaseToShow && (
        <TicketPass purchase={purchaseToShow} ticketCode={ticketCode} onClose={() => setPurchaseToShow(null)} />
      )}
    </div>
  );
}

export default MyTickets;
