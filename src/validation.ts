// Reglas de los formularios con expresiones regulares. Son las mismas que
// revisa el backend (services/validation.py): aquí sirven para avisar rápido,
// pero el backend vuelve a revisar porque cualquiera puede llamar a la API.

export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 50;
export const DOCUMENT_MIN_LENGTH = 5;
export const DOCUMENT_MAX_LENGTH = 12;
export const EMAIL_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const CHAT_MESSAGE_MAX_LENGTH = 500;

// Letras (con tildes y ñ), espacios, apóstrofo, punto y guion. Empieza con letra.
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]*$/;
const DOCUMENT_PATTERN = /^\d+$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const NAME_RULE = `Solo letras y espacios, de ${NAME_MIN_LENGTH} a ${NAME_MAX_LENGTH} caracteres.`;
export const DOCUMENT_RULE = `Solo números, de ${DOCUMENT_MIN_LENGTH} a ${DOCUMENT_MAX_LENGTH} dígitos.`;
export const EMAIL_RULE = "Escribe un correo válido, por ejemplo ana@correo.com.";
export const PASSWORD_RULE = `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`;

export function normalizeSpaces(text: string) {
  return text.trim().split(/\s+/).join(" ");
}

export function isValidName(name: string) {
  const clean = normalizeSpaces(name);
  return clean.length >= NAME_MIN_LENGTH && clean.length <= NAME_MAX_LENGTH && NAME_PATTERN.test(clean);
}

export function isValidDocument(document: string) {
  const clean = document.trim();
  return (
    clean.length >= DOCUMENT_MIN_LENGTH &&
    clean.length <= DOCUMENT_MAX_LENGTH &&
    DOCUMENT_PATTERN.test(clean)
  );
}

export function isValidEmail(email: string) {
  const clean = email.trim();
  return clean.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(clean);
}

export function isValidPassword(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}

// Mientras se escribe el documento, deja solo los números.
export function keepDigits(text: string) {
  return text.replace(/\D/g, "").slice(0, DOCUMENT_MAX_LENGTH);
}
