import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ErrorApi,
  fechaISO,
  formatoDuracion,
  formatoPrecio,
  pedir,
  textoDeError,
} from "./api";
import FotoBus from "./FotoBus";
import type { Sesion } from "./sesion";
import type { MapaAsientos, Reserva, Salida } from "./tipos";

const MAX_ASIENTOS = 5;

type Props = {
  salida: Salida;
  sesion: Sesion | null;
  alCerrar: () => void;
  alPedirSesion: () => void;
  alExpirar: () => void;
  alReservar: () => void;
};

type Carga = { clave: string; mapa?: MapaAsientos; error?: string };

function Compra({
  salida,
  sesion,
  alCerrar,
  alPedirSesion,
  alExpirar,
  alReservar,
}: Props) {
  const [fecha, setFecha] = useState(salida.fecha ?? fechaISO(0));
  const [recarga, setRecarga] = useState(0);
  const [carga, setCarga] = useState<Carga | null>(null);
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [nombre, setNombre] = useState(sesion?.usuario.nombre ?? "");
  const [documento, setDocumento] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");

  const clave = `${salida.horario_id}|${fecha}|${recarga}`;
  const cargando = carga?.clave !== clave;
  const mapa = cargando ? undefined : carga?.mapa;

  // Trae el mapa de asientos cada vez que cambia la fecha.
  useEffect(() => {
    if (!sesion) return;
    let vigente = true;
    pedir<MapaAsientos>(`/horarios/${salida.horario_id}/asientos?fecha=${fecha}`)
      .then((datos) => vigente && setCarga({ clave, mapa: datos }))
      .catch((error) => vigente && setCarga({ clave, error: textoDeError(error) }));
    return () => {
      vigente = false;
    };
  }, [clave, fecha, salida.horario_id, sesion]);

  // Cerrar con la tecla Escape.
  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !enviando) alCerrar();
    }
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [alCerrar, enviando]);

  function cambiarFecha(nueva: string) {
    setFecha(nueva || fechaISO(0));
    setSeleccion([]);
    setErrorEnvio("");
  }

  function alternarAsiento(numero: number) {
    setErrorEnvio("");
    setSeleccion((actual) => {
      if (actual.includes(numero)) return actual.filter((n) => n !== numero);
      if (actual.length >= MAX_ASIENTOS) return actual;
      return [...actual, numero].sort((a, b) => a - b);
    });
  }

  async function reservarYPagar(evento: FormEvent) {
    evento.preventDefault();
    if (!sesion || seleccion.length === 0) return;
    setEnviando(true);
    setErrorEnvio("");

    try {
      const reserva = await pedir<Reserva>("/compras", {
        metodo: "POST",
        token: sesion.token,
        cuerpo: {
          horario_id: salida.horario_id,
          fecha,
          asientos: seleccion,
          pasajero: { nombre, documento },
        },
      });
      alReservar(); // Mis tiquetes debe mostrar la reserva aunque el pago falle
      const pago = await pedir<{ url: string }>(
        `/compras/${reserva.pago_id}/pagar`,
        { metodo: "POST", token: sesion.token }
      );
      window.location.assign(pago.url); // se va a la página de pago de Stripe
    } catch (error) {
      setEnviando(false);
      if (error instanceof ErrorApi && error.estado === 401) {
        alExpirar();
        return;
      }
      if (error instanceof ErrorApi && error.estado === 409) {
        setSeleccion([]);
        setRecarga((n) => n + 1); // alguien ocupó un asiento: se actualiza el mapa
      }
      setErrorEnvio(textoDeError(error));
    }
  }

  const total = salida.precio * seleccion.length;

  return (
    <div className="fondo-modal" onClick={() => !enviando && alCerrar()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-compra"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-encabezado">
          <div>
            <h2 id="titulo-compra">
              {salida.origen} → {salida.destino}
            </h2>
            <p>
              {salida.empresa} · sale a las {salida.hora_salida} ·{" "}
              {formatoDuracion(salida.duracion_min)} de viaje
            </p>
          </div>
          <button
            type="button"
            className="boton-cerrar"
            onClick={alCerrar}
            disabled={enviando}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="modal-bus">
          <FotoBus
            empresa={salida.empresa}
            placa={mapa?.salida.placa}
            capacidad={mapa?.salida.capacidad}
          />
        </div>

        {!sesion ? (
          <div className="modal-cuerpo">
            <p className="aviso">
              Para comprar necesitas iniciar sesión. Así tus tiquetes quedan
              guardados en tu cuenta.
            </p>
            <button
              type="button"
              className="boton-principal ancho"
              onClick={alPedirSesion}
            >
              Ingresar o crear cuenta
            </button>
          </div>
        ) : (
          <form className="modal-cuerpo" onSubmit={reservarYPagar}>
            <div className="campo">
              <label htmlFor="fecha-viaje">Fecha del viaje</label>
              <input
                id="fecha-viaje"
                type="date"
                value={fecha}
                min={fechaISO(0)}
                max={fechaISO(60)}
                onChange={(e) => cambiarFecha(e.target.value)}
                disabled={enviando}
              />
            </div>

            <div className="campo">
              <span className="etiqueta">
                Asientos{" "}
                {mapa && (
                  <small>
                    ({mapa.libres} libres · máximo {MAX_ASIENTOS})
                  </small>
                )}
              </span>

              {cargando && (
                <div className="aviso cargando">
                  <span className="girador" aria-hidden="true"></span>
                  Cargando asientos...
                </div>
              )}
              {!cargando && carga?.error && (
                <div className="aviso error" role="alert">
                  {carga.error}
                </div>
              )}
              {mapa && (
                <>
                  <div className="bus" aria-label="Asientos del bus">
                    <div className="bus-frente">Conductor</div>
                    {mapa.asientos.map((asiento) => {
                      const elegido = seleccion.includes(asiento.numero);
                      const ocupado = asiento.estado !== "LIBRE";
                      return (
                        <button
                          key={asiento.numero}
                          type="button"
                          className={`asiento${elegido ? " elegido" : ""}${
                            asiento.numero % 4 === 3 ? " tras-pasillo" : ""
                          }`}
                          disabled={ocupado || enviando}
                          aria-pressed={elegido}
                          aria-label={`Asiento ${asiento.numero}${
                            ocupado ? ", ocupado" : ""
                          }`}
                          onClick={() => alternarAsiento(asiento.numero)}
                        >
                          {asiento.numero}
                        </button>
                      );
                    })}
                  </div>
                  <div className="leyenda">
                    <span>
                      <i className="muestra libre"></i> Libre
                    </span>
                    <span>
                      <i className="muestra elegido"></i> Tu elección
                    </span>
                    <span>
                      <i className="muestra ocupado"></i> Ocupado
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="fila-campos">
              <div className="campo">
                <label htmlFor="pasajero">Nombre del pasajero</label>
                <input
                  id="pasajero"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  minLength={3}
                  autoComplete="name"
                  disabled={enviando}
                />
              </div>
              <div className="campo">
                <label htmlFor="documento">Documento</label>
                <input
                  id="documento"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  required
                  minLength={5}
                  inputMode="numeric"
                  disabled={enviando}
                />
              </div>
            </div>

            {errorEnvio && (
              <div className="aviso error" role="alert">
                {errorEnvio}
              </div>
            )}

            <div className="resumen-compra">
              <div>
                <span>
                  {seleccion.length === 0
                    ? "Elige tus asientos"
                    : `Asiento${seleccion.length > 1 ? "s" : ""} ${seleccion.join(", ")}`}
                </span>
                <strong>{formatoPrecio(total)}</strong>
              </div>
              <button
                type="submit"
                className="boton-principal"
                disabled={enviando || seleccion.length === 0}
              >
                {enviando ? "Abriendo el pago..." : "Reservar y pagar"}
              </button>
            </div>
            <p className="nota">
              Los asientos quedan apartados 15 minutos. El pago es de prueba:
              usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y
              cualquier CVC.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default Compra;
