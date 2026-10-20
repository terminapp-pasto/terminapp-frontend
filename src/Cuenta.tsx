import { useState } from "react";
import type { FormEvent } from "react";
import { API_URL, ERROR_CONEXION, mensajeDeError } from "./api";
import type { Sesion } from "./sesion";

type Modo = "ingresar" | "registro";

type Props = {
  sesion: Sesion | null;
  alIngresar: (sesion: Sesion) => void;
  alSalir: () => void;
};

function Cuenta({ sesion, alIngresar, alSalir }: Props) {
  const [modo, setModo] = useState<Modo>("ingresar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setMensajeError("");
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setCargando(true);
    setMensajeError("");

    const ruta = modo === "registro" ? "/registro" : "/inicio-sesion";
    const cuerpo =
      modo === "registro"
        ? { nombre, correo, contrasena }
        : { correo, contrasena };

    try {
      const respuesta = await fetch(`${API_URL}${ruta}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = await respuesta.json().catch(() => null);

      if (!respuesta.ok || !datos) {
        setMensajeError(
          mensajeDeError(datos, "El servidor respondió con un error.")
        );
        return;
      }

      setContrasena("");
      alIngresar({ token: datos.token, usuario: datos.usuario });
    } catch {
      setMensajeError(ERROR_CONEXION);
    } finally {
      setCargando(false);
    }
  }

  if (sesion) {
    return (
      <section className="cuenta">
        <h2>Hola, {sesion.usuario.nombre} 👋</h2>
        <p className="cuenta-dato">
          Iniciaste sesión como <strong>{sesion.usuario.correo}</strong>.
        </p>
        <p className="cuenta-dato">
          Con tu cuenta podrás comprar pasajes y ver tus tiquetes.
        </p>
        <button type="button" className="boton-secundario" onClick={alSalir}>
          Cerrar sesión
        </button>
      </section>
    );
  }

  return (
    <section className="cuenta">
      <div className="cuenta-modos" role="group" aria-label="Tipo de acceso">
        <button
          type="button"
          aria-pressed={modo === "ingresar"}
          onClick={() => cambiarModo("ingresar")}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          aria-pressed={modo === "registro"}
          onClick={() => cambiarModo("registro")}
        >
          Crear cuenta
        </button>
      </div>

      <form className="cuenta-formulario" onSubmit={enviar}>
        {modo === "registro" && (
          <div className="campo">
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              required
              minLength={2}
            />
          </div>
        )}

        <div className="campo">
          <label htmlFor="correo">Correo</label>
          <input
            id="correo"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="contrasena">Contraseña</label>
          <input
            id="contrasena"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete={
              modo === "registro" ? "new-password" : "current-password"
            }
            required
            minLength={modo === "registro" ? 8 : undefined}
          />
          {modo === "registro" && (
            <small className="ayuda">Mínimo 8 caracteres.</small>
          )}
        </div>

        {mensajeError && (
          <div className="aviso error" role="alert">
            {mensajeError}
          </div>
        )}

        <button type="submit" className="boton-principal" disabled={cargando}>
          {cargando
            ? "Un momento..."
            : modo === "registro"
              ? "Crear cuenta"
              : "Iniciar sesión"}
        </button>
      </form>
    </section>
  );
}

export default Cuenta;
