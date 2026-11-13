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

// Identity documents accepted for travel. The real list lives in the backend's
// document_types table (the admin can add more or turn one off): the purchase page
// loads it from /document-types. These four are the defaults while it loads.
export type DocumentType = string;

type DocumentTypeRule = { label: string; shortLabel: string; pattern: RegExp; maxLength: number; rule: string; onlyDigits: boolean };

// What /document-types returns for each active type.
export type DocumentTypeInfo = {
  code: string;
  name: string;
  min_length: number;
  max_length: number;
  allows_letters: boolean;
  rule: string;
};

export const DEFAULT_DOCUMENT_TYPE: DocumentType = "CC";

const SHORT_LABELS: Record<string, string> = {
  CC: "Cédula",
  TI: "T. de identidad",
  CE: "C. de extranjería",
  PA: "Pasaporte",
};

function buildRule({ code, name, min_length, max_length, allows_letters }: Omit<DocumentTypeInfo, "rule">): DocumentTypeRule {
  const characters = allows_letters ? "[A-Z0-9]" : "\\d";
  const size = min_length === max_length ? `${min_length}` : `de ${min_length} a ${max_length}`;
  return {
    label: name,
    shortLabel: SHORT_LABELS[code] ?? name,
    pattern: new RegExp(`^${characters}{${min_length},${max_length}}$`),
    maxLength: max_length,
    rule: allows_letters ? `Letras y números, ${size} caracteres.` : `Solo números, ${size} dígitos.`,
    onlyDigits: !allows_letters,
  };
}

export const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeRule> = {
  CC: buildRule({ code: "CC", name: "Cédula de ciudadanía", min_length: 5, max_length: 10, allows_letters: false }),
  TI: buildRule({ code: "TI", name: "Tarjeta de identidad", min_length: 10, max_length: 11, allows_letters: false }),
  CE: buildRule({ code: "CE", name: "Cédula de extranjería", min_length: 5, max_length: 12, allows_letters: false }),
  PA: buildRule({ code: "PA", name: "Pasaporte", min_length: 5, max_length: 12, allows_letters: true }),
};

// The types offered in the purchase form (only the active ones).
export const DOCUMENT_TYPE_CODES: DocumentType[] = Object.keys(DOCUMENT_TYPES);

// Replaces the defaults with the list from the backend. Old codes stay known, so a
// ticket bought with a type that was later turned off still shows its name.
export function setDocumentTypes(types: DocumentTypeInfo[]) {
  if (types.length === 0) return;
  for (const type of types) DOCUMENT_TYPES[type.code] = buildRule(type);
  DOCUMENT_TYPE_CODES.splice(0, DOCUMENT_TYPE_CODES.length, ...types.map((type) => type.code));
}

export function documentLabel(code: string) {
  return DOCUMENT_TYPES[code]?.label ?? code;
}

export function isValidDocumentOfType(document: string, documentType: DocumentType) {
  return DOCUMENT_TYPES[documentType]?.pattern.test(document.trim()) ?? false;
}

// While the document is typed: digits only, or letters and digits in capitals for a passport.
export function cleanDocumentInput(text: string, documentType: DocumentType) {
  const { maxLength, onlyDigits } = DOCUMENT_TYPES[documentType] ?? DOCUMENT_TYPES[DEFAULT_DOCUMENT_TYPE];
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

// Colombian mobile number: 10 digits that start with 3 (e.g. 3001234567), without +57.
const PHONE_PATTERN = /^3\d{9}$/;
export const PHONE_RULE = "Celular colombiano de 10 dígitos que empiece por 3.";

export function isValidPhone(phone: string) {
  return PHONE_PATTERN.test(phone);
}

// While the number is typed: digits only, without the +57 prefix, at most 10.
export function cleanPhoneInput(text: string) {
  let digits = text.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("57")) digits = digits.slice(2);
  return digits.slice(0, 10);
}

// Checked bags per passenger (the carry-on bag is always included).
export const MAX_CHECKED_BAGS = 2;
