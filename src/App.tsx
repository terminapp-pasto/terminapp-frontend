import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { API_URL, pedir, textoDeError } from "./api";
import Buscador from "./Buscador";
import Chat from "./Chat";
import Compra from "./Compra";
import Cuenta from "./Cuenta";
import { borrarSesion, guardarSesion, leerSesion } from "./sesion";
import type { Sesion } from "./sesion";
import type { Salida } from "./tipos";

type Pestana = "chat" | "buscador" | "cuenta";
type Aviso = { tipo: "exito" | "info" | "error"; texto: string };

// Al volver de Stripe la dirección trae ?pago=exito&session_id=... o
// ?pago=cancelado&pago_id=... Se lee una sola vez y se limpia la barra.
function leerRetornoDePago() {
  const parametros = new URLSearchParams(window.location.search);
  const pago = parametros.get("pago");
  if (!pago) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return {
    exito: pago === "exito",
    sessionId: parametros.get("session_id") ?? "",
    pagoId: parametros.get("pago_id") ?? "",
  };
}

const RETORNO = leerRetornoDePago();

function App() {
  const [pestana, setPestana] = useState<Pestana>(RETORNO ? "cuenta" : "chat");
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);
  const [compraDe, setCompraDe] = useState<Salida | null>(null);
  const [pendiente, setPendiente] = useState<Salida | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState<Aviso | null>(
    RETORNO?.exito ? { tipo: "info", texto: "Confirmando tu pago con Stripe..." } : null
  );

  const alSalir = useCallback(() => {
    borrarSesion();
    setSesion(null);
  }, []);

  // Al abrir la página, revisa con el backend que el token guardado siga siendo válido.
  useEffect(() => {
    const guardada = leerSesion();
    if (!guardada) return;
    fetch(`${API_URL}/yo`, {
      headers: { Authorization: `Bearer ${guardada.token}` },
    })
      .then((respuesta) => {
        if (respuesta.status === 401) alSalir();
      })
      .catch(() => {
        // sin conexión: se conserva la sesión y se vuelve a revisar en la próxima visita
      });
  }, [alSalir]);

  // Si viene de Stripe, confirma el pago (o libera los asientos si lo canceló).
  useEffect(() => {
    const guardada = leerSesion();
    if (!RETORNO || !guardada) return;
    if (RETORNO.exito) {
      pedir(`/compras/confirmar?session_id=${encodeURIComponent(RETORNO.sessionId)}`, {
        token: guardada.token,
      })
        .then(() =>
          setAviso({
            tipo: "exito",
            texto: "¡Pago aprobado! Tus tiquetes ya están confirmados. ¡Buen viaje!",
          })
        )
        .catch((error) => setAviso({ tipo: "error", texto: textoDeError(error) }))
        .finally(() => setRecarga((n) => n + 1));
    } else if (RETORNO.pagoId) {
      pedir(`/compras/${RETORNO.pagoId}/cancelar`, { metodo: "POST", token: guardada.token })
        .catch(() => {
          // si ya estaba cancelada o vencida no pasa nada
        })
        .finally(() => {
          setAviso({ tipo: "info", texto: "Cancelaste el pago. Los asientos quedaron libres." });
          setRecarga((n) => n + 1);
        });
    }
  }, []);

  function alIngresar(nueva: Sesion) {
    guardarSesion(nueva);
    setSesion(nueva);
    if (pendiente) {
      // venía de darle Comprar sin sesión: se retoma la compra
      setCompraDe(pendiente);
      setPendiente(null);
    }
  }

  function alPedirSesion() {
    setPendiente(compraDe);
    setCompraDe(null);
    setPestana("cuenta");
  }

  function alExpirar() {
    alSalir();
    setAviso({ tipo: "error", texto: "Tu sesión venció. Inicia sesión otra vez." });
  }

  const cerrarCompra = useCallback(() => setCompraDe(null), []);

  return (
    <div className="pagina">
      <header className="encabezado">
        <h1>
          Termin<span>APP</span>
        </h1>
        <p>Pasajes desde la Terminal de Transportes de Pasto</p>
      </header>

      <main className="contenido">
        <nav className="pestanas" aria-label="Secciones">
          <button
            type="button"
            aria-pressed={pestana === "chat"}
            onClick={() => setPestana("chat")}
          >
            Chat con IA
          </button>
          <button
            type="button"
            aria-pressed={pestana === "buscador"}
            onClick={() => setPestana("buscador")}
          >
            Buscador
          </button>
          <button
            type="button"
            className="pestana-cuenta"
            aria-pressed={pestana === "cuenta"}
            onClick={() => setPestana("cuenta")}
          >
            {sesion ? `👤 ${sesion.usuario.nombre.split(" ")[0]}` : "Ingresar"}
          </button>
        </nav>

        {aviso && (
          <div className={`aviso-general ${aviso.tipo}`} role="status">
            <span>{aviso.texto}</span>
            <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso">
              ×
            </button>
          </div>
        )}

        {/* Las vistas siguen montadas para no perder la conversación al cambiar de pestaña */}
        <div hidden={pestana !== "chat"}>
          <Chat alComprar={setCompraDe} />
        </div>
        <div hidden={pestana !== "buscador"}>
          <Buscador alComprar={setCompraDe} />
        </div>
        <div hidden={pestana !== "cuenta"}>
          <Cuenta
            sesion={sesion}
            alIngresar={alIngresar}
            alSalir={alSalir}
            recarga={recarga}
          />
        </div>
      </main>

      {compraDe && (
        <Compra
          salida={compraDe}
          sesion={sesion}
          alCerrar={cerrarCompra}
          alPedirSesion={alPedirSesion}
          alExpirar={alExpirar}
        />
      )}

      <footer className="pie">
        Proyecto de Estructuras de Datos · UCC Pasto
      </footer>
    </div>
  );
}

export default App;
