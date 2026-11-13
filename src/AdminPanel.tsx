import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ApiError, apiRequest, errorText, formatDuration, formatLongDate, formatPrice, isoDate } from "./api";
import AdminAssistant from "./AdminAssistant";
import {
  MAX_PRICE,
  MAX_RESERVATION_MINUTES,
  MAX_SEATS_LIMIT,
  MIN_PRICE,
  MIN_RESERVATION_MINUTES,
  ROLE_LABELS,
} from "./adminApi";
import type { AdminDocumentType, AdminRoute, AdminUser, Bus, Company, Occupancy } from "./adminApi";
import { BusIcon, ChatIcon, CheckIcon, ClockIcon, SearchIcon, TicketIcon, UserIcon } from "./Icons";
import type { Session } from "./session";
import "./admin.css";

type Tab = "occupancy" | "routes" | "companies" | "buses" | "documents" | "users" | "assistant";
type Notice = { kind: "success" | "error"; text: string } | null;

type Props = {
  session: Session;
  onSessionExpired: () => void;
};

export type AdminCall = <T>(path: string, body?: unknown) => Promise<T>;

// Admin panel: the terminal admin manages every company; a company employee only theirs.
// Everything is on the page (no windows): forms and confirmations are inline.
function AdminPanel({ session, onSessionExpired }: Props) {
  const isAdmin = session.user.role === "admin";
  const [tab, setTab] = useState<Tab>("occupancy");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<AdminRoute[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);

  const call: AdminCall = useCallback(
    async <T,>(path: string, body?: unknown) => {
      try {
        return await apiRequest<T>(path, {
          method: body === undefined ? "GET" : "POST",
          body,
          token: session.token,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) onSessionExpired();
        throw error;
      }
    },
    [session.token, onSessionExpired]
  );

  const reload = useCallback(() => setReloadKey((n) => n + 1), []);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([call<Company[]>("/admin/companies"), call<Bus[]>("/admin/buses"), call<AdminRoute[]>("/admin/routes")])
      .then(([companyList, busList, routeList]) => {
        if (!isCurrent) return;
        setCompanies(companyList);
        setBuses(busList);
        setRoutes(routeList);
        setCatalogError("");
      })
      .catch((error) => isCurrent && setCatalogError(errorText(error)));
    return () => {
      isCurrent = false;
    };
  }, [call, reloadKey]);

  // Runs a change, shows the result and reloads the data.
  const change = useCallback(
    async (path: string, body: unknown, success: string) => {
      try {
        await call(path, body);
        setNotice({ kind: "success", text: success });
        reload();
        return true;
      } catch (error) {
        setNotice({ kind: "error", text: errorText(error) });
        return false;
      }
    },
    [call, reload]
  );

  const tabs: { id: Tab; label: string; icon: ReactNode; adminOnly?: boolean }[] = [
    { id: "occupancy", label: "Ocupación", icon: <TicketIcon size={18} /> },
    { id: "routes", label: "Rutas y precios", icon: <BusIcon size={18} /> },
    { id: "companies", label: isAdmin ? "Empresas" : "Mi empresa", icon: <ClockIcon size={18} /> },
    { id: "buses", label: "Buses", icon: <BusIcon size={18} /> },
    { id: "documents", label: "Documentos", icon: <CheckIcon size={18} />, adminOnly: true },
    { id: "users", label: "Usuarios", icon: <UserIcon size={18} />, adminOnly: true },
    { id: "assistant", label: "Asistente IA", icon: <ChatIcon size={18} /> },
  ];

  return (
    <section className="admin-panel" aria-labelledby="admin-title">
      <header className="admin-header">
        <div>
          <p className="admin-kicker">{isAdmin ? "Administrador de la terminal" : "Panel de empresa"}</p>
          <h2 id="admin-title">{isAdmin ? "Panel de administración" : session.user.company}</h2>
          <p className="admin-subtitle">
            {isAdmin
              ? "Ves y cambias todas las empresas: precios, buses, rutas, tiempos de pago y usuarios."
              : "Administras solo tu empresa: precios, buses, rutas y tiempo para pagar."}
          </p>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Secciones del panel">
        {tabs
          .filter((item) => isAdmin || !item.adminOnly)
          .map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={tab === item.id}
              onClick={() => {
                setTab(item.id);
                setNotice(null);
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
      </nav>

      {notice && (
        <div className={`admin-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
          {notice.text}
          <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso">
            ×
          </button>
        </div>
      )}
      {catalogError && (
        <div className="admin-notice error" role="alert">
          {catalogError}
        </div>
      )}

      {tab === "occupancy" && <OccupancyTab call={call} companies={companies} isAdmin={isAdmin} />}
      {tab === "routes" && (
        <RoutesTab routes={routes} buses={buses} companies={companies} isAdmin={isAdmin} change={change} />
      )}
      {tab === "companies" && <CompaniesTab companies={companies} isAdmin={isAdmin} change={change} />}
      {tab === "buses" && <BusesTab buses={buses} companies={companies} change={change} />}
      {tab === "documents" && isAdmin && <DocumentsTab call={call} change={change} reloadKey={reloadKey} />}
      {tab === "users" && isAdmin && (
        <UsersTab call={call} change={change} companies={companies} reloadKey={reloadKey} myId={session.user.id} />
      )}
      {tab === "assistant" && <AdminAssistant call={call} session={session} onChanged={reload} />}
    </section>
  );
}

type ChangeFn = (path: string, body: unknown, success: string) => Promise<boolean>;

// ---------------------------------------------------------------- Occupancy

function OccupancyTab({ call, companies, isAdmin }: { call: AdminCall; companies: Company[]; isAdmin: boolean }) {
  const [date, setDate] = useState(isoDate(0));
  const [companyFilter, setCompanyFilter] = useState("");
  const [load, setLoad] = useState<{ key: string; data?: Occupancy; error?: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const key = `${date}|${refresh}`;
  const isLoading = load?.key !== key;

  useEffect(() => {
    let isCurrent = true;
    call<Occupancy>(`/admin/occupancy?date=${date}`)
      .then((data) => isCurrent && setLoad({ key, data }))
      .catch((error) => isCurrent && setLoad({ key, error: errorText(error) }));
    return () => {
      isCurrent = false;
    };
  }, [call, date, key]);

  const data = isLoading ? undefined : load?.data;
  const rows = (data?.departures ?? []).filter((row) => !companyFilter || row.company === companyFilter);
  const busiest = [...rows].sort((a, b) => b.occupancy_percent - a.occupancy_percent)[0];

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <div className="field">
          <label htmlFor="occupancy-date">Día</label>
          <input
            id="occupancy-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || isoDate(0))}
          />
        </div>
        {isAdmin && (
          <div className="field">
            <label htmlFor="occupancy-company">Empresa</label>
            <select id="occupancy-company" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
              <option value="">Todas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.name}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="button" className="secondary-button" onClick={() => setRefresh((n) => n + 1)}>
          Actualizar
        </button>
      </div>

      {isLoading && <p className="admin-loading">Cargando la ocupación…</p>}
      {load?.error && !isLoading && <div className="admin-notice error">{load.error}</div>}

      {data && (
        <>
          <p className="admin-date">{capitalize(formatLongDate(data.date))}</p>
          <div className="stat-grid">
            <Stat label="Salidas" value={String(rows.length)} />
            <Stat label="Puestos vendidos" value={String(rows.reduce((s, r) => s + r.sold, 0))} />
            <Stat label="Apartados sin pagar" value={String(rows.reduce((s, r) => s + r.held, 0))} />
            <Stat
              label="Ocupación"
              value={`${percent(rows.reduce((s, r) => s + r.sold + r.held, 0), rows.reduce((s, r) => s + r.capacity, 0))}%`}
            />
            <Stat label="Ingresos del día" value={formatPrice(rows.reduce((s, r) => s + r.revenue, 0))} />
          </div>
          {busiest && busiest.occupancy_percent > 0 && (
            <p className="admin-hint">
              El bus más lleno: {busiest.company} a {busiest.destination} de las {busiest.departure_time} (
              {busiest.occupancy_percent}%).
            </p>
          )}

          {rows.length === 0 ? (
            <p className="admin-empty">No hay salidas ese día.</p>
          ) : (
            <ul className="occupancy-list">
              {rows.map((row) => (
                <li key={row.schedule_id} className="occupancy-row">
                  <div className="occupancy-time">
                    <strong>{row.departure_time}</strong>
                    <span>{row.destination}</span>
                  </div>
                  <div className="occupancy-main">
                    <div className="occupancy-meta">
                      <span>{row.company}</span>
                      <span>
                        Bus {row.plate} · {row.capacity} puestos · {formatPrice(row.price)}
                      </span>
                    </div>
                    <div
                      className="occupancy-bar"
                      role="img"
                      aria-label={`${row.sold} vendidos, ${row.held} apartados y ${row.free} libres de ${row.capacity}`}
                    >
                      <span className="sold" style={{ width: `${(row.sold * 100) / row.capacity}%` }} />
                      <span className="held" style={{ width: `${(row.held * 100) / row.capacity}%` }} />
                    </div>
                    <div className="occupancy-legend">
                      <span className="sold">{row.sold} vendidos</span>
                      <span className="held">{row.held} apartados</span>
                      <span className="free">{row.free} libres</span>
                    </div>
                  </div>
                  <div className="occupancy-percent">
                    <strong>{row.occupancy_percent}%</strong>
                    <span>{formatPrice(row.revenue)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function percent(part: number, whole: number) {
  return whole ? Math.round((part * 100) / whole) : 0;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// ---------------------------------------------------------------- Routes and prices

function RoutesTab({
  routes,
  buses,
  companies,
  isAdmin,
  change,
}: {
  routes: AdminRoute[];
  buses: Bus[];
  companies: Company[];
  isAdmin: boolean;
  change: ChangeFn;
}) {
  const [search, setSearch] = useState("");
  const visible = routes.filter((route) =>
    `${route.destination} ${route.company}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <div className="field grow">
          <label htmlFor="route-search">Buscar ruta</label>
          <div className="input-with-icon">
            <SearchIcon size={18} />
            <input
              id="route-search"
              type="search"
              placeholder="Cali, Medellín, Bolivariano…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="route-grid">
        {visible.map((route) => (
          <RouteCard key={route.id} route={route} buses={buses.filter((b) => b.company_id === route.company_id)} change={change} />
        ))}
        {visible.length === 0 && <p className="admin-empty">No hay rutas con ese nombre.</p>}
      </div>

      <div className="admin-forms">
        <NewRouteForm companies={companies} isAdmin={isAdmin} change={change} />
        <NewDepartureForm routes={routes} buses={buses} change={change} />
      </div>
    </div>
  );
}

function RouteCard({ route, buses, change }: { route: AdminRoute; buses: Bus[]; change: ChangeFn }) {
  const [routePrice, setRoutePrice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const price = Number(routePrice);
  const priceIsValid = Number.isInteger(price) && price >= MIN_PRICE && price <= MAX_PRICE;

  async function applyRoutePrice() {
    const done = await change(
      `/admin/routes/${route.id}/price`,
      { price },
      `Listo: todas las salidas de ${route.company} a ${route.destination} quedaron en ${formatPrice(price)}.`
    );
    if (done) {
      setRoutePrice("");
      setConfirming(false);
    }
  }

  return (
    <article className="route-card">
      <header>
        <div>
          <h3>
            {route.origin} → {route.destination}
          </h3>
          <p>
            {route.company} · {formatDuration(route.duration_min)}
          </p>
        </div>
      </header>
      <ul className="departure-rows">
        {route.departures.map((departure) => (
          <DepartureRow key={`${departure.id}-${departure.price}-${departure.bus_id}`} departure={departure} buses={buses} change={change} />
        ))}
        {route.departures.length === 0 && <li className="admin-empty">Sin salidas todavía.</li>}
      </ul>
      {route.departures.length > 1 && (
        <div className="route-price">
          {!confirming ? (
            <>
              <label htmlFor={`route-price-${route.id}`}>Mismo precio para todas</label>
              <div className="inline-form">
                <PriceInput id={`route-price-${route.id}`} value={routePrice} onChange={setRoutePrice} />
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!priceIsValid}
                  onClick={() => setConfirming(true)}
                >
                  Aplicar
                </button>
              </div>
            </>
          ) : (
            <div className="inline-confirm" role="group" aria-label="Confirmar cambio de precio">
              <span>
                ¿Poner {formatPrice(price)} en las {route.departures.length} salidas? Las compras ya hechas
                conservan su precio.
              </span>
              <button type="button" className="primary-button" onClick={applyRoutePrice}>
                Sí, cambiar
              </button>
              <button type="button" className="secondary-button" onClick={() => setConfirming(false)}>
                No
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function PriceInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <span className="price-input">
      <span aria-hidden="true">$</span>
      <input
        id={id}
        inputMode="numeric"
        placeholder="85000"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 7))}
      />
    </span>
  );
}

function DepartureRow({
  departure,
  buses,
  change,
}: {
  departure: AdminRoute["departures"][number];
  buses: Bus[];
  change: ChangeFn;
}) {
  const [price, setPrice] = useState(String(departure.price));
  const [busId, setBusId] = useState(String(departure.bus_id ?? ""));
  const priceNumber = Number(price);
  const priceChanged = priceNumber !== departure.price;
  const busChanged = busId !== String(departure.bus_id ?? "");
  const priceIsValid = Number.isInteger(priceNumber) && priceNumber >= MIN_PRICE && priceNumber <= MAX_PRICE;

  function save(event: FormEvent) {
    event.preventDefault();
    const body: Record<string, unknown> = {};
    if (priceChanged) body.price = priceNumber;
    if (busChanged) body.bus_id = Number(busId);
    change(`/admin/departures/${departure.id}`, body, `Salida de las ${departure.departure_time} actualizada.`);
  }

  return (
    <li className={`departure-row${departure.active ? "" : " inactive"}`}>
      <form onSubmit={save}>
        <strong className="departure-time">{departure.departure_time}</strong>
        <PriceInput id={`price-${departure.id}`} value={price} onChange={setPrice} />
        <label className="sr-only" htmlFor={`bus-${departure.id}`}>
          Bus de la salida de las {departure.departure_time}
        </label>
        <select id={`bus-${departure.id}`} value={busId} onChange={(e) => setBusId(e.target.value)}>
          {buses.map((bus) => (
            <option key={bus.id} value={bus.id}>
              {bus.plate} ({bus.capacity})
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="primary-button small"
          disabled={(!priceChanged && !busChanged) || !priceIsValid}
        >
          Guardar
        </button>
        <button
          type="button"
          className={`toggle${departure.active ? " on" : ""}`}
          aria-pressed={departure.active}
          onClick={() =>
            change(
              `/admin/departures/${departure.id}`,
              { active: !departure.active },
              departure.active
                ? `La salida de las ${departure.departure_time} ya no se vende.`
                : `La salida de las ${departure.departure_time} volvió a la venta.`
            )
          }
        >
          {departure.active ? "A la venta" : "Pausada"}
        </button>
      </form>
    </li>
  );
}

function NewRouteForm({ companies, isAdmin, change }: { companies: Company[]; isAdmin: boolean; change: ChangeFn }) {
  const [companyId, setCompanyId] = useState("");
  const [destination, setDestination] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("0");
  const selectedCompany = companyId || String(companies[0]?.id ?? "");
  const duration = Number(hours) * 60 + Number(minutes);
  const isValid = destination.trim().length >= 3 && duration >= 10 && selectedCompany !== "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const done = await change(
      "/admin/routes",
      { company_id: Number(selectedCompany), destination: destination.trim(), duration_min: duration },
      `Ruta a ${destination.trim()} creada. Ahora agrégale salidas.`
    );
    if (done) {
      setDestination("");
      setHours("");
      setMinutes("0");
    }
  }

  return (
    <form className="admin-card form-card" onSubmit={submit}>
      <h3>Nueva ruta desde Pasto</h3>
      {companies.length > 1 && (
        <div className="field">
          <label htmlFor="new-route-company">Empresa</label>
          <select id="new-route-company" value={selectedCompany} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor="new-route-destination">Destino</label>
        <input
          id="new-route-destination"
          value={destination}
          maxLength={40}
          placeholder="Por ejemplo, Leticia"
          onChange={(e) => setDestination(e.target.value)}
        />
        <small className="field-help">
          {isAdmin
            ? "Si el pueblo no existe todavía, se crea."
            : "Debe ser un destino de la terminal; si no está, pídeselo al administrador."}
        </small>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="new-route-hours">Horas de viaje</label>
          <input
            id="new-route-hours"
            inputMode="numeric"
            value={hours}
            onChange={(e) => setHours(e.target.value.replace(/\D/g, "").slice(0, 2))}
          />
        </div>
        <div className="field">
          <label htmlFor="new-route-minutes">Minutos</label>
          <select id="new-route-minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)}>
            {[0, 10, 15, 20, 30, 40, 45, 50].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" className="primary-button" disabled={!isValid}>
        Crear ruta
      </button>
    </form>
  );
}

function NewDepartureForm({ routes, buses, change }: { routes: AdminRoute[]; buses: Bus[]; change: ChangeFn }) {
  const [routeId, setRouteId] = useState("");
  const [time, setTime] = useState("");
  const [price, setPrice] = useState("");
  const [busId, setBusId] = useState("");
  const selectedRoute = routes.find((route) => String(route.id) === routeId) ?? routes[0];
  const routeBuses = buses.filter((bus) => bus.company_id === selectedRoute?.company_id);
  const selectedBus = routeBuses.some((bus) => String(bus.id) === busId) ? busId : String(routeBuses[0]?.id ?? "");
  const priceNumber = Number(price);
  const isValid =
    selectedRoute !== undefined &&
    /^\d{2}:\d{2}$/.test(time) &&
    priceNumber >= MIN_PRICE &&
    priceNumber <= MAX_PRICE &&
    selectedBus !== "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedRoute) return;
    const done = await change(
      "/admin/departures",
      { route_id: selectedRoute.id, departure_time: time, price: priceNumber, bus_id: Number(selectedBus) },
      `Salida de las ${time} a ${selectedRoute.destination} creada y a la venta.`
    );
    if (done) {
      setTime("");
      setPrice("");
    }
  }

  return (
    <form className="admin-card form-card" onSubmit={submit}>
      <h3>Nueva salida</h3>
      <div className="field">
        <label htmlFor="new-departure-route">Ruta</label>
        <select
          id="new-departure-route"
          value={selectedRoute ? String(selectedRoute.id) : ""}
          onChange={(e) => setRouteId(e.target.value)}
        >
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.destination} · {route.company}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="new-departure-time">Hora</label>
          <input id="new-departure-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="new-departure-price">Precio</label>
          <PriceInput id="new-departure-price" value={price} onChange={setPrice} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="new-departure-bus">Bus</label>
        <select id="new-departure-bus" value={selectedBus} onChange={(e) => setBusId(e.target.value)}>
          {routeBuses.map((bus) => (
            <option key={bus.id} value={bus.id}>
              {bus.plate} · {bus.capacity} puestos
            </option>
          ))}
        </select>
        {routeBuses.length === 0 && <small className="field-help">Esta empresa no tiene buses: agrega uno primero.</small>}
      </div>
      <button type="submit" className="primary-button" disabled={!isValid}>
        Crear salida
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- Companies

function CompaniesTab({ companies, isAdmin, change }: { companies: Company[]; isAdmin: boolean; change: ChangeFn }) {
  return (
    <div className="admin-section">
      <p className="admin-hint">
        El <b>tiempo para pagar</b> es cuánto quedan apartados los asientos de una compra sin pagar ({MIN_RESERVATION_MINUTES}{" "}
        a {MAX_RESERVATION_MINUTES} minutos). Cuando se acaba, los asientos se liberan y el pago se cierra. Los cambios
        aplican a las compras nuevas.
      </p>
      <div className="company-grid">
        {companies.map((company) => (
          <CompanyCard key={`${company.id}-${company.reservation_minutes}-${company.max_seats_per_purchase}`} company={company} change={change} />
        ))}
      </div>
      {isAdmin && <NewCompanyForm change={change} />}
    </div>
  );
}

function CompanyCard({ company, change }: { company: Company; change: ChangeFn }) {
  const [minutes, setMinutes] = useState(company.reservation_minutes);
  const [seats, setSeats] = useState(company.max_seats_per_purchase);
  const changed = minutes !== company.reservation_minutes || seats !== company.max_seats_per_purchase;

  return (
    <form
      className="admin-card company-card"
      onSubmit={(event) => {
        event.preventDefault();
        change(
          `/admin/companies/${company.id}/settings`,
          { reservation_minutes: minutes, max_seats_per_purchase: seats },
          `${company.name}: ${minutes} minutos para pagar y máximo ${seats} sillas por compra.`
        );
      }}
    >
      <h3>{company.name}</h3>
      <p className="company-counts">
        {company.buses} {company.buses === 1 ? "bus" : "buses"} · {company.routes} rutas · {company.departures} salidas
      </p>
      <div className="field">
        <label htmlFor={`minutes-${company.id}`}>
          Tiempo para pagar: <b>{minutes} minutos</b>
        </label>
        <input
          id={`minutes-${company.id}`}
          type="range"
          min={MIN_RESERVATION_MINUTES}
          max={MAX_RESERVATION_MINUTES}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
        />
        <div className="range-scale" aria-hidden="true">
          <span>{MIN_RESERVATION_MINUTES} min</span>
          <span>{MAX_RESERVATION_MINUTES} min</span>
        </div>
      </div>
      <div className="field">
        <span className="label" id={`seats-label-${company.id}`}>
          Sillas por compra
        </span>
        <div className="counter" role="group" aria-labelledby={`seats-label-${company.id}`}>
          <button type="button" aria-label="Una silla menos" disabled={seats <= 1} onClick={() => setSeats(seats - 1)}>
            −
          </button>
          <output aria-live="polite">{seats}</output>
          <button
            type="button"
            aria-label="Una silla más"
            disabled={seats >= MAX_SEATS_LIMIT}
            onClick={() => setSeats(seats + 1)}
          >
            +
          </button>
        </div>
      </div>
      <button type="submit" className="primary-button" disabled={!changed}>
        Guardar cambios
      </button>
    </form>
  );
}

function NewCompanyForm({ change }: { change: ChangeFn }) {
  const [name, setName] = useState("");
  return (
    <form
      className="admin-card form-card"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await change("/admin/companies", { name }, `Empresa ${name.trim().toUpperCase()} creada. Agrégale un bus.`)) {
          setName("");
        }
      }}
    >
      <h3>Nueva empresa</h3>
      <div className="field">
        <label htmlFor="new-company-name">Nombre</label>
        <input
          id="new-company-name"
          value={name}
          maxLength={60}
          placeholder="Por ejemplo, COOTRANSMAYO"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <button type="submit" className="primary-button" disabled={name.trim().length < 3}>
        Crear empresa
      </button>
    </form>
  );
}

// ---------------------------------------------------------------- Buses

function BusesTab({ buses, companies, change }: { buses: Bus[]; companies: Company[]; change: ChangeFn }) {
  const [companyId, setCompanyId] = useState("");
  const [plate, setPlate] = useState("");
  const [capacity, setCapacity] = useState(40);
  const selectedCompany = companyId || String(companies[0]?.id ?? "");
  const plateIsValid = /^[A-Z]{3}-?\d{3}$/.test(plate);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const done = await change(
      "/admin/buses",
      { company_id: Number(selectedCompany), plate, capacity },
      `Bus ${plate} agregado con ${capacity} puestos.`
    );
    if (done) setPlate("");
  }

  return (
    <div className="admin-section">
      <div className="bus-grid">
        {buses.map((bus) => (
          <article key={bus.id} className="admin-card bus-card">
            <BusIcon size={22} />
            <div>
              <h3>{bus.plate}</h3>
              <p>
                {bus.company} · {bus.capacity} puestos · {bus.departures} salidas
              </p>
            </div>
          </article>
        ))}
      </div>
      <form className="admin-card form-card" onSubmit={submit}>
        <h3>Nuevo bus</h3>
        {companies.length > 1 && (
          <div className="field">
            <label htmlFor="new-bus-company">Empresa</label>
            <select id="new-bus-company" value={selectedCompany} onChange={(e) => setCompanyId(e.target.value)}>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field-row">
          <div className="field">
            <label htmlFor="new-bus-plate">Placa</label>
            <input
              id="new-bus-plate"
              value={plate}
              placeholder="TRP-102"
              maxLength={7}
              onChange={(e) => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
            />
          </div>
          <div className="field">
            <label htmlFor="new-bus-capacity">Puestos</label>
            <select id="new-bus-capacity" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
              {[12, 16, 20, 24, 30, 36, 40, 44, 48, 52, 60].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
        <small className="field-help">3 letras y 3 números. Los puestos se numeran del 1 al {capacity}.</small>
        <button type="submit" className="primary-button" disabled={!plateIsValid || !selectedCompany}>
          Agregar bus
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- Document types (admin)

function DocumentsTab({ call, change, reloadKey }: { call: AdminCall; change: ChangeFn; reloadKey: number }) {
  const [types, setTypes] = useState<AdminDocumentType[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [minLength, setMinLength] = useState(5);
  const [maxLength, setMaxLength] = useState(10);
  const [allowsLetters, setAllowsLetters] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    call<AdminDocumentType[]>("/admin/document-types")
      .then((list) => isCurrent && setTypes(list))
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [call, reloadKey]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const done = await change(
      "/admin/document-types",
      { code, name, min_length: minLength, max_length: maxLength, allows_letters: allowsLetters },
      `Tipo de documento ${code} creado. Ya aparece en la compra.`
    );
    if (done) {
      setCode("");
      setName("");
    }
  }

  return (
    <div className="admin-section">
      <ul className="document-list">
        {types.map((type) => (
          <li key={type.code} className={type.active ? "" : "inactive"}>
            <span className="doc-code">{type.code}</span>
            <span>
              <strong>{type.name}</strong>
              <small>
                {type.allows_letters ? "Letras y números" : "Solo números"}, de {type.min_length} a {type.max_length}
              </small>
            </span>
            <button
              type="button"
              className={`toggle${type.active ? " on" : ""}`}
              aria-pressed={type.active}
              onClick={() =>
                change(
                  `/admin/document-types/${type.code}/active`,
                  { active: !type.active },
                  type.active ? `${type.name} ya no se pide en la compra.` : `${type.name} volvió a la compra.`
                )
              }
            >
              {type.active ? "Activo" : "Apagado"}
            </button>
          </li>
        ))}
      </ul>
      <form className="admin-card form-card" onSubmit={submit}>
        <h3>Nuevo tipo de documento</h3>
        <div className="field-row">
          <div className="field">
            <label htmlFor="doc-code">Código</label>
            <input
              id="doc-code"
              value={code}
              maxLength={2}
              placeholder="PT"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            />
          </div>
          <div className="field grow">
            <label htmlFor="doc-name">Nombre</label>
            <input
              id="doc-name"
              value={name}
              maxLength={40}
              placeholder="Permiso por protección temporal"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="doc-min">Mínimo</label>
            <select id="doc-min" value={minLength} onChange={(e) => setMinLength(Number(e.target.value))}>
              {range(3, 12).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="doc-max">Máximo</label>
            <select id="doc-max" value={maxLength} onChange={(e) => setMaxLength(Number(e.target.value))}>
              {range(minLength, 12).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="check-line">
          <input type="checkbox" checked={allowsLetters} onChange={(e) => setAllowsLetters(e.target.checked)} />
          Puede tener letras (como el pasaporte)
        </label>
        <button
          type="submit"
          className="primary-button"
          disabled={code.length !== 2 || name.trim().length < 3 || maxLength < minLength}
        >
          Crear tipo
        </button>
      </form>
    </div>
  );
}

function range(from: number, to: number) {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index);
}

// ---------------------------------------------------------------- Users and roles (admin)

function UsersTab({
  call,
  change,
  companies,
  reloadKey,
  myId,
}: {
  call: AdminCall;
  change: ChangeFn;
  companies: Company[];
  reloadKey: number;
  myId: number;
}) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    let isCurrent = true;
    const timer = window.setTimeout(() => {
      call<AdminUser[]>(`/admin/users?q=${encodeURIComponent(query.trim())}`)
        .then((list) => isCurrent && setUsers(list))
        .catch(() => undefined);
    }, 250);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [call, query, reloadKey]);

  return (
    <div className="admin-section">
      <p className="admin-hint">
        Un usuario de <b>Empresa</b> solo ve y cambia su empresa. Un <b>Administrador</b> ve todo.
      </p>
      <div className="admin-toolbar">
        <div className="field grow">
          <label htmlFor="user-search">Buscar por nombre o correo</label>
          <div className="input-with-icon">
            <SearchIcon size={18} />
            <input id="user-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
      </div>
      <ul className="user-list">
        {users.map((user) => (
          <UserRow
            key={`${user.id}-${user.role}-${user.company_id}`}
            user={user}
            companies={companies}
            change={change}
            isMe={user.id === myId}
          />
        ))}
        {users.length === 0 && <li className="admin-empty">No encontramos usuarios.</li>}
      </ul>
    </div>
  );
}

function UserRow({
  user,
  companies,
  change,
  isMe,
}: {
  user: AdminUser;
  companies: Company[];
  change: ChangeFn;
  isMe: boolean;
}) {
  const [role, setRole] = useState(user.role);
  const [companyId, setCompanyId] = useState(String(user.company_id ?? companies[0]?.id ?? ""));
  const changed = role !== user.role || (role === "company" && companyId !== String(user.company_id ?? ""));

  return (
    <li className="user-row">
      <span className="user-avatar" aria-hidden="true">
        {user.name.charAt(0).toUpperCase()}
      </span>
      <span className="user-name">
        <strong>
          {user.name} {isMe && <em>(tú)</em>}
        </strong>
        <small>{user.email}</small>
      </span>
      <select
        aria-label={`Rol de ${user.name}`}
        value={role}
        disabled={isMe}
        onChange={(e) => setRole(e.target.value as AdminUser["role"])}
      >
        {(Object.keys(ROLE_LABELS) as AdminUser["role"][]).map((value) => (
          <option key={value} value={value}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </select>
      {role === "company" && (
        <select aria-label={`Empresa de ${user.name}`} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="primary-button small"
        disabled={!changed || isMe}
        onClick={() =>
          change(
            `/admin/users/${user.id}/role`,
            { role, company_id: role === "company" ? Number(companyId) : null },
            `${user.name} ahora es ${ROLE_LABELS[role].toLowerCase()}.`
          )
        }
      >
        Guardar
      </button>
    </li>
  );
}

export default AdminPanel;
