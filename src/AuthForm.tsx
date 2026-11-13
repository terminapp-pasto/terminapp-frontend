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

// Test account so the professor can review the app. It comes from the Vercel
// environment variables (it is not hardcoded); if they are missing, it is hidden.
const TEST_ACCOUNT = {
  email: import.meta.env.VITE_TEST_ACCOUNT_EMAIL ?? "",
  password: import.meta.env.VITE_TEST_ACCOUNT_PASSWORD ?? "",
};

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

  function fillTestAccount() {
    setEmail(TEST_ACCOUNT.email);
    setPassword(TEST_ACCOUNT.password);
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

      {mode === "login" && TEST_ACCOUNT.email && TEST_ACCOUNT.password && (
        <div className="test-account">
          <p>
            <strong>Cuenta de prueba</strong>
            <br />
            Correo: <code>{TEST_ACCOUNT.email}</code>
            <br />
            Contraseña: <code>{TEST_ACCOUNT.password}</code>
          </p>
          <button type="button" className="secondary-button" onClick={fillTestAccount}>
            Usar esta cuenta
          </button>
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
