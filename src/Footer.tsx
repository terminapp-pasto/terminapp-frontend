import { LocationIcon, MailIcon, PhoneIcon } from "./Icons";
import Logo from "./Logo";

type Section = "chat" | "search" | "account";

// Datos de contacto tomados de la página oficial de la terminal (terminalpasto.gov.co/contacto).
const TERMINAL_CONTACT = {
  address: "Carrera 6ª No. 16D-50, barrio Madrigal, Pasto",
  phones: ["(602) 729 0265", "302 728 8990"],
  email: "pqrs@terminalpasto.gov.co",
  website: "https://terminalpasto.gov.co",
};

const FRONTEND_REPOSITORY = "https://github.com/terminapp-pasto/terminapp-frontend";
const BACKEND_REPOSITORY = "https://github.com/terminapp-pasto/terminapp-backend";

function Footer({ onNavigate }: { onNavigate: (section: Section) => void }) {
  return (
    <footer className="footer">
      <div className="footer-columns">
        <div className="footer-brand">
          <Logo size={32} />
          <p>
            Busca y compra pasajes de bus desde la Terminal de Transportes de
            Pasto hablando con una IA.
          </p>
        </div>

        <div>
          <h3>Navegar</h3>
          <ul>
            <li>
              <button type="button" onClick={() => onNavigate("chat")}>Chat con IA</button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate("search")}>Buscador</button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate("account")}>Mi cuenta y mis viajes</button>
            </li>
          </ul>
        </div>

        <div>
          <h3>Terminal de Transportes de Pasto</h3>
          <ul className="footer-contact">
            <li>
              <LocationIcon size={16} />
              <span>{TERMINAL_CONTACT.address}</span>
            </li>
            <li>
              <PhoneIcon size={16} />
              <span>
                {TERMINAL_CONTACT.phones.map((phone, index) => (
                  <span key={phone}>
                    {index > 0 && " · "}
                    <a href={`tel:${phone.replace(/\D/g, "")}`}>{phone}</a>
                  </span>
                ))}
              </span>
            </li>
            <li>
              <MailIcon size={16} />
              <a href={`mailto:${TERMINAL_CONTACT.email}`}>{TERMINAL_CONTACT.email}</a>
            </li>
            <li>
              <a href={TERMINAL_CONTACT.website} target="_blank" rel="noreferrer">
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
              <a href={FRONTEND_REPOSITORY} target="_blank" rel="noreferrer">
                Código del frontend ↗
              </a>
            </li>
            <li>
              <a href={BACKEND_REPOSITORY} target="_blank" rel="noreferrer">
                Código del backend ↗
              </a>
            </li>
          </ul>
        </div>
      </div>

      <p className="footer-notice">
        TerminAPP es un proyecto académico. No es la página oficial de la
        Terminal ni de las empresas de transporte, y los pagos son de prueba.
      </p>
    </footer>
  );
}

export default Footer;
