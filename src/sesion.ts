// Guarda la sesión en el navegador para no pedir el inicio de sesión en cada
// visita. Solo se guarda el token y los datos públicos del usuario, nunca la
// contraseña.

export type Usuario = {
  id: number;
  nombre: string;
  correo: string;
};

export type Sesion = {
  token: string;
  usuario: Usuario;
};

const LLAVE = "terminapp_sesion";

export function leerSesion(): Sesion | null {
  try {
    const guardado = localStorage.getItem(LLAVE);
    return guardado ? (JSON.parse(guardado) as Sesion) : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion: Sesion) {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(sesion));
  } catch {
    // si el navegador no deja guardar, la sesión dura solo mientras la página esté abierta
  }
}

export function borrarSesion() {
  try {
    localStorage.removeItem(LLAVE);
  } catch {
    // nada que borrar
  }
}
