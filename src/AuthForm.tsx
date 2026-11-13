import { useState } from "react";
import type { FormEvent } from "react";
import { apiRequest, errorText } from "./api";
import FieldHint from "./FieldHint";
import type { Session } from "./session";
import {
  EMAIL_MAX_LENGTH,
  EMAIL_RULE,
  NAME_MAX_LENGTH,
  NAME_RULE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_RULE,
  isValidEmail,
  isValidName,
  isValidPassword,
  normalizeSpaces,
} from "./validation";

type AccessMode = "login" | "register";

// Test accounts so the professor can review each role. They come from the Vercel
// environment variables (nothing is hardcoded); if they are missing, they are hidden.
// The company and traveler accounts share the admin's password and, like in the
// backend, use its email with a prefix unless their own variable is set.
const TEST_EMAIL = import.meta.env.VITE_TEST_ACCOUNT_EMAIL ?? "";
const TEST_PASSWORD = import.meta.env.VITE_TEST_ACCOUNT_PASSWORD ?? "";

function prefixedEmail(prefix: string, ownEmail?: string) {
  return ownEmail || (TEST_EMAIL ? `${prefix}.${TEST_EMAIL}` : "");
}

type TestAccount = { role: string; description: string; email: string };

const TEST_ACCOUNTS: TestAccount[] = [
  {
    role: "Administrador",
    description: "Todo: compras, Mis viajes y el panel de todas las empresas.",
    email: TEST_EMAIL,
  },
  {
    role: "Empresa",
    description: "El panel de su empresa: buses, precios, horarios y ocupación.",
    email: prefixedEmail("empresa", import.meta.env.VITE_TEST_COMPANY_ACCOUNT_EMAIL),
  },
  {
    role: "Viajero",
    description: "Buscar, comprar pasajes y ver Mis viajes, sin panel.",
    email: prefixedEmail("viajero", import.meta.env.VITE_TEST_TRAVELER_ACCOUNT_EMAIL),
  },
];

type Props = {
  onLogin: (session: Session) => void;
  // id prefix, so two forms on the same page never share ids
  idPrefix?: string;
};

// Log in or create an account. Used by the full-screen login page, inside the
// purchase when the user has no session, and in "Ingresar".
function AuthForm({ onLogin, idPrefix = "auth" }: Props) {
  const [mode, setMode] = useState<AccessMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [triedToSubmit, setTriedToSubmit] = useState(false);

  function changeMode(newMode: AccessMode) {
    setMode(newMode);
    setErrorMessage("");
    setTriedToSubmit(false);
  }

  function fillTestAccount(account: TestAccount) {
    setEmail(account.email);
    setPassword(TEST_PASSWORD);
    setErrorMessage("");
  }

  const isRegister = mode === "register";
  const nameError = isRegister && !isValidName(name) ? NAME_RULE : "";
  const emailError = !isValidEmail(email) ? EMAIL_RULE : "";
  const passwordError = isRegister && !isValidPassword(password) ? PASSWORD_RULE : "";
  const hasErrors = Boolean(nameError || emailError || passwordError || (!isRegister && !password));

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    setTriedToSubmit(true);
    if (hasErrors) return;
    setIsSending(true);
    setErrorMessage("");

    const path = isRegister ? "/register" : "/login";
    const body = isRegister
      ? { name: normalizeSpaces(name), email: email.trim(), password }
      : { email: email.trim(), password };

    try {
      const data = await apiRequest<Session>(path, { method: "POST", body });
      setPassword("");
      onLogin({ token: data.token, user: data.user });
    } catch (error) {
      setErrorMessage(errorText(error));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="auth-form">
      <div className="account-modes" role="group" aria-label="Tipo de acceso">
        <button type="button" aria-pressed={mode === "login"} onClick={() => changeMode("login")}>
          Iniciar sesión
        </button>
        <button type="button" aria-pressed={mode === "register"} onClick={() => changeMode("register")}>
          Crear cuenta
        </button>
      </div>

      {mode === "login" && TEST_EMAIL && TEST_PASSWORD && (
        <div className="test-accounts">
          <p className="test-accounts-title">
            <strong>Cuentas de prueba</strong> · una por rol, todas con la contraseña <code>{TEST_PASSWORD}</code>
          </p>
          {TEST_ACCOUNTS.map((account) => (
            <div key={account.role} className="test-account">
              <p>
                <strong>{account.role}</strong> · <code>{account.email}</code>
                <br />
                <small>{account.description}</small>
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => fillTestAccount(account)}
                aria-label={`Usar la cuenta de prueba ${account.role}`}
              >
                Usar
              </button>
            </div>
          ))}
        </div>
      )}

      <form className="account-form" onSubmit={submitForm} noValidate>
        {isRegister && (
          <div className="field">
            <label htmlFor={`${idPrefix}-name`}>Nombre</label>
            <input
              id={`${idPrefix}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={NAME_MAX_LENGTH}
              aria-invalid={triedToSubmit && Boolean(nameError)}
            />
            <FieldHint
              text={NAME_RULE}
              isError={triedToSubmit && Boolean(nameError)}
              length={name.length}
              maxLength={NAME_MAX_LENGTH}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor={`${idPrefix}-email`}>Correo</label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={EMAIL_MAX_LENGTH}
            aria-invalid={triedToSubmit && Boolean(emailError)}
          />
          {triedToSubmit && emailError && <small className="field-error">{emailError}</small>}
        </div>

        <div className="field">
          <label htmlFor={`${idPrefix}-password`}>Contraseña</label>
          <input
            id={`${idPrefix}-password`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            maxLength={PASSWORD_MAX_LENGTH}
            aria-invalid={triedToSubmit && Boolean(passwordError)}
          />
          {isRegister && <small className={triedToSubmit && passwordError ? "field-error" : "hint"}>{PASSWORD_RULE}</small>}
        </div>

        {errorMessage && (
          <div className="notice error" role="alert">
            {errorMessage}
          </div>
        )}

        <button type="submit" className="primary-button full-width big" disabled={isSending}>
          {isSending ? "Un momento..." : isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}

export default AuthForm;
