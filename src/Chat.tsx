import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { API_URL, ERROR_CONEXION, mensajeDeError } from "./api";
import TarjetaSalida from "./TarjetaSalida";
import type { MensajeChat, Salida } from "./tipos";

type Estado = "listo" | "cargando" | "error";

const SALUDO: MensajeChat = {
  rol: "asistente",
  texto:
    "¡Hola! Soy el asistente de TerminAPP. Cuéntame a dónde quieres viajar desde Pasto y a qué hora, y te busco las salidas.",
};

const SUGERENCIAS = [
  "Quiero ir a Cali esta noche, lo más barato",
  "¿A dónde puedo viajar?",
  "Salidas a Ipiales en la mañana",
];

// Muestra el texto de la IA respetando los saltos de línea y las **negrillas**,
// sin insertar HTML (así no se puede inyectar código en la página).
function TextoIA({ texto }: { texto: string }) {
  const lineas = texto.split("\n").filter((linea) => linea.trim() !== "");
  return (
    <>
      {lineas.map((linea, i) => (
        <p key={i}>
          {linea
            .split("**")
            .map((parte, j) =>
              j % 2 === 1 ? <strong key={j}>{parte}</strong> : parte
            )}
        </p>
      ))}
    </>
  );
}

function Chat({ alComprar }: { alComprar: (salida: Salida) => void }) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([SALUDO]);
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<Estado>("listo");
  const [mensajeError, setMensajeError] = useState("");
  const [lento, setLento] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);

  // Baja la conversación hasta el último mensaje.
  useEffect(() => {
    const lista = listaRef.current;
    if (lista) lista.scrollTop = lista.scrollHeight;
  }, [mensajes, estado, lento]);

  // Si la respuesta tarda, avisa que el servidor se está activando.
  useEffect(() => {
    if (estado !== "cargando") return;
    const temporizador = setTimeout(() => setLento(true), 6000);
    return () => clearTimeout(temporizador);
  }, [estado]);

  async function enviar(conversacion: MensajeChat[]) {
    setMensajes(conversacion);
    setEstado("cargando");
    setMensajeError("");
    setLento(false);

    try {
      const respuesta = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensajes: conversacion.map(({ rol, texto }) => ({ rol, texto })),
        }),
      });
      const datos = await respuesta.json().catch(() => null);

      if (!respuesta.ok || !datos) {
        setMensajeError(
          mensajeDeError(datos, "El servidor respondió con un error.")
        );
        setEstado("error");
        return;
      }

      setMensajes([
        ...conversacion,
        { rol: "asistente", texto: datos.respuesta, salidas: datos.salidas },
      ]);
      setEstado("listo");
    } catch {
      setMensajeError(ERROR_CONEXION);
      setEstado("error");
    }
  }

  function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    const limpio = texto.trim();
    if (!limpio || estado === "cargando") return;
    setTexto("");
    enviar([...mensajes, { rol: "usuario", texto: limpio }]);
  }

  function nuevaConversacion() {
    setMensajes([SALUDO]);
    setEstado("listo");
    setMensajeError("");
  }

  const soloSaludo = mensajes.length === 1;

  return (
    <section className="chat" aria-label="Chat con el asistente">
      <div className="chat-barra">
        <span className="chat-titulo">
          <span className="punto" aria-hidden="true"></span>
          Asistente de viajes
        </span>
        {!soloSaludo && (
          <button
            type="button"
            className="boton-texto"
            onClick={nuevaConversacion}
            disabled={estado === "cargando"}
          >
            Nueva conversación
          </button>
        )}
      </div>

      <div className="chat-mensajes" ref={listaRef} aria-live="polite">
        {mensajes.map((mensaje, i) => (
          <div key={i} className={`fila ${mensaje.rol}`}>
            <div className="burbuja">
              {mensaje.rol === "asistente" ? (
                <TextoIA texto={mensaje.texto} />
              ) : (
                <p>{mensaje.texto}</p>
              )}
            </div>
            {mensaje.salidas && mensaje.salidas.length > 0 && (
              <ul className="resultados en-chat">
                {mensaje.salidas.map((salida) => (
                  <TarjetaSalida
                    key={salida.horario_id}
                    salida={salida}
                    alComprar={alComprar}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}

        {estado === "cargando" && (
          <div className="fila asistente">
            <div className="burbuja escribiendo">
              <span className="puntos" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
              {lento ? (
                <p>
                  El servidor se está activando. La primera respuesta puede
                  tardar hasta un minuto…
                </p>
              ) : (
                <p className="solo-lector">El asistente está escribiendo</p>
              )}
            </div>
          </div>
        )}

        {estado === "error" && (
          <div className="fila asistente">
            <div className="burbuja error" role="alert">
              <p>{mensajeError}</p>
              <button
                type="button"
                className="boton-reintentar"
                onClick={() => enviar(mensajes)}
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {soloSaludo && estado === "listo" && (
          <div className="sugerencias">
            {SUGERENCIAS.map((sugerencia) => (
              <button
                key={sugerencia}
                type="button"
                onClick={() =>
                  enviar([...mensajes, { rol: "usuario", texto: sugerencia }])
                }
              >
                {sugerencia}
              </button>
            ))}
          </div>
        )}
      </div>

      <form className="chat-entrada" onSubmit={alEnviar}>
        <label htmlFor="mensaje" className="solo-lector">
          Escribe tu mensaje
        </label>
        <input
          id="mensaje"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej: quiero ir a Mocoa mañana temprano"
          maxLength={500}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={estado === "cargando" || texto.trim() === ""}
        >
          Enviar
        </button>
      </form>
    </section>
  );
}

export default Chat;
