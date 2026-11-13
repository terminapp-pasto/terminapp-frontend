import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import "./App.css";
import "./design.css";
import Account from "./Account";
import AdminPanel from "./AdminPanel";
import { reloadSettings, useAppSettings } from "./appSettings";
import AuthScreen from "./AuthScreen";
import { ApiError, apiRequest, errorText } from "./api";
import Chat from "./Chat";
import Footer from "./Footer";
import { BusIcon, ChatIcon, CloseIcon, SearchIcon, TicketIcon, UserIcon } from "./Icons";
import Logo from "./Logo";
import Purchase from "./Purchase";
import ResumePayment from "./ResumePayment";
import SearchForm from "./SearchForm";
import { clearSession, isStaff, loadSession, saveSession } from "./session";
import type { Session, User } from "./session";
import type { Departure } from "./types";

type Section = "chat" | "search" | "account" | "panel";
type GlobalNotice = { kind: "success" | "info" | "error"; text: string };

// After paying, Stripe brings the user back with
// ?payment=success&session_id=... It is read once and the address bar is cleaned.
function readPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  if (params.get("payment") !== "success" || !sessionId) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return { sessionId };
}

const PAYMENT_RETURN = readPaymentReturn();

function App() {
  const appSettings = useAppSettings();
  const [section, setSection] = useState<Section>(PAYMENT_RETURN ? "account" : "chat");
  const [session, setSession] = useState<Session | null>(loadSession);
  const [departureToBuy, setDepartureToBuy] = useState<Departure | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [paymentToResume, setPaymentToResume] = useState<number | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [notice, setNotice] = useState<GlobalNotice | null>(
    !PAYMENT_RETURN
      ? null
      : loadSession()
        ? { kind: "info", text: "Confirmando tu pago con Stripe..." }
        : {
            // coming back from Stripe without a session: the payment is still confirmed by
            // the server (Stripe webhook); logging in shows the tickets
            kind: "info",
            text: "Recibimos tu pago. Inicia sesión para ver tus tiquetes en Mis viajes.",
          }
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const refreshHistory = useCallback(() => setHistoryRefresh((n) => n + 1), []);

  // If the browser restores the page from its cache ("back" button), reload
  // it so we never show a half-open window or a stuck button.
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // The texts and rules the admin set in the panel.
  useEffect(() => {
    reloadSettings();
  }, []);

  // When the page opens, ask the backend whether the saved token is still valid.
  useEffect(() => {
    const saved = loadSession();
    if (!saved) return;
    apiRequest<User>("/me", { token: saved.token })
      .then((user) => {
        // the role may have changed (the admin made this user a company employee)
        const updated = { ...saved, user };
        saveSession(updated);
        setSession(updated);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) logout();
        // offline: keep the session and check again on the next visit
      });
  }, [logout]);

  // Coming back from a payment: ask the backend (which asks Stripe) whether it went through.
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
    // without a session, "Ingresar" opens the full-screen login page
    if ((target === "account" || target === "panel") && !session) {
      setIsLoginOpen(true);
      return;
    }
    setSection(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Logging in from the purchase keeps the purchase open (it continues with the seats);
  // logging in from "Ingresar" goes to Mis viajes.
  function login(newSession: Session) {
    saveSession(newSession);
    setSession(newSession);
    if (isLoginOpen) {
      setIsLoginOpen(false);
      // the admin and the companies land on their panel
      setSection(isStaff(newSession.user) ? "panel" : "account");
    }
  }

  const closeLogin = useCallback(() => setIsLoginOpen(false), []);

  const handleSessionExpired = useCallback(() => {
    logout();
    setDepartureToBuy(null);
    setPaymentToResume(null);
    setNotice({ kind: "error", text: "Tu sesión venció. Inicia sesión otra vez." });
  }, [logout]);

  // reload the history when the purchase closes: a pending purchase may be left
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

  const isScreenOpen =
    departureToBuy !== null || (isLoginOpen && !session) || (paymentToResume !== null && session !== null);
  const firstName = session ? session.user.name.split(" ")[0] : "";
  const showPanel = session !== null && isStaff(session.user);
  const activeSection = section === "panel" && !showPanel ? "chat" : section;
  const sections: { id: Section; label: string; icon: ReactNode }[] = [
    { id: "chat", label: "Chat con IA", icon: <ChatIcon /> },
    { id: "search", label: "Buscador", icon: <SearchIcon /> },
    {
      id: "account",
      label: session ? "Mis viajes" : "Ingresar",
      icon: session ? <TicketIcon /> : <UserIcon />,
    },
    ...(showPanel
      ? [{ id: "panel" as const, label: session?.user.role === "admin" ? "Admin" : "Mi empresa", icon: <BusIcon /> }]
      : []),
  ];

  return (
    <>
    {/* while a full page (purchase, login, payment) is open, the app behind cannot be
        reached with Tab or a screen reader */}
    <div className="page" inert={isScreenOpen}>
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
                aria-pressed={activeSection === item.id}
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

      {activeSection === "panel" ? (
        <section className="hero compact" aria-hidden="true" />
      ) : (
        <section className="hero">
          <h1>
            {appSettings.home_title}
            {appSettings.home_highlight && <> <span>{appSettings.home_highlight}</span></>}
          </h1>
          {appSettings.home_subtitle && <p>{appSettings.home_subtitle}</p>}
        </section>
      )}

      <main className={`content${activeSection === "panel" ? " wide" : ""}`}>
        {appSettings.announcement && (
          <div className="announcement" role="note">
            {appSettings.announcement}
          </div>
        )}
        {notice && (
          <div className={`global-notice ${notice.kind}`} role="status">
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="notice-close">
              <CloseIcon size={18} />
            </button>
          </div>
        )}

        {/* Views stay mounted so the conversation is not lost when switching sections */}
        <div hidden={activeSection !== "chat"}>
          <Chat
            onBuy={setDepartureToBuy}
            isActive={activeSection === "chat" && !departureToBuy}
            refreshKey={historyRefresh}
          />
        </div>
        <div hidden={activeSection !== "search"}>
          <SearchForm onBuy={setDepartureToBuy} />
        </div>
        {showPanel && session && activeSection === "panel" && (
          <AdminPanel session={session} onSessionExpired={handleSessionExpired} />
        )}
        <div hidden={activeSection !== "account"}>
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

      {/* On phones the menu sits at the bottom, within thumb reach, like in apps */}
      <nav className="bottom-menu" aria-label="Secciones">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={activeSection === item.id}
            onClick={() => navigateTo(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>

      {departureToBuy && (
        <Purchase
          departure={departureToBuy}
          session={session}
          onClose={closePurchase}
          onLogin={login}
          onSessionExpired={handleSessionExpired}
          onReserved={refreshHistory}
          onPaid={handleAlreadyPaid}
        />
      )}

      {isLoginOpen && !session && <AuthScreen onLogin={login} onBack={closeLogin} />}

      {paymentToResume !== null && session && (
        <ResumePayment
          paymentId={paymentToResume}
          token={session.token}
          onClose={closeResumePayment}
          onSessionExpired={handleSessionExpired}
          onAlreadyPaid={handleResumeAlreadyPaid}
        />
      )}
    </>
  );
}

export default App;
