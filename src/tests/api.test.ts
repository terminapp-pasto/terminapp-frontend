// Unit tests of the API helpers: error messages, dates in Colombian time and money.
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, CONNECTION_ERROR, apiRequest, errorText, formatDuration, formatPrice, getErrorMessage, isoDate } from "../api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("error messages", () => {
  it("uses the server's detail only when it is text", () => {
    expect(getErrorMessage({ detail: "Sin cupo" }, "x")).toBe("Sin cupo");
    expect(getErrorMessage({ detail: [{ msg: "bad" }] }, "x")).toBe("x");
    expect(getErrorMessage(null, "x")).toBe("x");
  });
  it("unknown errors become the connection message", () => {
    expect(errorText(new Error("boom"))).toBe(CONNECTION_ERROR);
    expect(errorText(new ApiError("Sin cupo", 409))).toBe("Sin cupo");
  });
});

describe("apiRequest", () => {
  it("sends the token and the JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await apiRequest("/x", { method: "POST", body: { a: 1 }, token: "abc" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toEqual({ "Content-Type": "application/json", Authorization: "Bearer abc" });
    expect(init.body).toBe('{"a":1}');
  });
  it("turns a server error into ApiError with its status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "No" }), { status: 403 })));
    await expect(apiRequest("/x")).rejects.toMatchObject({ message: "No", status: 403 });
  });
  it("an HTML error page (not JSON) does not crash", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 })));
    await expect(apiRequest("/x")).rejects.toMatchObject({ status: 502 });
  });
  it("no internet gives status 0 and a clear message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiRequest("/x")).rejects.toMatchObject({ message: CONNECTION_ERROR, status: 0 });
  });
});

describe("formats", () => {
  it("dates follow Colombia, not the browser", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-14T03:30:00Z")); // still the 13th in Bogotá (UTC-5)
    expect(isoDate()).toBe("2026-11-13");
    expect(isoDate(1)).toBe("2026-11-14");
  });
  it("prices and durations", () => {
    expect(formatPrice(45000)).toMatch(/^\$45.000$/);
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(120)).toBe("2 h");
  });
});
