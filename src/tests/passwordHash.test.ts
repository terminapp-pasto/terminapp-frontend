// The browser must send exactly the value the backend expects (tests/test_authentication.py).
import { describe, expect, it } from "vitest";
import { hashPasswordForSending } from "../passwordHash";

const PROFESSOR_HASH = "a510c5913ca39ffca313185cfdd70b28eab6333ecba817195e35e2cccef2bd76";

describe("hashPasswordForSending", () => {
  it("gives the same value as the backend, whatever the email's case and spaces", async () => {
    expect(await hashPasswordForSending("profe@prueba.co", "Clave2026")).toBe(PROFESSOR_HASH);
    expect(await hashPasswordForSending(" Profe@Prueba.co ", "Clave2026")).toBe(PROFESSOR_HASH);
  });

  it("never contains the password and changes with the email", async () => {
    const sent = await hashPasswordForSending("ana@correo.co", "Clave2026");
    expect(sent).toMatch(/^[0-9a-f]{64}$/);
    expect(sent).not.toContain("Clave2026");
    expect(sent).not.toBe(await hashPasswordForSending("luis@correo.co", "Clave2026"));
  });
});
