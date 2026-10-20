import { IconoCorreo, IconoTelefono, IconoUbicacion } from "./Iconos";
import Logo from "./Logo";

type Seccion = "chat" | "buscador" | "cuenta";

// Datos de contacto tomados de la página oficial de la terminal (terminalpasto.gov.co/contacto).
const TERMINAL = {
  direccion: "Carrera 6ª No. 16D-50, barrio Madrigal, Pasto",
  telefonos: ["(602) 729 0265", "302 728 8990"],
  correo: "pqrs@terminalpasto.gov.co",
  sitio: "https://terminalpasto.gov.co",
};

function Pie({ alIr }: { alIr: (seccion: Seccion) => void }) {
  return (
    <footer className="pie">
      <div className="pie-columnas">
        <div className="pie-marca">
          <Logo tamano={32} />
          <p>
            Busca y compra pasajes de bus desde la Terminal de Transportes de
            Pasto hablando con una IA.
          </p>
        </div>

        <div>
          <h3>Navegar</h3>
          <ul>
            <li>
              <button type="button" onClick={() => alIr("chat")}>Chat con IA</button>
            </li>
            <li>
              <button type="button" onClick={() => alIr("buscador")}>Buscador</button>
            </li>
            <li>
              <button type="button" onClick={() => alIr("cuenta")}>Mi cuenta y tiquetes</button>
            </li>
          </ul>
        </div>

        <div>
          <h3>Terminal de Transportes de Pasto</h3>
          <ul className="pie-contacto">
            <li>
              <IconoUbicacion tamano={16} />
              <span>{TERMINAL.direccion}</span>
            </li>
            <li>
              <IconoTelefono tamano={16} />
              <span>
                {TERMINAL.telefonos.map((telefono, i) => (
                  <span key={telefono}>
                    {i > 0 && " · "}
                    <a href={`tel:${telefono.replace(/\D/g, "")}`}>{telefono}</a>
                  </span>
                ))}
              </span>
            </li>
            <li>
              <IconoCorreo tamano={16} />
              <a href={`mailto:${TERMINAL.correo}`}>{TERMINAL.correo}</a>
            </li>
            <li>
              <a href={TERMINAL.sitio} target="_blank" rel="noreferrer">
                Sitio oficial de la terminal ↗
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3>El proyecto</h3>
          <ul>
            <li>Estructuras de Datos · UCC Pasto</li>
            <li>
              <a href="https://github.com/terminapp-pasto/terminapp-frontend" target="_blank" rel="noreferrer">
                Código del frontend ↗
              </a>
            </li>
            <li>
              <a href="https://github.com/terminapp-pasto/terminapp-backend" target="_blank" rel="noreferrer">
                Código del backend ↗
              </a>
            </li>
          </ul>
        </div>
      </div>

      <p className="pie-aviso">
        TerminAPP es un proyecto académico. No es la página oficial de la
        Terminal ni de las empresas de transporte, y los pagos son de prueba.
      </p>
    </footer>
  );
}

export default Pie;
