import { useEffect, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { errorText, formatLongDate, formatPrice, isoDate } from "./api";
import type { AdminCall } from "./AdminPanel";
import type { AdminPurchase, SettingInfo } from "./adminApi";
import { reloadSettings } from "./appSettings";
import { SearchIcon } from "./Icons";

type ChangeFn = (path: string, body: unknown, success: string) => Promise<boolean>;

// ---------------------------------------------------------------- Inline edit

type InlineEditProps = {
  label: string; // what is being edited, for screen readers ("Nombre de la empresa")
  value: string;
  display?: ReactNode;
  inputType?: "text" | "time" | "number";
  maxLength?: number;
  clean?: (text: string) => string;
  onSave: (value: string) => Promise<boolean>;
};

// Shows a value with a small "Editar" button; editing happens right there (never in a window).
// It is not a <form>, so it can live inside other forms. Enter saves and Escape cancels.
export function InlineEdit({ label, value, display, inputType = "text", maxLength, clean, onSave }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (draft.trim() === "" || draft === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    const done = await onSave(draft.trim());
    setIsSaving(false);
    if (done) setIsEditing(false);
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setDraft(value);
      setIsEditing(false);
    }
  }

  if (!isEditing) {
    return (
      <span className="inline-edit">
        {display ?? value}
        <button
          type="button"
          className="edit-button"
          aria-label={`Editar ${label.toLowerCase()}`}
          onClick={() => {
            setDraft(value);
            setIsEditing(true);
          }}
        >
          Editar
        </button>
      </span>
    );
  }

  return (
    <span className="inline-edit editing">
      <input
        aria-label={label}
        type={inputType}
        value={draft}
        maxLength={maxLength}
        autoFocus
        onChange={(e) => setDraft(clean ? clean(e.target.value) : e.target.value)}
        onKeyDown={handleKey}
      />
      <button type="button" className="primary-button small" disabled={isSaving} onClick={save}>
        {isSaving ? "…" : "Guardar"}
      </button>
      <button
        type="button"
        className="secondary-button small"
        onClick={() => {
          setDraft(value);
          setIsEditing(false);
        }}
      >
        Cancelar
      </button>
    </span>
  );
}

// ---------------------------------------------------------------- Texts and general rules (admin)

const SETTING_GROUPS: { title: string; hint: string; keys: string[] }[] = [
  {
    title: "Portada y avisos",
    hint: "Lo primero que ve cualquier viajero al entrar.",
    keys: ["home_title", "home_highlight", "home_subtitle", "announcement", "chat_welcome"],
  },
  {
    title: "Reglas de venta",
    hint: "Aplican a las compras nuevas de todas las empresas.",
    keys: ["sales_window_days", "max_pending_purchases", "boarding_advance_minutes"],
  },
  {
    title: "Contacto de la terminal",
    hint: "Sale en el pie de página. Separa varios teléfonos con un punto medio (·).",
    keys: ["terminal_address", "terminal_phones", "terminal_email"],
  },
  {
    title: "Chat con IA de los viajeros",
    hint: "Indicaciones extra para la IA, por ejemplo: «Recomienda llegar 40 minutos antes en temporada».",
    keys: ["ai_extra_instructions"],
  },
];

export function SettingsTab({ call, change, reloadKey }: { call: AdminCall; change: ChangeFn; reloadKey: number }) {
  const [settings, setSettings] = useState<SettingInfo[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isCurrent = true;
    call<SettingInfo[]>("/admin/settings")
      .then((list) => {
        if (!isCurrent) return;
        setSettings(list);
        setDrafts(Object.fromEntries(list.map((item) => [item.key, String(item.value)])));
      })
      .catch((error) => isCurrent && setLoadError(errorText(error)));
    return () => {
      isCurrent = false;
    };
  }, [call, reloadKey]);

  async function saveGroup(keys: string[], title: string) {
    const body: Record<string, string | number> = {};
    for (const key of keys) {
      const info = settings.find((item) => item.key === key);
      if (!info || drafts[key] === String(info.value)) continue;
      body[key] = info.kind === "number" ? Number(drafts[key]) : drafts[key];
    }
    if (Object.keys(body).length === 0) return;
    if (await change("/admin/settings", body, `${title}: cambios guardados. Ya se ven en la app.`)) {
      reloadSettings();
    }
  }

  if (loadError) return <div className="admin-notice error">{loadError}</div>;

  return (
    <div className="admin-section">
      <p className="admin-hint">
        Todo lo de aquí cambia la app al instante, sin tocar código. Si algo queda mal, el botón <b>Volver al original</b>{" "}
        de cada campo lo deja como estaba.
      </p>
      <div className="settings-grid">
        {SETTING_GROUPS.map((group) => {
          const items = group.keys
            .map((key) => settings.find((item) => item.key === key))
            .filter((item): item is SettingInfo => item !== undefined);
          const hasChanges = items.some((item) => drafts[item.key] !== String(item.value));
          return (
            <form
              key={group.title}
              className="admin-card form-card"
              onSubmit={(event) => {
                event.preventDefault();
                saveGroup(group.keys, group.title);
              }}
            >
              <h3>{group.title}</h3>
              <p className="field-help">{group.hint}</p>
              {items.map((item) => (
                <SettingField
                  key={item.key}
                  info={item}
                  value={drafts[item.key] ?? ""}
                  onChange={(value) => setDrafts((current) => ({ ...current, [item.key]: value }))}
                />
              ))}
              <button type="submit" className="primary-button" disabled={!hasChanges}>
                Guardar
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

function SettingField({ info, value, onChange }: { info: SettingInfo; value: string; onChange: (value: string) => void }) {
  const id = `setting-${info.key}`;
  const isDefault = value === String(info.default);
  const restore = !isDefault && (
    <button type="button" className="link-button" onClick={() => onChange(String(info.default))}>
      Volver al original
    </button>
  );
  if (info.kind === "number") {
    return (
      <div className="field">
        <label htmlFor={id}>{info.label}</label>
        <input
          id={id}
          type="number"
          min={info.min}
          max={info.max}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
        />
        <small className="field-help">
          Entre {info.min} y {info.max}. {restore}
        </small>
      </div>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id}>{info.label}</label>
      {info.kind === "long_text" ? (
        <textarea id={id} rows={3} maxLength={info.max} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} maxLength={info.max} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      <small className="field-help">
        {value.length}/{info.max} {restore}
      </small>
    </div>
  );
}

// ---------------------------------------------------------------- Purchases

const STATUS_LABELS: Record<AdminPurchase["status"], string> = {
  RESERVED: "Apartada",
  PAYING: "Pagando",
  PAID: "Pagada",
  CANCELLED: "Cancelada",
  EXPIRED: "Vencida",
};

export function PurchasesTab({ call, change, reloadKey }: { call: AdminCall; change: ChangeFn; reloadKey: number }) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [purchases, setPurchases] = useState<AdminPurchase[] | null>(null);
  const [confirming, setConfirming] = useState<{ id: number; action: "cancel" | "refund" } | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: query.trim(), date });
      call<AdminPurchase[]>(`/admin/purchases?${params}`)
        .then((list) => isCurrent && setPurchases(list))
        .catch(() => isCurrent && setPurchases([]));
    }, 250);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [call, query, date, reloadKey]);

  async function act(purchase: AdminPurchase, action: "cancel" | "refund") {
    const done = await change(
      `/admin/purchases/${purchase.payment_id}/${action}`,
      {},
      action === "cancel"
        ? `Compra ${purchase.booking_code} cancelada: los asientos quedaron libres.`
        : `Devolvimos ${formatPrice(purchase.total)} de la compra ${purchase.booking_code}. Los asientos quedaron libres.`
    );
    if (done) setConfirming(null);
  }

  return (
    <div className="admin-section">
      <div className="admin-toolbar">
        <div className="field grow">
          <label htmlFor="purchase-search">Código de reserva, correo, nombre o documento</label>
          <div className="input-with-icon">
            <SearchIcon size={18} />
            <input id="purchase-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="purchase-date">Día del viaje</label>
          <input id="purchase-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {date && (
          <button type="button" className="secondary-button" onClick={() => setDate("")}>
            Todos los días
          </button>
        )}
        {!date && (
          <button type="button" className="secondary-button" onClick={() => setDate(isoDate(0))}>
            Hoy
          </button>
        )}
      </div>

      {purchases === null && <p className="admin-loading">Buscando compras…</p>}
      {purchases?.length === 0 && <p className="admin-empty">No encontramos compras con esos datos.</p>}
      <ul className="purchase-admin-list">
        {purchases?.map((purchase) => {
          const isConfirming = confirming?.id === purchase.payment_id;
          const canCancel = purchase.status === "RESERVED" || purchase.status === "PAYING";
          const canRefund = purchase.status === "PAID" && purchase.paid_online;
          return (
            <li key={purchase.payment_id} className="admin-card purchase-admin">
              <div className="purchase-admin-head">
                <span className="booking-code">{purchase.booking_code}</span>
                <span className={`status-pill ${purchase.status.toLowerCase()}`}>{STATUS_LABELS[purchase.status]}</span>
                <strong>{formatPrice(purchase.total)}</strong>
              </div>
              <p>
                <b>
                  {purchase.destination} · {purchase.departure_time}
                </b>{" "}
                · {formatLongDate(purchase.date)} · {purchase.company}
              </p>
              <p className="field-help">
                Compró {purchase.buyer} ({purchase.buyer_email}){purchase.contact_phone && ` · Cel. ${purchase.contact_phone}`}
              </p>
              <p className="field-help">Asientos: {purchase.passengers}</p>
              {!isConfirming && (canCancel || canRefund) && (
                <div className="purchase-admin-actions">
                  {canCancel && (
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={() => setConfirming({ id: purchase.payment_id, action: "cancel" })}
                    >
                      Cancelar compra
                    </button>
                  )}
                  {canRefund && (
                    <button
                      type="button"
                      className="secondary-button small danger"
                      onClick={() => setConfirming({ id: purchase.payment_id, action: "refund" })}
                    >
                      Devolver dinero
                    </button>
                  )}
                </div>
              )}
              {isConfirming && confirming && (
                <div className="inline-confirm" role="group" aria-label="Confirmar">
                  <span>
                    {confirming.action === "cancel"
                      ? "¿Cancelar esta compra y liberar sus asientos?"
                      : `¿Devolver ${formatPrice(purchase.total)} con Stripe? Los tiquetes dejan de servir y no se puede deshacer.`}
                  </span>
                  <button type="button" className="primary-button small" onClick={() => act(purchase, confirming.action)}>
                    Sí
                  </button>
                  <button type="button" className="secondary-button small" onClick={() => setConfirming(null)}>
                    No
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
