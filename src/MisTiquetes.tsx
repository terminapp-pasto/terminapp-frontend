import { useEffect, useState } from "react";
import { ErrorApi, formatoFecha, formatoPrecio, pedir, textoDeError } from "./api";
import type { Tiquete } from "./tipos";

type Orden = "recientes" | "antiguos";

type Props = {
  token: string;
  recarga: number;
  alExpirar: () => void;
};

type Carga = { clave: string; tiquetes?: Tiquete[]; error?: string };

const ETIQUETAS: Record<Tiquete["estado"], string> = {
  PAGADO: "Pagado",
  RESERVADO: "Reservado, sin pagar",
  PAGANDO: "Pago en proceso",
  CANCELADO: "Cancelado",
  VENCIDO: "Vencido",
};

function MisTiquetes({ token, recarga, alExpirar }: Props) {
  const [orden, setOrden] = useState<Orden>("recientes");
  const [propia, setPropia] = useState(0);
  const [carga, setCarga] = useState<Carga | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [errorAccion, setErrorAccion] = useState("");

  const clave = `${orden}|${recarga}|${propia}`;
  const cargando = carga?.clave !== clave;

  useEffect(() => {
    let vigente = true;
    pedir<Tiquete[]>(`/mis-tiquetes?orden=${orden}`, { token })
      .then((datos) => vigente && setCarga({ clave, tiquetes: datos }))
      .catch((error) => {
        if (!vigente) return;
        if (error instanceof ErrorApi && error.estado === 401) alExpirar();
        else setCarga({ clave, error: textoDeError(error) });
      });
    return () => {
      vigente = false;
    };
  }, [clave, orden, token, alExpirar]);

  async function pagar(pagoId: number) {
    setOcupado(pagoId);
    setErrorAccion("");
    try {
      const pago = await pedir<{ url: string }>(`/compras/${pagoId}/pagar`, {
        metodo: "POST",
        token,
      });
      window.location.assign(pago.url);
    } catch (error) {
      setOcupado(null);
      setErrorAccion(textoDeError(error));
      setPropia((n) => n + 1);
    }
  }

  async function cancelar(pagoId: number) {
    setOcupado(pagoId);
    setErrorAccion("");
    try {
      await pedir(`/compras/${pagoId}/cancelar`, { metodo: "POST", token });
    } catch (error) {
      setErrorAccion(textoDeError(error));
    }
    setOcupado(null);
    setPropia((n) => n + 1);
  }

  const tiquetes = cargando ? undefined : carga?.tiquetes;

  return (
    <div className="mis-tiquetes">
      <div className="mis-tiquetes-barra">
        <h3>Mis tiquetes</h3>
        <select
          aria-label="Ordenar tiquetes"
          value={orden}
          onChange={(e) => setOrden(e.target.value as Orden)}
        >
          <option value="recientes">Más recientes primero</option>
          <option value="antiguos">Más antiguos primero</option>
        </select>
      </div>

      {errorAccion && (
        <div className="aviso error" role="alert">
          {errorAccion}
        </div>
      )}

      {cargando && (
        <div className="aviso cargando">
          <span className="girador" aria-hidden="true"></span>
          Cargando tus tiquetes...
        </div>
      )}
      {!cargando && carga?.error && (
        <div className="aviso error" role="alert">
          {carga.error}
        </div>
      )}
      {tiquetes && tiquetes.length === 0 && (
        <p className="aviso">
          Todavía no tienes tiquetes. Busca un viaje en el chat o en el
          buscador y dale a Comprar.
        </p>
      )}

      {tiquetes && tiquetes.length > 0 && (
        <ul className="lista-tiquetes">
          {tiquetes.map((t) => (
            <li key={t.tiquete_id} className={`tiquete ${t.estado.toLowerCase()}`}>
              <div className="tiquete-ruta">
                <strong>
                  {t.origen} → {t.destino}
                </strong>
                <span className={`insignia ${t.estado.toLowerCase()}`}>
                  {ETIQUETAS[t.estado]}
                </span>
              </div>
              <div className="tiquete-datos">
                <span>
                  {formatoFecha(t.fecha)} · {t.hora_salida}
                </span>
                <span>{t.empresa}</span>
                <span>
                  Asiento <b>{t.asiento}</b>
                </span>
                <span>{t.pasajero}</span>
                <span>{formatoPrecio(t.precio)}</span>
                {t.estado === "PAGADO" && (
                  <span className="codigo">
                    TP-{String(t.tiquete_id).padStart(6, "0")}
                  </span>
                )}
              </div>
              {(t.estado === "RESERVADO" || t.estado === "PAGANDO") && t.vence && (
                <p className="tiquete-vence">
                  ⏳ El asiento queda apartado hasta las <b>{t.vence}</b>. Si no
                  pagas antes, se libera.
                </p>
              )}
              {(t.estado === "RESERVADO" || t.estado === "PAGANDO") && (
                <div className="tiquete-acciones">
                  {t.estado === "RESERVADO" && (
                    <button
                      type="button"
                      className="boton-principal"
                      disabled={ocupado !== null}
                      onClick={() => pagar(t.pago_id)}
                    >
                      {ocupado === t.pago_id ? "Un momento..." : "Pagar"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="boton-secundario"
                    disabled={ocupado !== null}
                    onClick={() => cancelar(t.pago_id)}
                  >
                    Cancelar compra
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MisTiquetes;
