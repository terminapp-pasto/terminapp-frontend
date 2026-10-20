import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { API_URL, ERROR_CONEXION, mensajeDeError, pedir } from "./api";
import { IconoEnviar, IconoUbicacion } from "./Iconos";
import TarjetaSalida from "./TarjetaSalida";
import type { MensajeChat, Salida } from "./tipos";

type Estado = "listo" | "cargando" | "error";

const SALUDO: MensajeChat = {
  rol: "asistente",
  texto:
    "¡Hola! Soy el asistente de TerminAPP. Cuéntame a dónde quieres viajar desde Pasto y a qué hora, y te busco las salidas.",
};

// Si el backend no responde a tiempo, se muestran estos destinos.
const DESTINOS_INICIALES = ["Ipiales", "Sandoná", "Tumaco", "Mocoa", "Cali", "Bogotá"];

const IDEAS = [
  "¿Cuánto cuesta ir a Sandoná?",
  "Lo más barato a Bogotá",
  "Salidas a Tumaco mañana temprano",
  "Quiero ir a Cali esta noche",
  "¿A dónde puedo viajar?",
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
  const [destinos, setDestinos] = useState(DESTINOS_INICIALES);
  const listaRef = useRef<HTMLDivElement>(null);

  // Los destinos salen del grafo del backend, así siempre coinciden con las rutas reales.
  useEffect(() => {
    pedir<{ destinos: string[] }>("/destinos")
      .then((datos) => datos.destinos.length > 0 && setDestinos(datos.destinos))
      .catch(() => {
        // se quedan los destinos iniciales
      });
  }, []);

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

  function preguntar(pregunta: string) {
    enviar([...mensajes, { rol: "usuario", texto: pregunta }]);
  }

  function nuevaConversacion() {
    setMensajes([SALUDO]);
    setEstado("listo");
    setMensajeError("");
  }

  const soloSaludo = mensajes.length === 1;

  const formulario = (
    <form
      className={`chat-entrada${soloSaludo ? " destacada" : ""}`}
      onSubmit={alEnviar}
    >
      <label htmlFor="mensaje" className="solo-lector">
        Escribe tu mensaje
      </label>
      <input
        id="mensaje"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="¿A dónde quieres viajar?"
        maxLength={500}
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={estado === "cargando" || texto.trim() === ""}
      >
        <IconoEnviar tamano={18} />
        <span className="texto-enviar">Enviar</span>
      </button>
    </form>
  );

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

      <div
        className={`chat-mensajes${soloSaludo ? " al-inicio" : ""}`}
        ref={listaRef}
        aria-live="polite"
      >
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
          <div className="inicio-chat">
            {formulario}

            <h3 className="subtitulo">Destinos desde Pasto</h3>
            <div className="destinos">
              {destinos.map((destino) => (
                <button
                  key={destino}
                  type="button"
                  onClick={() => preguntar(`Quiero viajar a ${destino}`)}
                >
                  <IconoUbicacion tamano={16} />
                  {destino}
                </button>
              ))}
            </div>

            <h3 className="subtitulo">O pregunta algo como</h3>
            <div className="sugerencias">
              {IDEAS.map((idea) => (
                <button key={idea} type="button" onClick={() => preguntar(idea)}>
                  {idea}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!soloSaludo && formulario}
    </section>
  );
}

export default Chat;
