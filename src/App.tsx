import { useEffect, useState } from "react";
import "./App.css";
import { API_URL } from "./api";
import Buscador from "./Buscador";
import Chat from "./Chat";
import Cuenta from "./Cuenta";
import { borrarSesion, guardarSesion, leerSesion } from "./sesion";
import type { Sesion } from "./sesion";

type Pestana = "chat" | "buscador" | "cuenta";

function App() {
  const [pestana, setPestana] = useState<Pestana>("chat");
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);

  // Al abrir la página, revisa con el backend que el token guardado siga siendo válido.
  useEffect(() => {
    const guardada = leerSesion();
    if (!guardada) return;
    fetch(`${API_URL}/yo`, {
      headers: { Authorization: `Bearer ${guardada.token}` },
    })
      .then((respuesta) => {
        if (respuesta.status === 401) {
          borrarSesion();
          setSesion(null);
        }
      })
      .catch(() => {
        // sin conexión: se conserva la sesión y se vuelve a revisar en la próxima visita
      });
  }, []);

  function alIngresar(nueva: Sesion) {
    guardarSesion(nueva);
    setSesion(nueva);
  }

  function alSalir() {
    borrarSesion();
    setSesion(null);
  }

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

        {/* Las vistas siguen montadas para no perder la conversación al cambiar de pestaña */}
        <div hidden={pestana !== "chat"}>
          <Chat />
        </div>
        <div hidden={pestana !== "buscador"}>
          <Buscador />
        </div>
        <div hidden={pestana !== "cuenta"}>
          <Cuenta sesion={sesion} alIngresar={alIngresar} alSalir={alSalir} />
        </div>
      </main>

      <footer className="pie">
        Proyecto de Estructuras de Datos · UCC Pasto
      </footer>
    </div>
  );
}

export default App;
