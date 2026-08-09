import { describe, expect, it } from "vitest";
import {
  isAllowedOrigin,
  resolveAllowedOrigins,
} from "../../supabase/functions/_shared/cors";

describe("Edge Function origin policy", () => {
  it("allows only configured origins in production mode", () => {
    const allowed = resolveAllowedOrigins("https://eoringo.pages.dev", false);

    expect(isAllowedOrigin("https://eoringo.pages.dev", allowed)).toBe(true);
    expect(isAllowedOrigin("http://localhost:5173", allowed)).toBe(false);
    expect(isAllowedOrigin("https://attacker.example", allowed)).toBe(false);
  });

  it("requires an explicit local-development switch for localhost", () => {
    const allowed = resolveAllowedOrigins("https://eoringo.pages.dev", true);

    expect(isAllowedOrigin("http://localhost:5173", allowed)).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:5173", allowed)).toBe(true);
  });
});
