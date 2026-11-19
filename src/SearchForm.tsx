import { useAppSettings } from "./appSettings";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiRequest, errorText, formatLongDate, isoDate } from "./api";
import DepartureCard from "./DepartureCard";
import type { Departure } from "./types";

const DEFAULT_START_TIME = "00:00";
// Preselected if it is in the list; any destination of the database works
const PREFERRED_DESTINATION = "Cali";

type SearchStatus = "idle" | "loading" | "error" | "done";
type SortBy = "time" | "price";
type SearchResponse = { destination: string; date: string; departures: Departure[] };
type DestinationsResponse = { origin: string; destinations: string[] };
type DestinationsLoad = { status: "loading" | "error" | "done"; origin: string; names: string[] };

function SearchForm({ onBuy }: { onBuy: (departure: Departure) => void }) {
  const { sales_window_days: salesWindowDays } = useAppSettings();
  const [destination, setDestination] = useState("");
  const [destinationsLoad, setDestinationsLoad] = useState<DestinationsLoad>({ status: "loading", origin: "", names: [] });
  const [destinationsAttempt, setDestinationsAttempt] = useState(0);
  const destinations = destinationsLoad.names;

  // Origin and destinations come only from the database (/destinations): a town the
  // admin adds appears here without changing the code, and none is written in it.
  useEffect(() => {
    let isCurrent = true;
    apiRequest<DestinationsResponse>("/destinations")
      .then((data) => {
        if (!isCurrent) return;
        setDestinationsLoad({ status: "done", origin: data.origin, names: data.destinations });
        setDestination((current) =>
          data.destinations.includes(current)
            ? current
            : data.destinations.includes(PREFERRED_DESTINATION)
              ? PREFERRED_DESTINATION
              : (data.destinations[0] ?? "")
        );
      })
      .catch(() => isCurrent && setDestinationsLoad((current) => ({ ...current, status: "error" })));
    return () => {
      isCurrent = false;
    };
  }, [destinationsAttempt]);

  function retryDestinations() {
    setDestinationsLoad((current) => ({ ...current, status: "loading" }));
    setDestinationsAttempt((n) => n + 1);
  }
  const [travelDate, setTravelDate] = useState(isoDate(0));
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [lastSearch, setLastSearch] = useState({ destination: "", date: "", startTime: "" });
  const [sortBy, setSortBy] = useState<SortBy>("time");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  async function searchDepartures(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const params = new URLSearchParams({
      destination,
      date: travelDate,
      from_time: startTime,
      sort_by: sortBy,
    });

    try {
      const data = await apiRequest<SearchResponse>(`/search?${params}`);
      setDepartures(data.departures);
      setLastSearch({ destination: data.destination, date: data.date, startTime });
      setStatus("done");
    } catch (error) {
      setErrorMessage(errorText(error));
      setStatus("error");
    }
  }

  return (
    <>
      <form className="search-form" onSubmit={searchDepartures}>
        <div className="field">
          <label htmlFor="origin">Origen</label>
          <input id="origin" value={destinationsLoad.origin || "Cargando..."} disabled />
        </div>

        <div className="field">
          <label htmlFor="destination">Destino</label>
          <select
            id="destination"
            value={destination}
            disabled={destinations.length === 0}
            onChange={(e) => setDestination(e.target.value)}
          >
            {destinations.length === 0 && (
              <option value="">
                {destinationsLoad.status === "error" ? "No se pudieron cargar" : "Cargando destinos..."}
              </option>
            )}
            {destinations.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {destinationsLoad.status === "error" && (
            <button type="button" className="text-button" onClick={retryDestinations}>
              Reintentar
            </button>
          )}
        </div>

        <div className="field">
          <label htmlFor="search-date">Fecha</label>
          <input
            id="search-date"
            type="date"
            value={travelDate}
            min={isoDate(0)}
            max={isoDate(salesWindowDays)}
            onChange={(e) => setTravelDate(e.target.value || isoDate(0))}
          />
        </div>

        <div className="field">
          <label htmlFor="start-time">Salir desde</label>
          <input
            id="start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value || DEFAULT_START_TIME)}
          />
        </div>

        <div className="field">
          <label htmlFor="sort-by">Ordenar por</label>
          <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
            <option value="time">Hora de salida</option>
            <option value="price">Precio más bajo</option>
          </select>
        </div>

        <button type="submit" disabled={status === "loading" || !destination}>
          {status === "loading" ? "Buscando..." : "Buscar pasajes"}
        </button>
      </form>

      {status === "idle" && (
        <p className="notice">Elige tu destino, el día y la hora desde la que quieres salir.</p>
      )}

      {status === "loading" && (
        <div className="notice loading">
          <span className="spinner" aria-hidden="true"></span>
          Buscando salidas... La primera búsqueda puede tardar hasta un minuto
          mientras el servidor se activa.
        </div>
      )}

      {status === "error" && (
        <div className="notice error" role="alert">
          {errorMessage}
        </div>
      )}

      {status === "done" && departures.length === 0 && (
        <p className="notice">
          No hay salidas a {lastSearch.destination} el {formatLongDate(lastSearch.date)} desde las{" "}
          {lastSearch.startTime}.{" "}
          {lastSearch.startTime === DEFAULT_START_TIME
            ? "Prueba con otro día."
            : "Prueba con una hora más temprana u otro día."}
        </p>
      )}

      {status === "done" && departures.length > 0 && (
        <section>
          <h2 className="summary">
            {departures.length} {departures.length === 1 ? "salida" : "salidas"} de {destinationsLoad.origin} a{" "}
            {lastSearch.destination} · {formatLongDate(lastSearch.date)}
          </h2>
          <ul className="results">
            {departures.map((departure) => (
              <DepartureCard key={departure.schedule_id} departure={departure} onBuy={onBuy} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default SearchForm;
