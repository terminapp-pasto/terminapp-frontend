import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ApiError,
  apiRequest,
  errorText,
  formatDuration,
  formatLongDate,
  formatPrice,
  isoDate,
} from "./api";
import BusImage from "./BusImage";
import EmbeddedPayment from "./EmbeddedPayment";
import { ArrowLeftIcon, CheckIcon, ClockIcon } from "./Icons";
import type { Session } from "./session";
import type { Departure, PassengerForm, Reservation, SeatMap } from "./types";
import {
  DOCUMENT_MAX_LENGTH,
  DOCUMENT_RULE,
  NAME_MAX_LENGTH,
  NAME_RULE,
  isValidDocument,
  isValidName,
  keepDigits,
  normalizeSpaces,
} from "./validation";

const MAX_SEATS_PER_PURCHASE = 5;
const SALES_WINDOW_DAYS = 60;
const SEATS_PER_ROW = 4;
const AISLE_POSITION = 3; // seat 3 of every row is after the aisle

type Step = "seats" | "passengers" | "summary" | "payment";
const STEPS: { id: Step; label: string }[] = [
  { id: "seats", label: "Asientos" },
  { id: "passengers", label: "Pasajeros" },
  { id: "summary", label: "Resumen" },
  { id: "payment", label: "Pago" },
];

type Props = {
  departure: Departure;
  session: Session | null;
  onClose: () => void;
  onLoginRequired: () => void;
  onSessionExpired: () => void;
  onReserved: () => void;
  onPaid: () => void;
};

type SeatMapLoad = { key: string; seatMap?: SeatMap; error?: string };

function emptyPassenger(seat: number): PassengerForm {
  return { seat, name: "", document: "" };
}

// Step-by-step purchase, like airlines do it: seats → one passenger per seat →
// summary → embedded Stripe payment. Closes with the X, Escape or a click outside.
function Purchase({
  departure,
  session,
  onClose,
  onLoginRequired,
  onSessionExpired,
  onReserved,
  onPaid,
}: Props) {
  const [step, setStep] = useState<Step>("seats");
  const [travelDate, setTravelDate] = useState(departure.date ?? isoDate(0));
  const [refreshCount, setRefreshCount] = useState(0);
  const [seatMapLoad, setSeatMapLoad] = useState<SeatMapLoad | null>(null);
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reservation, setReservation] = useState<Reservation | null>(null);

  const loadKey = `${departure.schedule_id}|${travelDate}|${refreshCount}`;
  const isLoadingSeats = seatMapLoad?.key !== loadKey;
  const seatMap = isLoadingSeats ? undefined : seatMapLoad?.seatMap;
  const selectedSeats = passengers.map((passenger) => passenger.seat);
  const total = departure.price * passengers.length;

  // Fetch the seat map every time the date changes.
  useEffect(() => {
    if (!session) return;
    let isCurrent = true;
    apiRequest<SeatMap>(`/schedules/${departure.schedule_id}/seats?date=${travelDate}`)
      .then((data) => isCurrent && setSeatMapLoad({ key: loadKey, seatMap: data }))
      .catch((error) => isCurrent && setSeatMapLoad({ key: loadKey, error: errorText(error) }));
    return () => {
      isCurrent = false;
    };
  }, [loadKey, travelDate, departure.schedule_id, session]);

  // Escape always closes, on any step. The page behind does not scroll.
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

  function changeDate(newDate: string) {
    setTravelDate(newDate || isoDate(0));
    setPassengers([]);
    setErrorMessage("");
  }

  function toggleSeat(seatNumber: number) {
    setErrorMessage("");
    setPassengers((current) => {
      if (current.some((passenger) => passenger.seat === seatNumber)) {
        return current.filter((passenger) => passenger.seat !== seatNumber);
      }
      if (current.length >= MAX_SEATS_PER_PURCHASE) return current;
      const isFirst = current.length === 0;
      const added = { ...emptyPassenger(seatNumber), name: isFirst && session ? session.user.name : "" };
      return [...current, added].sort((a, b) => a.seat - b.seat);
    });
  }

  function updatePassenger(seat: number, field: "name" | "document", value: string) {
    setPassengers((current) =>
      current.map((passenger) =>
        passenger.seat === seat
          ? { ...passenger, [field]: field === "document" ? keepDigits(value) : value.slice(0, NAME_MAX_LENGTH) }
          : passenger
      )
    );
  }

  const allPassengersValid = passengers.every(
    (passenger) => isValidName(passenger.name) && isValidDocument(passenger.document)
  );

  function goToSummary(event: FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    if (allPassengersValid) setStep("summary");
  }

  async function reserveSeats() {
    if (!session) return;
    setIsReserving(true);
    setErrorMessage("");
    try {
      const created = await apiRequest<Reservation>("/purchases", {
        method: "POST",
        token: session.token,
        body: {
          schedule_id: departure.schedule_id,
          date: travelDate,
          passengers: passengers.map((passenger) => ({
            seat: passenger.seat,
            name: normalizeSpaces(passenger.name),
            document: passenger.document.trim(),
          })),
        },
      });
      setReservation(created);
      onReserved(); // the history must show the reservation even if payment is not finished
      setStep("payment");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }
      if (error instanceof ApiError && error.status === 409) {
        // someone took a seat meanwhile: refresh the map and choose again
        setPassengers([]);
        setRefreshCount((n) => n + 1);
        setStep("seats");
      }
      setErrorMessage(errorText(error));
    } finally {
      setIsReserving(false);
    }
  }

  const handleAlreadyPaid = useCallback(() => {
    onPaid();
    onClose();
  }, [onPaid, onClose]);

  const currentStepIndex = STEPS.findIndex((item) => item.id === step);
  const expiresAt = reservation
    ? new Date(reservation.expires_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    : "";

  function goBack() {
    setErrorMessage("");
    if (step === "passengers") setStep("seats");
    if (step === "summary") setStep("passengers");
  }

  return (
    <div className="checkout-backdrop" onClick={onClose}>
      <div
        className="checkout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="checkout-header">
          <div>
            <h2 id="checkout-title">
              {departure.origin} → {departure.destination}
            </h2>
            <p>
              {departure.company} · sale a las {departure.departure_time} ·{" "}
              {formatDuration(departure.duration_min)} de viaje
            </p>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar (Esc)">
            ×
          </button>
        </header>

        {session && (
          <ol className="stepper" aria-label="Pasos de la compra">
            {STEPS.map((item, index) => (
              <li
                key={item.id}
                className={index < currentStepIndex ? "done" : index === currentStepIndex ? "current" : ""}
                aria-current={index === currentStepIndex ? "step" : undefined}
              >
                <span className="step-number">{index < currentStepIndex ? <CheckIcon size={14} /> : index + 1}</span>
                <span className="step-label">{item.label}</span>
              </li>
            ))}
          </ol>
        )}

        {!session ? (
          <div className="checkout-login">
            <BusImage company={departure.company} />
            <p className="notice">
              Para comprar necesitas iniciar sesión. Así tus viajes quedan guardados en tu cuenta.
            </p>
            <button type="button" className="primary-button full-width" onClick={onLoginRequired}>
              Ingresar o crear cuenta
            </button>
          </div>
        ) : (
          <div className="checkout-layout">
            <div className="checkout-main">
              {errorMessage && (
                <div className="notice error" role="alert">
                  {errorMessage}
                </div>
              )}

              {step === "seats" && (
                <section className="checkout-step" aria-label="Elige tus asientos">
                  <div className="step-heading">
                    <h3>Elige tus asientos</h3>
                    <p>Puedes comprar hasta {MAX_SEATS_PER_PURCHASE} asientos. Luego te pedimos los datos de cada pasajero.</p>
                  </div>
                  <div className="field date-field">
                    <label htmlFor="travel-date">Fecha del viaje</label>
                    <input
                      id="travel-date"
                      type="date"
                      value={travelDate}
                      min={isoDate(0)}
                      max={isoDate(SALES_WINDOW_DAYS)}
                      onChange={(e) => changeDate(e.target.value)}
                    />
                  </div>

                  {isLoadingSeats && (
                    <div className="notice loading">
                      <span className="spinner" aria-hidden="true"></span>
                      Cargando asientos...
                    </div>
                  )}
                  {!isLoadingSeats && seatMapLoad?.error && (
                    <div className="notice error" role="alert">
                      {seatMapLoad.error}
                    </div>
                  )}
                  {seatMap && (
                    <div className="seat-picker">
                      <div className="bus" aria-label="Asientos del bus">
                        <div className="bus-front">Conductor</div>
                        {seatMap.seats.map((seat) => {
                          const isSelected = selectedSeats.includes(seat.number);
                          const isTaken = seat.status !== "FREE";
                          const isAfterAisle = seat.number % SEATS_PER_ROW === AISLE_POSITION;
                          return (
                            <button
                              key={seat.number}
                              type="button"
                              className={`seat${isSelected ? " selected" : ""}${isAfterAisle ? " after-aisle" : ""}`}
                              disabled={isTaken}
                              aria-pressed={isSelected}
                              aria-label={`Asiento ${seat.number}${isTaken ? ", ocupado" : ""}`}
                              onClick={() => toggleSeat(seat.number)}
                            >
                              {seat.number}
                            </button>
                          );
                        })}
                      </div>
                      <div className="legend">
                        <span>
                          <i className="swatch"></i> Libre
                        </span>
                        <span>
                          <i className="swatch selected"></i> Tu elección
                        </span>
                        <span>
                          <i className="swatch taken"></i> Ocupado
                        </span>
                      </div>
                      <p className="seat-count">
                        {seatMap.free_seats} libres · elegiste {passengers.length} de {MAX_SEATS_PER_PURCHASE}
                      </p>
                    </div>
                  )}
                  <div className="step-actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={passengers.length === 0}
                      onClick={() => {
                        setShowErrors(false);
                        setStep("passengers");
                      }}
                    >
                      Continuar con {passengers.length || ""} {passengers.length === 1 ? "pasajero" : "pasajeros"}
                    </button>
                  </div>
                </section>
              )}

              {step === "passengers" && (
                <form className="checkout-step" onSubmit={goToSummary} noValidate aria-label="Datos de los pasajeros">
                  <div className="step-heading">
                    <h3>¿Quiénes viajan?</h3>
                    <p>Escribe los datos de cada pasajero tal como aparecen en su documento.</p>
                  </div>
                  {passengers.map((passenger, index) => {
                    const nameError = showErrors && !isValidName(passenger.name);
                    const documentError = showErrors && !isValidDocument(passenger.document);
                    return (
                      <fieldset key={passenger.seat} className="passenger-card">
                        <legend>
                          Pasajero {index + 1} <span className="seat-tag">Asiento {passenger.seat}</span>
                        </legend>
                        <div className="field-row">
                          <div className="field">
                            <label htmlFor={`name-${passenger.seat}`}>Nombre completo</label>
                            <input
                              id={`name-${passenger.seat}`}
                              value={passenger.name}
                              onChange={(e) => updatePassenger(passenger.seat, "name", e.target.value)}
                              maxLength={NAME_MAX_LENGTH}
                              autoComplete={index === 0 ? "name" : "off"}
                              aria-invalid={nameError}
                            />
                            {nameError && <small className="field-error">{NAME_RULE}</small>}
                          </div>
                          <div className="field">
                            <label htmlFor={`document-${passenger.seat}`}>Número de documento</label>
                            <input
                              id={`document-${passenger.seat}`}
                              value={passenger.document}
                              onChange={(e) => updatePassenger(passenger.seat, "document", e.target.value)}
                              maxLength={DOCUMENT_MAX_LENGTH}
                              inputMode="numeric"
                              aria-invalid={documentError}
                            />
                            {documentError && <small className="field-error">{DOCUMENT_RULE}</small>}
                          </div>
                        </div>
                      </fieldset>
                    );
                  })}
                  <div className="step-actions">
                    <button type="button" className="secondary-button" onClick={goBack}>
                      <ArrowLeftIcon size={16} /> Cambiar asientos
                    </button>
                    <button type="submit" className="primary-button">
                      Ver resumen
                    </button>
                  </div>
                </form>
              )}

              {step === "summary" && (
                <section className="checkout-step" aria-label="Resumen de la compra">
                  <div className="step-heading">
                    <h3>Revisa tu compra</h3>
                    <p>Al continuar, los asientos quedan apartados 15 minutos mientras pagas.</p>
                  </div>
                  <ul className="summary-list">
                    {passengers.map((passenger, index) => (
                      <li key={passenger.seat}>
                        <span className="seat-tag">Asiento {passenger.seat}</span>
                        <span>
                          <strong>{normalizeSpaces(passenger.name)}</strong>
                          <small>
                            Pasajero {index + 1} · Documento {passenger.document}
                          </small>
                        </span>
                        <span>{formatPrice(departure.price)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="step-actions">
                    <button type="button" className="secondary-button" onClick={goBack} disabled={isReserving}>
                      <ArrowLeftIcon size={16} /> Editar pasajeros
                    </button>
                    <button type="button" className="primary-button" onClick={reserveSeats} disabled={isReserving}>
                      {isReserving ? "Apartando asientos..." : `Ir a pagar ${formatPrice(total)}`}
                    </button>
                  </div>
                </section>
              )}

              {step === "payment" && reservation && (
                <section className="checkout-step" aria-label="Pago">
                  <div className="step-heading">
                    <h3>Pago con tarjeta</h3>
                    <p className="hold-notice">
                      <ClockIcon size={16} /> Tus asientos están apartados hasta las <b>{expiresAt}</b>. Si cierras
                      esta ventana, puedes terminar el pago en <b>Mis viajes</b>.
                    </p>
                  </div>
                  <EmbeddedPayment
                    paymentId={reservation.payment_id}
                    token={session.token}
                    onSessionExpired={onSessionExpired}
                    onAlreadyPaid={handleAlreadyPaid}
                  />
                </section>
              )}
            </div>

            <aside className="checkout-summary" aria-label="Tu viaje">
              <BusImage
                company={departure.company}
                plate={seatMap?.departure.plate}
                capacity={seatMap?.departure.capacity}
              />
              <dl>
                <div>
                  <dt>Fecha</dt>
                  <dd>{formatLongDate(travelDate)}</dd>
                </div>
                <div>
                  <dt>Salida</dt>
                  <dd>{departure.departure_time}</dd>
                </div>
                <div>
                  <dt>Asientos</dt>
                  <dd>{selectedSeats.length ? selectedSeats.join(", ") : "—"}</dd>
                </div>
                <div>
                  <dt>Precio por pasajero</dt>
                  <dd>{formatPrice(departure.price)}</dd>
                </div>
              </dl>
              <div className="checkout-total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export default Purchase;
