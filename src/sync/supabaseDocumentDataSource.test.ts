import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseDocumentDataSource } from "./supabaseDocumentDataSource";

const userId = "00000000-0000-4000-8000-000000000001";

const makeQuery = (result: unknown) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    in: vi.fn(() => query),
    then: (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return query;
};

describe("Supabase document data source", () => {
  it("lists document metadata without transferring the payload column", async () => {
    const query = makeQuery({
      data: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          user_id: userId,
          character_id: null,
          document_type: "memo",
          schema_version: 1,
          revision: 4,
          updated_at: "2026-08-02T08:00:00.000Z",
          deleted_at: null,
        },
      ],
      error: null,
    });
    const supabase = {
      from: vi.fn(() => query),
    } as unknown as SupabaseClient;
    const source = createSupabaseDocumentDataSource(supabase);

    await expect(source.listMetadata(userId)).resolves.toHaveLength(1);

    expect(query.select).toHaveBeenCalledWith(
      "id,user_id,character_id,document_type,schema_version,revision,updated_at,deleted_at",
    );
  });

  it("fetches changed document payloads in one id-filtered query", async () => {
    const query = makeQuery({ data: [], error: null });
    const supabase = {
      from: vi.fn(() => query),
    } as unknown as SupabaseClient;
    const source = createSupabaseDocumentDataSource(supabase);

    await expect(source.findMany(userId, ["document-1", "document-2"])).resolves.toEqual([]);

    expect(query.select).toHaveBeenCalledWith(
      "id,user_id,character_id,document_type,payload,schema_version,revision,updated_at,deleted_at",
    );
    expect(query.in).toHaveBeenCalledWith("id", ["document-1", "document-2"]);
  });
});
