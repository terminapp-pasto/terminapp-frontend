import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ApiError,
  apiRequest,
  currentColombiaTime,
  errorText,
  formatColombiaTime,
  formatDuration,
  formatLongDate,
  formatPrice,
  isoDate,
} from "./api";
import BusImage from "./BusImage";
import Countdown from "./Countdown";
import EmbeddedPayment from "./EmbeddedPayment";
import FieldHint from "./FieldHint";
import AuthForm from "./AuthForm";
import { ArrowLeftIcon, ArrowRightIcon, BackpackIcon, CheckIcon, LuggageIcon, PhoneIcon } from "./Icons";
import ScreenShell from "./ScreenShell";
import { loadContactPhone, saveContactPhone } from "./session";
import type { Session } from "./session";
import type { Departure, PassengerForm, Reservation, SeatMap } from "./types";
import {
  DEFAULT_DOCUMENT_TYPE,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_CODES,
  NAME_MAX_LENGTH,
  NAME_RULE,
  MAX_CHECKED_BAGS,
  PHONE_RULE,
  cleanDocumentInput,
  cleanPhoneInput,
  isValidPhone,
  isValidDocumentOfType,
  isValidName,
  normalizeSpaces,
  setDocumentTypes,
} from "./validation";
import type { DocumentType, DocumentTypeInfo } from "./validation";

// Defaults while the seat map loads: each company sets its own in the admin panel.
const DEFAULT_MAX_SEATS = 5;
const DEFAULT_RESERVATION_MINUTES = 10;
const SALES_WINDOW_DAYS = 60;
const SEATS_PER_ROW = 4;
const AISLE_POSITION = 3; // seat 3 of every row is after the aisle

type Step = "seats" | "passengers" | "luggage" | "summary" | "payment";
const STEPS: { id: Step; label: string }[] = [
  { id: "seats", label: "Asientos" },
  { id: "passengers", label: "Pasajeros" },
  { id: "luggage", label: "Equipaje" },
  { id: "summary", label: "Resumen" },
  { id: "payment", label: "Pago" },
];

type Props = {
  departure: Departure;
  session: Session | null;
  onClose: () => void;
  onLogin: (session: Session) => void;
  onSessionExpired: () => void;
  onReserved: () => void;
  onPaid: () => void;
};

type SeatMapLoad = { key: string; seatMap?: SeatMap; error?: string };

function emptyPassenger(seat: number): PassengerForm {
  return { seat, name: "", document_type: DEFAULT_DOCUMENT_TYPE, document: "", checked_bags: 1 };
}

// Step-by-step purchase, like airlines do it: seats → one passenger per seat →
// luggage → summary → embedded Stripe payment. It is a full-screen page (not a window),
// so a click outside cannot close it by accident; "Volver" asks first when it matters.
function Purchase({
  departure,
  session,
  onClose,
  onLogin,
  onSessionExpired,
  onReserved,
  onPaid,
}: Props) {
  const [step, setStep] = useState<Step>("seats");
  const [travelDate, setTravelDate] = useState(departure.date ?? isoDate(0));
  const [refreshCount, setRefreshCount] = useState(0);
  const [seatMapLoad, setSeatMapLoad] = useState<SeatMapLoad | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [firstPassengerIsMe, setFirstPassengerIsMe] = useState(true);
  const [seatHint, setSeatHint] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [paymentDeadline, setPaymentDeadline] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState(loadContactPhone);
  const [, setDocumentTypesLoaded] = useState(false);

  const loadKey = `${departure.schedule_id}|${travelDate}|${refreshCount}`;
  const isLoadingSeats = seatMapLoad?.key !== loadKey;
  const seatMap = isLoadingSeats ? undefined : seatMapLoad?.seatMap;
  const selectedSeats = passengers.map((passenger) => passenger.seat);
  // The price comes from the server's seat map, not from the search card: if it changed
  // since the search, the page shows what Stripe will really charge.
  const unitPrice = seatMap?.departure.price ?? departure.price;
  const total = unitPrice * passengers.length;
  const totalBags = passengers.reduce((sum, passenger) => sum + passenger.checked_bags, 0);
  const missingSeats = passengerCount - passengers.length;
  // A bus that already left today cannot be sold: say it before the user picks seats.
  const hasDeparted = travelDate === isoDate(0) && departure.departure_time <= currentColombiaTime();
  const myName = session ? normalizeSpaces(session.user.name) : "";
  // Each company decides how many seats one purchase may take and how long the seats are held.
  const maxSeats = seatMap?.departure.max_seats_per_purchase ?? DEFAULT_MAX_SEATS;
  const reservationMinutes = seatMap?.departure.reservation_minutes ?? DEFAULT_RESERVATION_MINUTES;

  // The accepted document types come from the backend (the admin can add more).
  useEffect(() => {
    let isCurrent = true;
    apiRequest<DocumentTypeInfo[]>("/document-types")
      .then((types) => {
        if (!isCurrent) return;
        setDocumentTypes(types);
        setDocumentTypesLoaded(true);
      })
      .catch(() => {
        // without an answer the four usual types are offered; the backend checks again
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  // Passenger 1 can be the logged-in user ("Soy yo"): their name comes from the account.
  function passengerName(passenger: PassengerForm, index: number) {
    return index === 0 && firstPassengerIsMe ? myName : passenger.name;
  }

  // Fetch the seat map every time the date changes.
  useEffect(() => {
    if (!session) return;
    let isCurrent = true;
    apiRequest<SeatMap>(`/schedules/${departure.schedule_id}/seats?date=${travelDate}`)
      .then((data) => {
        if (!isCurrent) return;
        setSeatMapLoad({ key: loadKey, seatMap: data });
        // if this company allows fewer seats than were chosen, trim the selection
        const limit = data.departure.max_seats_per_purchase ?? DEFAULT_MAX_SEATS;
        setPassengerCount((count) => Math.min(count, limit));
        setPassengers((current) => current.slice(0, limit));
      })
      .catch((error) => isCurrent && setSeatMapLoad({ key: loadKey, error: errorText(error) }));
    return () => {
      isCurrent = false;
    };
  }, [loadKey, travelDate, departure.schedule_id, session]);

  // In the summary and payment steps, closing by accident would lose typed data or leave
  // a payment open without the user noticing, so the window asks first.
  const closingNeedsConfirmation = step === "summary" || step === "payment";

  // "Volver" (or Escape): leaves at once in the first steps, asks first in summary and
  // payment; if the question is open, Escape closes the question.
  function requestClose() {
    if (isConfirmingClose) setIsConfirmingClose(false);
    else if (closingNeedsConfirmation) setIsConfirmingClose(true);
    else onClose();
  }

  function changeDate(newDate: string) {
    setTravelDate(newDate || isoDate(0));
    setPassengers([]);
    setSeatHint("");
    setErrorMessage("");
  }

  function changePassengerCount(newCount: number) {
    const count = Math.min(maxSeats, Math.max(1, newCount));
    setPassengerCount(count);
    setSeatHint("");
    // fewer travellers than chosen seats: release the extra seats
    setPassengers((current) => current.slice(0, count));
  }

  function toggleSeat(seatNumber: number) {
    setErrorMessage("");
    const isSelected = passengers.some((passenger) => passenger.seat === seatNumber);
    if (isSelected) {
      setSeatHint("");
      setPassengers(passengers.filter((passenger) => passenger.seat !== seatNumber));
      return;
    }
    if (passengers.length >= passengerCount) {
      setSeatHint(
        `Ya elegiste ${passengerCount} ${passengerCount === 1 ? "asiento" : "asientos"}. ` +
          "Toca uno de los tuyos para quitarlo, o suma otro pasajero."
      );
      return;
    }
    setSeatHint("");
    setPassengers([...passengers, emptyPassenger(seatNumber)].sort((a, b) => a.seat - b.seat));
  }

  function updateBags(seat: number, bags: number) {
    const count = Math.min(MAX_CHECKED_BAGS, Math.max(0, bags));
    setPassengers((current) =>
      current.map((passenger) => (passenger.seat === seat ? { ...passenger, checked_bags: count } : passenger))
    );
  }

  function updatePassenger(seat: number, field: "name" | "document", value: string) {
    setPassengers((current) =>
      current.map((passenger) =>
        passenger.seat === seat
          ? {
              ...passenger,
              [field]:
                field === "document"
                  ? cleanDocumentInput(value, passenger.document_type)
                  : value.slice(0, NAME_MAX_LENGTH),
            }
          : passenger
      )
    );
  }

  // Changing the type re-cleans what was typed (a passport may have letters, a cédula may not).
  function updateDocumentType(seat: number, documentType: DocumentType) {
    setPassengers((current) =>
      current.map((passenger) =>
        passenger.seat === seat
          ? { ...passenger, document_type: documentType, document: cleanDocumentInput(passenger.document, documentType) }
          : passenger
      )
    );
  }

  // Copies passenger 1's document type to the others (copying the name and number made
  // every ticket belong to the same person).
  function copyFirstPassengerToAll() {
    const firstDocumentType = passengers[0].document_type;
    setPassengers((current) =>
      current.map((passenger, index) =>
        index === 0
          ? passenger
          : { ...passenger, document_type: firstDocumentType, document: cleanDocumentInput(passenger.document, firstDocumentType) }
      )
    );
  }

  // A ticket belongs to one person: the same document cannot travel twice in one purchase.
  function isRepeatedDocument(index: number) {
    const { document, document_type } = passengers[index];
    return (
      document.trim() !== "" &&
      passengers.some(
        (other, otherIndex) =>
          otherIndex < index && other.document_type === document_type && other.document.trim() === document.trim()
      )
    );
  }

  const allPassengersValid = passengers.every(
    (passenger, index) =>
      isValidName(passengerName(passenger, index)) &&
      isValidDocumentOfType(passenger.document, passenger.document_type) &&
      !isRepeatedDocument(index)
  );

  const phoneIsValid = isValidPhone(contactPhone);

  function goToLuggage(event: FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    if (allPassengersValid && phoneIsValid) setStep("luggage");
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
          contact_phone: contactPhone,
          passengers: passengers.map((passenger, index) => ({
            seat: passenger.seat,
            name: normalizeSpaces(passengerName(passenger, index)),
            document_type: passenger.document_type,
            document: passenger.document.trim(),
            checked_bags: passenger.checked_bags,
          })),
        },
      });
      saveContactPhone(contactPhone);
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
    ? formatColombiaTime(paymentDeadline ?? reservation.expires_at)
    : "";

  function goBack() {
    setErrorMessage("");
    if (step === "passengers") setStep("seats");
    if (step === "luggage") setStep("passengers");
    if (step === "summary") setStep("luggage");
  }

  return (
    <ScreenShell
      titleId="checkout-title"
      title={
        <>
          {departure.origin} <ArrowRightIcon size={18} /> {departure.destination}
        </>
      }
      subtitle={`${departure.company} · sale a las ${departure.departure_time} · ${formatDuration(departure.duration_min)} de viaje`}
      backLabel={step === "payment" ? "Salir del pago" : "Volver"}
      onBack={requestClose}
      aside={
        <span className="screen-price">
          <small>{session && passengers.length > 0 ? "Total" : "Por pasajero"}</small>
          {formatPrice(session && passengers.length > 0 ? total : unitPrice)}
        </span>
      }
    >
      <div className="checkout">
        {isConfirmingClose && (
          <div className="close-confirmation" role="alert" aria-labelledby="close-question">
            <div className="close-confirmation-box">
              <h3 id="close-question">¿Salir de la compra?</h3>
              <p>
                {step === "payment"
                  ? `Tus asientos siguen apartados hasta las ${expiresAt} y puedes terminar el pago en Mis viajes.`
                  : "Se perderán los datos de los pasajeros que escribiste."}
              </p>
              <div className="close-confirmation-actions">
                <button type="button" className="secondary-button" onClick={onClose}>
                  Salir
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setIsConfirmingClose(false)}
                  autoFocus
                >
                  Seguir comprando
                </button>
              </div>
            </div>
          </div>
        )}

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
          <div className="checkout-layout">
            <div className="checkout-main">
              <section className="checkout-login" aria-labelledby="checkout-login-title">
                <div className="step-heading">
                  <h3 id="checkout-login-title">Ingresa para elegir tus asientos</h3>
                  <p>Tus viajes quedan guardados en tu cuenta. Apenas entres, sigues con esta compra.</p>
                </div>
                <AuthForm onLogin={onLogin} idPrefix="checkout" />
              </section>
            </div>
            <aside className="checkout-summary" aria-label="Tu viaje">
              <BusImage company={departure.company} />
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
                  <dt>Precio por pasajero</dt>
                  <dd>{formatPrice(departure.price)}</dd>
                </div>
              </dl>
            </aside>
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
                    <h3>¿Cuántos viajan y en qué asientos?</h3>
                    <p>
                      Hasta {maxSeats} {maxSeats === 1 ? "pasajero" : "pasajeros"} por compra con{" "}
                      {departure.company}, un asiento para cada uno.
                    </p>
                  </div>
                  <div className="trip-options">
                    <div className="field">
                      <span className="label" id="passenger-count-label">Pasajeros</span>
                      <div className="counter" role="group" aria-labelledby="passenger-count-label">
                        <button
                          type="button"
                          aria-label="Quitar un pasajero"
                          disabled={passengerCount <= 1}
                          onClick={() => changePassengerCount(passengerCount - 1)}
                        >
                          −
                        </button>
                        <output aria-live="polite">{passengerCount}</output>
                        <button
                          type="button"
                          aria-label="Agregar un pasajero"
                          disabled={passengerCount >= maxSeats}
                          onClick={() => changePassengerCount(passengerCount + 1)}
                        >
                          +
                        </button>
                      </div>
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
                  </div>

                  {hasDeparted && (
                    <div className="notice error" role="alert">
                      Este bus ya salió hoy a las {departure.departure_time}. Elige otra fecha.
                    </div>
                  )}
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
                              disabled={isTaken || hasDeparted}
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
                        {seatMap.free_seats} libres · elegiste {passengers.length} de {passengerCount}
                      </p>
                      {seatHint && (
                        <p className="seat-hint" role="status">
                          {seatHint}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="step-actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={missingSeats > 0 || hasDeparted}
                      onClick={() => {
                        setShowErrors(false);
                        setStep("passengers");
                      }}
                    >
                      {missingSeats > 0
                        ? `Elige ${missingSeats} ${missingSeats === 1 ? "asiento" : "asientos"} más`
                        : `Continuar con ${passengerCount} ${passengerCount === 1 ? "pasajero" : "pasajeros"}`}
                    </button>
                  </div>
                </section>
              )}

              {step === "passengers" && (
                <form className="checkout-step" onSubmit={goToLuggage} noValidate aria-label="Datos de los pasajeros">
                  <div className="step-heading">
                    <h3>¿Quiénes viajan?</h3>
                    <p>Escribe los datos de cada pasajero tal como aparecen en su documento.</p>
                  </div>
                  <fieldset className="passenger-card contact-card">
                    <legend>
                      <PhoneIcon size={16} /> Contacto
                    </legend>
                    <div className="field">
                      <label htmlFor="contact-phone">Celular</label>
                      <div className="phone-input">
                        <span aria-hidden="true">+57</span>
                        <input
                          id="contact-phone"
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(cleanPhoneInput(e.target.value))}
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="300 123 4567"
                          aria-invalid={showErrors && !phoneIsValid}
                          aria-describedby="contact-phone-hint"
                        />
                      </div>
                      <small
                        id="contact-phone-hint"
                        className={showErrors && !phoneIsValid ? "field-error" : "hint"}
                      >
                        {PHONE_RULE} Lo usamos para avisarte cambios del viaje y mandarte el itinerario.
                      </small>
                    </div>
                  </fieldset>
                  {passengers.map((passenger, index) => {
                    const isMe = index === 0 && firstPassengerIsMe;
                    const nameError = showErrors && !isValidName(passengerName(passenger, index));
                    const documentRule = DOCUMENT_TYPES[passenger.document_type];
                    const isRepeated = isRepeatedDocument(index);
                    const documentError =
                      (showErrors && !isValidDocumentOfType(passenger.document, passenger.document_type)) || isRepeated;
                    return (
                      <fieldset key={passenger.seat} className="passenger-card">
                        <legend>
                          Pasajero {index + 1} <span className="seat-tag">Asiento {passenger.seat}</span>
                        </legend>
                        {index === 0 && (
                          <label className="me-toggle">
                            <input
                              type="checkbox"
                              checked={firstPassengerIsMe}
                              onChange={(e) => setFirstPassengerIsMe(e.target.checked)}
                            />
                            Soy yo ({myName})
                          </label>
                        )}
                        <div className="field-row">
                          <div className="field">
                            <label htmlFor={`name-${passenger.seat}`}>Nombre completo</label>
                            <input
                              id={`name-${passenger.seat}`}
                              value={passengerName(passenger, index)}
                              onChange={(e) => updatePassenger(passenger.seat, "name", e.target.value)}
                              readOnly={isMe}
                              title={isMe ? "Es el nombre de tu cuenta. Desmarca \"Soy yo\" si viaja otra persona." : undefined}
                              maxLength={NAME_MAX_LENGTH}
                              autoComplete={index === 0 ? "name" : "off"}
                              aria-invalid={nameError}
                            />
                            <FieldHint
                              text={
                                nameError && isMe
                                  ? "El nombre de tu cuenta no es válido para el tiquete. Desmarca \"Soy yo\" y escríbelo."
                                  : NAME_RULE
                              }
                              isError={nameError}
                              length={passengerName(passenger, index).length}
                              maxLength={NAME_MAX_LENGTH}
                            />
                          </div>
                          <div className="field document-type-field">
                            <label htmlFor={`document-type-${passenger.seat}`}>Tipo de documento</label>
                            <select
                              id={`document-type-${passenger.seat}`}
                              value={passenger.document_type}
                              onChange={(e) => updateDocumentType(passenger.seat, e.target.value as DocumentType)}
                            >
                              {DOCUMENT_TYPE_CODES.map((code) => (
                                <option key={code} value={code} title={DOCUMENT_TYPES[code].label}>
                                  {code} · {DOCUMENT_TYPES[code].shortLabel}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor={`document-${passenger.seat}`}>Número de documento</label>
                            <input
                              id={`document-${passenger.seat}`}
                              value={passenger.document}
                              onChange={(e) => updatePassenger(passenger.seat, "document", e.target.value)}
                              maxLength={documentRule.maxLength}
                              inputMode={documentRule.onlyDigits ? "numeric" : "text"}
                              autoCapitalize="characters"
                              aria-invalid={documentError}
                            />
                            <FieldHint
                              text={isRepeated ? "Este documento ya está en otro pasajero: cada tiquete es de una persona." : documentRule.rule}
                              isError={documentError}
                              length={passenger.document.length}
                              maxLength={documentRule.maxLength}
                            />
                          </div>
                        </div>
                        {index === 0 && passengers.length > 1 && (
                          <button
                            type="button"
                            className="text-button copy-name-button"
                            onClick={copyFirstPassengerToAll}
                          >
                            Usar el mismo tipo de documento para los {passengers.length} pasajeros
                          </button>
                        )}
                      </fieldset>
                    );
                  })}
                  <div className="step-actions">
                    <button type="button" className="secondary-button" onClick={goBack}>
                      <ArrowLeftIcon size={16} /> Cambiar asientos
                    </button>
                    <button type="submit" className="primary-button">
                      Continuar al equipaje <ArrowRightIcon size={16} />
                    </button>
                  </div>
                </form>
              )}

              {step === "luggage" && (
                <section className="checkout-step" aria-label="Equipaje">
                  <div className="step-heading">
                    <h3>¿Cuánto equipaje llevan?</h3>
                    <p>
                      Cada pasajero lleva gratis un bolso de mano (hasta 8 kg, va contigo). Las maletas van en la
                      bodega del bus, hasta {MAX_CHECKED_BAGS} por pasajero y 20 kg cada una.
                    </p>
                  </div>
                  <ul className="luggage-list">
                    {passengers.map((passenger, index) => (
                      <li key={passenger.seat} className="luggage-row">
                        <div className="luggage-who">
                          <strong>{normalizeSpaces(passengerName(passenger, index)) || `Pasajero ${index + 1}`}</strong>
                          <span className="seat-tag">Asiento {passenger.seat}</span>
                        </div>
                        <div className="luggage-included">
                          <BackpackIcon size={18} /> Bolso de mano <b>incluido</b>
                        </div>
                        <div className="luggage-bags">
                          <LuggageIcon size={18} />
                          <span id={`bags-label-${passenger.seat}`}>Maletas en bodega</span>
                          <div className="counter" role="group" aria-labelledby={`bags-label-${passenger.seat}`}>
                            <button
                              type="button"
                              aria-label="Quitar una maleta"
                              disabled={passenger.checked_bags <= 0}
                              onClick={() => updateBags(passenger.seat, passenger.checked_bags - 1)}
                            >
                              −
                            </button>
                            <output aria-live="polite">{passenger.checked_bags}</output>
                            <button
                              type="button"
                              aria-label="Agregar una maleta"
                              disabled={passenger.checked_bags >= MAX_CHECKED_BAGS}
                              onClick={() => updateBags(passenger.seat, passenger.checked_bags + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="note">
                    Por ahora el equipaje no tiene costo extra. Marca tus maletas con tu nombre y entrégalas en la
                    bodega antes de abordar.
                  </p>
                  <div className="step-actions">
                    <button type="button" className="secondary-button" onClick={goBack}>
                      <ArrowLeftIcon size={16} /> Pasajeros
                    </button>
                    <button type="button" className="primary-button" onClick={() => setStep("summary")}>
                      Ver resumen <ArrowRightIcon size={16} />
                    </button>
                  </div>
                </section>
              )}

              {step === "summary" && (
                <section className="checkout-step" aria-label="Resumen de la compra">
                  <div className="step-heading">
                    <h3>Revisa tu compra</h3>
                    <p>Al continuar, los asientos quedan apartados {reservationMinutes} minutos para que pagues.</p>
                  </div>
                  <ul className="summary-list">
                    {passengers.map((passenger, index) => (
                      <li key={passenger.seat}>
                        <span className="seat-tag">Asiento {passenger.seat}</span>
                        <span>
                          <strong>{normalizeSpaces(passengerName(passenger, index))}</strong>
                          <small>
                            Pasajero {index + 1} · {passenger.document_type} {passenger.document} ·{" "}
                            {passenger.checked_bags === 0
                              ? "solo bolso de mano"
                              : `${passenger.checked_bags} ${passenger.checked_bags === 1 ? "maleta" : "maletas"}`}
                          </small>
                        </span>
                        <span>{formatPrice(unitPrice)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="summary-contact">
                    <PhoneIcon size={16} /> Te contactamos al <b>+57 {contactPhone}</b>
                  </p>
                  <details className="purchase-terms">
                    <summary>Términos de compra y tratamiento de datos</summary>
                    <ul>
                      <li>
                        Los asientos quedan apartados {reservationMinutes} minutos (lo define {departure.company}). Si
                        no pagas en ese tiempo, se liberan para otros viajeros y el pago se cierra.
                      </li>
                      <li>Puedes cancelar sin costo una compra que todavía no has pagado, desde Mis viajes.</li>
                      <li>
                        Si tu pago llega cuando la reserva ya venció y los asientos se vendieron, te devolvemos el
                        dinero completo.
                      </li>
                      <li>
                        Usamos el nombre y el documento de cada pasajero solo para emitir su tiquete, según la Ley 1581
                        de 2012 de protección de datos personales.
                      </li>
                      <li>TerminAPP es un proyecto académico: los pagos son de prueba y no se cobra dinero real.</li>
                    </ul>
                  </details>
                  <label className="terms-check">
                    <input
                      id="accept-terms"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                    />
                    Acepto los términos de compra y autorizo el tratamiento de los datos de los pasajeros.
                  </label>
                  <div className="step-actions">
                    <button type="button" className="secondary-button" onClick={goBack} disabled={isReserving}>
                      <ArrowLeftIcon size={16} /> Equipaje
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={reserveSeats}
                      disabled={isReserving || !acceptedTerms}
                      title={acceptedTerms ? undefined : "Primero acepta los términos de compra"}
                    >
                      {isReserving ? "Apartando asientos..." : `Ir a pagar ${formatPrice(total)}`}
                    </button>
                  </div>
                </section>
              )}

              {step === "payment" && reservation && (
                <section className="checkout-step" aria-label="Pago">
                  <div className="step-heading">
                    <h3>Pago con tarjeta</h3>
                    {reservation.booking_code && (
                      <span className="booking-code">
                        Código de reserva <b>{reservation.booking_code}</b>
                      </span>
                    )}
                    <Countdown deadline={paymentDeadline ?? reservation.expires_at} />
                    <p>
                      Si sales de esta página, puedes terminar el pago en <b>Mis viajes</b> mientras corra el tiempo.
                    </p>
                  </div>
                  <EmbeddedPayment
                    paymentId={reservation.payment_id}
                    token={session.token}
                    onSessionExpired={onSessionExpired}
                    onAlreadyPaid={handleAlreadyPaid}
                    onDeadline={setPaymentDeadline}
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
                  <dt>Maletas en bodega</dt>
                  <dd>{passengers.length ? totalBags : "—"}</dd>
                </div>
                <div>
                  <dt>Precio por pasajero</dt>
                  <dd>{formatPrice(unitPrice)}</dd>
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
    </ScreenShell>
  );
}

export default Purchase;
