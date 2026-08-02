import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { documentCodecs } from "./codecs";
import type { RemoteDocument } from "./documentRepository";
import {
  digestMigrationPayload,
  LocalMigrationFailure,
  type LocalMigrationRequest,
  type LocalMigrationTransport,
  type MigrationDocument,
} from "./localMigration";

type DocumentReader = {
  list: () => Promise<RemoteDocument[]>;
};

const responseSchema = z
  .object({
    migrationId: z.uuid(),
    documentDigests: z.partialRecord(
      z.enum(["characters", "tasks", "dday", "memo", "allowance", "history"]),
      z.string().regex(/^[0-9a-f]{64}$/),
    ),
  })
  .strict();

export const createSupabaseLocalMigrationTransport = (
  supabase: SupabaseClient,
  reader: DocumentReader,
): LocalMigrationTransport => ({
  async migrate(request: LocalMigrationRequest) {
    const { data, error } = await supabase.functions.invoke("migrate-local-data", {
      body: request,
    });

    if (error) {
      throw new LocalMigrationFailure("verification-failed");
    }

    const parsed = responseSchema.safeParse(data);

    if (!parsed.success) {
      throw new LocalMigrationFailure("verification-failed");
    }

    return parsed.data;
  },

  async readBack(): Promise<MigrationDocument[]> {
    const documents = await reader.list();

    return Promise.all(
      documents.map(async (document) => {
        const codec = documentCodecs[document.documentType];
        const payload = codec.parse(document.payload);

        return {
          documentType: document.documentType,
          schemaVersion: document.schemaVersion,
          payload,
          digest: await digestMigrationPayload(payload),
        };
      }),
    );
  },
});
