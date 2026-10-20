import { useState } from "react";
import "./App.css";
import Buscador from "./Buscador";
import Chat from "./Chat";

type Pestana = "chat" | "buscador";

function App() {
  const [pestana, setPestana] = useState<Pestana>("chat");

  return (
    <div className="pagina">
      <header className="encabezado">
        <h1>
          Termin<span>APP</span>
        </h1>
        <p>Pasajes desde la Terminal de Transportes de Pasto</p>
      </header>

      <main className="contenido">
        <nav className="pestanas" aria-label="Forma de buscar">
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
        </nav>

        {/* Las dos vistas siguen montadas para no perder la conversación al cambiar de pestaña */}
        <div hidden={pestana !== "chat"}>
          <Chat />
        </div>
        <div hidden={pestana !== "buscador"}>
          <Buscador />
        </div>
      </main>

      <footer className="pie">
        Proyecto de Estructuras de Datos · UCC Pasto
      </footer>
    </div>
  );
}

export default App;
