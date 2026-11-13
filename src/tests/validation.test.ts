// Unit tests of the form rules. They must agree with the backend (services/validation.py).
import { describe, expect, it } from "vitest";
import {
  cleanDocumentInput,
  cleanPhoneInput,
  documentLabel,
  isValidDocument,
  isValidDocumentOfType,
  isValidEmail,
  isValidName,
  isValidPassword,
  isValidPhone,
  keepDigits,
  normalizeSpaces,
  setDocumentTypes,
  DOCUMENT_TYPE_CODES,
} from "../validation";

describe("names", () => {
  it("accepts Spanish names with accents and ñ", () => {
    expect(isValidName("José Muñoz")).toBe(true);
    expect(isValidName("  Ana   María  ")).toBe(true);
  });
  it("rejects code, digits and limits", () => {
    for (const name of ["<script>alert(1)</script>", "Ana2", "ab", "A".repeat(51), "", "   ", "'; DROP TABLE users;--"]) {
      expect(isValidName(name)).toBe(false);
    }
  });
  it("collapses spaces", () => {
    expect(normalizeSpaces("  a   b \n c ")).toBe("a b c");
  });
});

describe("documents", () => {
  it("cédula: only digits, 5 to 10", () => {
    expect(isValidDocumentOfType("1085123456", "CC")).toBe(true);
    expect(isValidDocumentOfType("1234", "CC")).toBe(false);
    expect(isValidDocumentOfType("12345678901", "CC")).toBe(false);
    expect(isValidDocumentOfType("12a45", "CC")).toBe(false);
  });
  it("passport allows letters and is cleaned to capitals", () => {
    expect(cleanDocumentInput("ab-12 3c", "PA")).toBe("AB123C");
    expect(isValidDocumentOfType("AB123C", "PA")).toBe(true);
  });
  it("digit-only types drop letters and cut the length", () => {
    expect(cleanDocumentInput("1a2b3c45678901234", "CC")).toBe("1234567890");
  });
  it("an unknown type is never valid and does not crash", () => {
    expect(isValidDocumentOfType("12345", "ZZ")).toBe(false);
    expect(cleanDocumentInput("123", "ZZ")).toBe("123");
    expect(documentLabel("ZZ")).toBe("ZZ");
  });
  it("legacy document rule and keepDigits", () => {
    expect(isValidDocument("12345")).toBe(true);
    expect(isValidDocument("1234")).toBe(false);
    expect(keepDigits("1.085.123.456.789")).toBe("108512345678");
  });
  it("the list from the backend replaces the defaults", () => {
    setDocumentTypes([
      { code: "CC", name: "Cédula de ciudadanía", min_length: 6, max_length: 10, allows_letters: false, rule: "" },
      { code: "RC", name: "Registro civil", min_length: 10, max_length: 11, allows_letters: false, rule: "" },
    ]);
    expect(DOCUMENT_TYPE_CODES).toEqual(["CC", "RC"]);
    expect(isValidDocumentOfType("12345", "CC")).toBe(false);
    expect(documentLabel("RC")).toBe("Registro civil");
    expect(documentLabel("PA")).toBe("Pasaporte"); // old tickets still show their type
    setDocumentTypes([]); // an empty answer keeps the current list
    expect(DOCUMENT_TYPE_CODES).toEqual(["CC", "RC"]);
  });
});

describe("email and password", () => {
  it("emails", () => {
    expect(isValidEmail("ana@correo.com")).toBe(true);
    for (const email of ["ana", "ana@", "a b@c.co", "@c.co", `${"a".repeat(95)}@c.com`]) {
      expect(isValidEmail(email)).toBe(false);
    }
  });
  it("passwords between 8 and 72 characters", () => {
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("1234567")).toBe(false);
    expect(isValidPassword("x".repeat(73))).toBe(false);
  });
});

describe("phones", () => {
  it("Colombian mobiles only", () => {
    expect(isValidPhone("3001234567")).toBe(true);
    for (const phone of ["2001234567", "300123456", "30012345678", "+573001234567"]) {
      expect(isValidPhone(phone)).toBe(false);
    }
  });
  it("cleans what people paste", () => {
    expect(cleanPhoneInput("+57 300 123 4567")).toBe("3001234567");
    expect(cleanPhoneInput("(300) 123-4567 ext 9")).toBe("3001234567");
  });
});
