// Form rules using regular expressions. They are the same ones the backend
// checks (services/validation.py): here they warn the user early, but the
// backend checks again because anyone can call the API.

export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 50;
export const DOCUMENT_MIN_LENGTH = 5;
export const DOCUMENT_MAX_LENGTH = 12;
export const EMAIL_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const CHAT_MESSAGE_MAX_LENGTH = 500;

// Letters (with accents and ñ), spaces, apostrophe, dot and hyphen. Starts with a letter.
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

// Colombian identity documents, the same as DOCUMENT_TYPES in the backend.
export type DocumentType = "CC" | "TI" | "CE" | "PA";

type DocumentTypeRule = { label: string; shortLabel: string; pattern: RegExp; maxLength: number; rule: string; onlyDigits: boolean };

export const DEFAULT_DOCUMENT_TYPE: DocumentType = "CC";

export const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeRule> = {
  CC: { label: "Cédula de ciudadanía", shortLabel: "Cédula", pattern: /^\d{5,10}$/, maxLength: 10, rule: "Solo números, de 5 a 10 dígitos.", onlyDigits: true },
  TI: { label: "Tarjeta de identidad", shortLabel: "T. de identidad", pattern: /^\d{10,11}$/, maxLength: 11, rule: "Solo números, 10 u 11 dígitos.", onlyDigits: true },
  CE: { label: "Cédula de extranjería", shortLabel: "C. de extranjería", pattern: /^\d{5,12}$/, maxLength: 12, rule: "Solo números, de 5 a 12 dígitos.", onlyDigits: true },
  PA: { label: "Pasaporte", shortLabel: "Pasaporte", pattern: /^[A-Z0-9]{5,12}$/, maxLength: 12, rule: "Letras y números, de 5 a 12 caracteres.", onlyDigits: false },
};

export const DOCUMENT_TYPE_CODES = Object.keys(DOCUMENT_TYPES) as DocumentType[];

export function isValidDocumentOfType(document: string, documentType: DocumentType) {
  return DOCUMENT_TYPES[documentType].pattern.test(document.trim());
}

// While the document is typed: digits only, or letters and digits in capitals for a passport.
export function cleanDocumentInput(text: string, documentType: DocumentType) {
  const { maxLength, onlyDigits } = DOCUMENT_TYPES[documentType];
  const clean = onlyDigits ? text.replace(/\D/g, "") : text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.slice(0, maxLength);
}

export function isValidEmail(email: string) {
  const clean = email.trim();
  return clean.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(clean);
}

export function isValidPassword(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;
}

// While the document is typed, keep only the digits.
export function keepDigits(text: string) {
  return text.replace(/\D/g, "").slice(0, DOCUMENT_MAX_LENGTH);
}
