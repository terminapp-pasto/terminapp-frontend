import AuthForm from "./AuthForm";
import MyTickets from "./MyTickets";
import type { Session } from "./session";

type Props = {
  session: Session | null;
  onLogin: (session: Session) => void;
  onLogout: () => void;
  onResumePayment: (paymentId: number) => void;
  refreshKey: number;
};

function Account({ session, onLogin, onLogout, onResumePayment, refreshKey }: Props) {
  if (session) {
    return (
      <section className="account wide">
        <div className="account-greeting">
          <div>
            <h2>Hola, {session.user.name} 👋</h2>
            <p className="account-detail">
              Iniciaste sesión como <strong>{session.user.email}</strong>.
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
        <MyTickets
          token={session.token}
          refreshKey={refreshKey}
          onSessionExpired={onLogout}
          onResumePayment={onResumePayment}
        />
      </section>
    );
  }

  return (
    <section className="account">
      <h2>Ingresa a TerminAPP</h2>
      <p className="account-detail">Tus viajes y tiquetes quedan guardados en tu cuenta.</p>
      <AuthForm onLogin={onLogin} idPrefix="account" />
    </section>
  );
}

export default Account;
