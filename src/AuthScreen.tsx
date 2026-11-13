import AuthForm from "./AuthForm";
import { CheckIcon } from "./Icons";
import RoadScene from "./RoadScene";
import ScreenShell from "./ScreenShell";
import type { Session } from "./session";

type Props = {
  onLogin: (session: Session) => void;
  onBack: () => void;
};

const BENEFITS = [
  "Le escribes a la IA como a una persona y ella busca las salidas.",
  "Eliges tu asiento en el mapa del bus.",
  "Tus tiquetes quedan en Mis viajes y te los mandas a WhatsApp.",
];

// Full-screen login page: the big message and an animated road on one side,
// the login card on the other (on phones, the card goes first).
function AuthScreen({ onLogin, onBack }: Props) {
  return (
    <ScreenShell titleId="auth-title" title="Ingresar" backLabel="Volver" onBack={onBack} tone="dark">
      <div className="auth-screen">
        <RoadScene />
        <section className="auth-pitch" aria-label="Qué puedes hacer en TerminAPP">
          <p className="eyebrow">Terminal de Transportes de Pasto</p>
          <h3>
            Tu próximo viaje, <span>a una frase</span> de distancia.
          </h3>
          <ul>
            {BENEFITS.map((benefit) => (
              <li key={benefit}>
                <CheckIcon size={16} />
                {benefit}
              </li>
            ))}
          </ul>
        </section>
        <section className="auth-card" aria-labelledby="auth-card-title">
          <h3 id="auth-card-title">Bienvenido a TerminAPP</h3>
          <p>Inicia sesión o crea tu cuenta en menos de un minuto.</p>
          <AuthForm onLogin={onLogin} idPrefix="screen" />
        </section>
      </div>
    </ScreenShell>
  );
}

export default AuthScreen;
