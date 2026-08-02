import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  DocumentDataSource,
  DocumentIdentity,
  DocumentUpdate,
  DocumentWrite,
  RawDocumentRow,
} from "./documentRepository";

const selectedColumns =
  "id,user_id,character_id,document_type,payload,schema_version,revision,updated_at,deleted_at";

type ProviderError = { code?: string; status?: number };

export class RemoteDataFailure extends Error {
  readonly code: "authentication" | "authorization" | "conflict" | "network" | "unknown";

  constructor(code: RemoteDataFailure["code"]) {
    super(code);
    this.name = "RemoteDataFailure";
    this.code = code;
  }
}

const normalizeProviderError = (error: ProviderError | null) => {
  if (!error) {
    return;
  }

  if (error.status === 401 || error.code === "PGRST301") {
    throw new RemoteDataFailure("authentication");
  }

  if (error.status === 403 || error.code === "42501") {
    throw new RemoteDataFailure("authorization");
  }

  if (error.code === "23505") {
    throw new RemoteDataFailure("conflict");
  }

  throw new RemoteDataFailure("unknown");
};

const applyIdentityFilter = <T extends {
  eq: (column: string, value: string) => T;
  is: (column: string, value: null) => T;
}>(query: T, identity: DocumentIdentity) => {
  const byType = query.eq("document_type", identity.documentType);

  return identity.characterId
    ? byType.eq("character_id", identity.characterId)
    : byType.is("character_id", null);
};

export const createSupabaseDocumentDataSource = (
  supabase: SupabaseClient,
): DocumentDataSource => ({
  async getVerifiedUserId() {
    const { data, error } = await supabase.auth.getUser();
    normalizeProviderError(error);

    return z.uuid().parse(data.user?.id);
  },

  async list(userId) {
    const { data, error } = await supabase
      .from("user_documents")
      .select(selectedColumns)
      .eq("user_id", userId)
      .is("deleted_at", null);
    normalizeProviderError(error);

    return (data ?? []) as unknown as RawDocumentRow[];
  },

  async find(userId, identity) {
    const query = supabase
      .from("user_documents")
      .select(selectedColumns)
      .eq("user_id", userId)
      .is("deleted_at", null);
    const { data, error } = await applyIdentityFilter(query, identity).maybeSingle();
    normalizeProviderError(error);

    return data as unknown as RawDocumentRow | null;
  },

  async insert(userId, write: DocumentWrite) {
    const { data, error } = await supabase
      .from("user_documents")
      .insert({
        user_id: userId,
        character_id: write.characterId,
        document_type: write.documentType,
        payload: write.payload,
        schema_version: write.schemaVersion,
      })
      .select(selectedColumns)
      .single();
    normalizeProviderError(error);

    return data as unknown as RawDocumentRow;
  },

  async update(userId, update: DocumentUpdate) {
    const { data, error } = await supabase
      .from("user_documents")
      .update({
        payload: update.payload,
        schema_version: update.schemaVersion,
      })
      .eq("id", update.id)
      .eq("user_id", userId)
      .eq("revision", update.expectedRevision)
      .is("deleted_at", null)
      .select(selectedColumns)
      .maybeSingle();
    normalizeProviderError(error);

    return data as unknown as RawDocumentRow | null;
  },
});
