import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import "./App.css";
import Account from "./Account";
import { ApiError, apiRequest, errorText } from "./api";
import Chat from "./Chat";
import Footer from "./Footer";
import { ChatIcon, SearchIcon, TicketIcon, UserIcon } from "./Icons";
import Logo from "./Logo";
import Purchase from "./Purchase";
import ResumePayment from "./ResumePayment";
import SearchForm from "./SearchForm";
import { clearSession, loadSession, saveSession } from "./session";
import type { Session } from "./session";
import type { Departure } from "./types";

type Section = "chat" | "search" | "account";
type GlobalNotice = { kind: "success" | "info" | "error"; text: string };

// Al terminar el pago, Stripe trae al usuario de vuelta con
// ?payment=success&session_id=... Se lee una sola vez y se limpia la barra.
function readPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  if (params.get("payment") !== "success" || !sessionId) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return { sessionId };
}

const PAYMENT_RETURN = readPaymentReturn();

function App() {
  const [section, setSection] = useState<Section>(PAYMENT_RETURN ? "account" : "chat");
  const [session, setSession] = useState<Session | null>(loadSession);
  const [departureToBuy, setDepartureToBuy] = useState<Departure | null>(null);
  const [departureAfterLogin, setDepartureAfterLogin] = useState<Departure | null>(null);
  const [paymentToResume, setPaymentToResume] = useState<number | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [notice, setNotice] = useState<GlobalNotice | null>(
    PAYMENT_RETURN ? { kind: "info", text: "Confirmando tu pago con Stripe..." } : null
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const refreshHistory = useCallback(() => setHistoryRefresh((n) => n + 1), []);

  // Si el navegador restaura la página desde su memoria (botón "atrás"), se
  // recarga para no mostrar una ventana a medias o un botón trabado.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Al abrir la página, revisa con el backend que el token guardado siga siendo válido.
  useEffect(() => {
    const saved = loadSession();
    if (!saved) return;
    apiRequest("/me", { token: saved.token }).catch((error) => {
      if (error instanceof ApiError && error.status === 401) logout();
      // sin conexión: se conserva la sesión y se vuelve a revisar en la próxima visita
    });
  }, [logout]);

  // Si viene de pagar, le pregunta al backend (y él a Stripe) si el pago se hizo.
  useEffect(() => {
    const saved = loadSession();
    if (!PAYMENT_RETURN || !saved) return;
    apiRequest(`/purchases/confirm?session_id=${encodeURIComponent(PAYMENT_RETURN.sessionId)}`, {
      token: saved.token,
    })
      .then(() =>
        setNotice({ kind: "success", text: "¡Pago aprobado! Tus tiquetes ya están confirmados. ¡Buen viaje!" })
      )
      .catch((error) => setNotice({ kind: "error", text: errorText(error) }))
      .finally(refreshHistory);
  }, [refreshHistory]);

  function navigateTo(target: Section) {
    setSection(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function login(newSession: Session) {
    saveSession(newSession);
    setSession(newSession);
    if (departureAfterLogin) {
      // venía de darle Comprar sin sesión: se retoma la compra
      setDepartureToBuy(departureAfterLogin);
      setDepartureAfterLogin(null);
    }
  }

  function requireLogin() {
    setDepartureAfterLogin(departureToBuy);
    setDepartureToBuy(null);
    navigateTo("account");
  }

  const handleSessionExpired = useCallback(() => {
    logout();
    setDepartureToBuy(null);
    setPaymentToResume(null);
    setNotice({ kind: "error", text: "Tu sesión venció. Inicia sesión otra vez." });
  }, [logout]);

  // al cerrar la compra se recarga el historial: pudo quedar una compra pendiente de pago
  const closePurchase = useCallback(() => {
    setDepartureToBuy(null);
    refreshHistory();
  }, [refreshHistory]);
  const closeResumePayment = useCallback(() => {
    setPaymentToResume(null);
    refreshHistory();
  }, [refreshHistory]);
  const handleAlreadyPaid = useCallback(() => {
    setNotice({ kind: "success", text: "Ese pago ya estaba aprobado. Tus tiquetes están confirmados." });
    refreshHistory();
  }, [refreshHistory]);

  const handleResumeAlreadyPaid = useCallback(() => {
    handleAlreadyPaid();
    setPaymentToResume(null);
  }, [handleAlreadyPaid]);

  const firstName = session ? session.user.name.split(" ")[0] : "";
  const sections: { id: Section; label: string; icon: ReactNode }[] = [
    { id: "chat", label: "Chat con IA", icon: <ChatIcon /> },
    { id: "search", label: "Buscador", icon: <SearchIcon /> },
    {
      id: "account",
      label: session ? "Mis viajes" : "Ingresar",
      icon: session ? <TicketIcon /> : <UserIcon />,
    },
  ];

  return (
    <div className="page">
      <header className="top-bar">
        <div className="header-content">
          <button type="button" className="logo-button" onClick={() => navigateTo("chat")}>
            <Logo />
          </button>
          <nav className="menu" aria-label="Secciones">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={section === item.id}
                onClick={() => navigateTo(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="account-button"
            onClick={() => navigateTo("account")}
            aria-label={session ? `Cuenta de ${firstName}` : "Ingresar"}
          >
            <UserIcon />
            <span>{session ? firstName : "Ingresar"}</span>
          </button>
        </div>
      </header>

      <section className="hero">
        <h1>
          ¿A dónde viajas hoy <span>desde Pasto</span>?
        </h1>
        <p>Escríbelo como se lo dirías a una persona. La IA busca las salidas y tú eliges el asiento.</p>
      </section>

      <main className="content">
        {notice && (
          <div className={`global-notice ${notice.kind}`} role="status">
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso">
              ×
            </button>
          </div>
        )}

        {/* Las vistas siguen montadas para no perder la conversación al cambiar de sección */}
        <div hidden={section !== "chat"}>
          <Chat onBuy={setDepartureToBuy} />
        </div>
        <div hidden={section !== "search"}>
          <SearchForm onBuy={setDepartureToBuy} />
        </div>
        <div hidden={section !== "account"}>
          <Account
            session={session}
            onLogin={login}
            onLogout={logout}
            onResumePayment={setPaymentToResume}
            refreshKey={historyRefresh}
          />
        </div>
      </main>

      <Footer onNavigate={navigateTo} />

      {/* En el celular el menú va abajo, al alcance del pulgar, como en las apps */}
      <nav className="bottom-menu" aria-label="Secciones">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={section === item.id}
            onClick={() => navigateTo(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {departureToBuy && (
        <Purchase
          departure={departureToBuy}
          session={session}
          onClose={closePurchase}
          onLoginRequired={requireLogin}
          onSessionExpired={handleSessionExpired}
          onReserved={refreshHistory}
          onPaid={handleAlreadyPaid}
        />
      )}

      {paymentToResume !== null && session && (
        <ResumePayment
          paymentId={paymentToResume}
          token={session.token}
          onClose={closeResumePayment}
          onSessionExpired={handleSessionExpired}
          onAlreadyPaid={handleResumeAlreadyPaid}
        />
      )}
    </div>
  );
}

export default App;
