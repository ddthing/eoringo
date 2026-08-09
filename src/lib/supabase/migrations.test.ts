import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readMigration = (name: string) =>
  readFileSync(resolve(process.cwd(), "supabase", "migrations", name), "utf8");

describe("Supabase security migrations", () => {
  it("enables and forces RLS before granting authenticated access", () => {
    const schema = readMigration("20260801000100_auth_sync_schema.sql");

    ["profiles", "characters", "user_documents"].forEach((table) => {
      expect(schema).toContain(`alter table public.${table} enable row level security;`);
      expect(schema).toContain(`alter table public.${table} force row level security;`);
    });
    expect(schema).not.toMatch(/grant\s+all\s+on/i);
    expect(schema).toContain("revoke all on table private.secure_operations from anon, authenticated;");
  });

  it("uses owner checks for every exposed data operation", () => {
    const rls = readMigration("20260801000200_auth_sync_rls.sql");

    expect(rls.match(/\(select auth\.uid\(\)\) = user_id/g)?.length).toBeGreaterThanOrEqual(9);
    expect(rls).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(rls).not.toMatch(/with check\s*\(\s*true\s*\)/i);
  });

  it("keeps image uploads private and denies direct client writes", () => {
    const storage = readMigration("20260801000300_character_image_storage.sql");

    expect(storage).toContain("false,\n  524288");
    expect(storage).toContain("(storage.foldername(name))[1] = (select auth.uid()::text)");
    expect(storage).not.toMatch(/for\s+(insert|update)/i);
  });

  it("bounds remote payloads and image references at the database boundary", () => {
    const hardening = readMigration("20260809191048_security_and_image_sync_hardening.sql");

    expect(hardening).toContain("user_documents_payload_safety_check");
    expect(hardening).toContain("item.key in ('__proto__', 'constructor', 'prototype')");
    expect(hardening).toContain("characters_profile_image_path_safe_check");
    expect(hardening).toContain("grant execute on function private.is_safe_json_tree(jsonb, integer)");
    expect(hardening).toContain("revoke all on function public.rls_auto_enable()");
    expect(hardening).not.toMatch(/grant execute[^;]+\b(?:public|anon)\b/i);
  });
});
