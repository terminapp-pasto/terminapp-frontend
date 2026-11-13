// Unit tests of the stored session and of who may open the panel.
import { beforeEach, describe, expect, it } from "vitest";
import { clearSession, isStaff, loadSession, saveSession } from "../session";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true });
});

describe("session", () => {
  it("saves, loads and clears", () => {
    saveSession({ token: "t", user: { id: 1, name: "Ana", email: "a@b.co" } });
    expect(loadSession()?.user.name).toBe("Ana");
    clearSession();
    expect(loadSession()).toBeNull();
  });
  it("damaged data is ignored", () => {
    localStorage.setItem("terminapp_session", "{not json");
    expect(loadSession()).toBeNull();
    localStorage.setItem("terminapp_session", JSON.stringify({ token: "t", usuario: { nombre: "Ana" } }));
    expect(loadSession()).toBeNull();
  });
  it("never stores the password", () => {
    saveSession({ token: "t", user: { id: 1, name: "Ana", email: "a@b.co" } });
    expect(localStorage.getItem("terminapp_session")).not.toMatch(/password/i);
  });
});

describe("who sees the panel", () => {
  it("admin and company employees only", () => {
    expect(isStaff({ id: 1, name: "A", email: "a", role: "admin" })).toBe(true);
    expect(isStaff({ id: 1, name: "A", email: "a", role: "company", company_id: 2 })).toBe(true);
    expect(isStaff({ id: 1, name: "A", email: "a", role: "company", company_id: null })).toBe(false);
    expect(isStaff({ id: 1, name: "A", email: "a", role: "user" })).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });
});
