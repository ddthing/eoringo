import { isAllowedOrigin, resolveAllowedOrigins } from "../_shared/cors.ts";
import { isSafeJsonTree } from "../_shared/jsonSafety.ts";
import { isUserId } from "../_shared/imageValidation.ts";

const allowedDocumentTypes = new Set([
  "characters",
  "tasks",
  "dday",
  "memo",
  "allowance",
  "history",
]);
const maxRequestBytes = 3 * 1024 * 1024;

const jsonResponse = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(origin
        ? {
            "Access-Control-Allow-Origin": origin,
            Vary: "Origin",
          }
        : {}),
    },
  });

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }

  return value;
};

const digestPayload = async (payload: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalize(payload)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: string[]) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  const allowedOrigins = resolveAllowedOrigins(
    Deno.env.get("ALLOWED_ORIGINS") ?? "",
    Deno.env.get("ALLOW_LOCAL_ORIGINS") === "true",
  );

  if (!isAllowedOrigin(origin, allowedOrigins)) {
    return jsonResponse(403, { code: "origin_rejected" }, null);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin ?? "",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { code: "method_not_allowed" }, origin);
  }

  const authorization = request.headers.get("Authorization") ?? "";

  if (!/^Bearer [A-Za-z0-9._~-]{20,4096}$/.test(authorization)) {
    return jsonResponse(401, { code: "authentication_required" }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(503, { code: "configuration" }, origin);
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });

  if (!userResponse.ok) {
    return jsonResponse(401, { code: "authentication_required" }, origin);
  }

  const user: unknown = await userResponse.json();

  if (!isRecord(user) || !isUserId(user.id) || user.is_anonymous === true) {
    return jsonResponse(403, { code: "permanent_account_required" }, origin);
  }

  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);

  if (declaredLength > maxRequestBytes) {
    return jsonResponse(413, { code: "payload_too_large" }, origin);
  }

  const rawBody = await request.text();

  if (new TextEncoder().encode(rawBody).byteLength > maxRequestBytes) {
    return jsonResponse(413, { code: "payload_too_large" }, origin);
  }

  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { code: "invalid_payload" }, origin);
  }

  if (
    !isRecord(body) ||
    !hasExactKeys(body, ["migrationId", "documents"]) ||
    typeof body.migrationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.migrationId,
    ) ||
    !Array.isArray(body.documents) ||
    body.documents.length !== 6
  ) {
    return jsonResponse(400, { code: "invalid_payload" }, origin);
  }

  const documentTypes = new Set<string>();
  const documentDigests: Record<string, string> = {};

  for (const document of body.documents) {
    if (
      !isRecord(document) ||
      !hasExactKeys(document, ["documentType", "schemaVersion", "payload", "digest"]) ||
      typeof document.documentType !== "string" ||
      !allowedDocumentTypes.has(document.documentType) ||
      document.schemaVersion !== 1 ||
      !isRecord(document.payload) ||
      !isSafeJsonTree(document.payload) ||
      typeof document.digest !== "string" ||
      !/^[0-9a-f]{64}$/.test(document.digest) ||
      documentTypes.has(document.documentType)
    ) {
      return jsonResponse(400, { code: "invalid_payload" }, origin);
    }

    const computedDigest = await digestPayload(document.payload);

    if (computedDigest !== document.digest) {
      return jsonResponse(400, { code: "digest_mismatch" }, origin);
    }

    documentTypes.add(document.documentType);
    documentDigests[document.documentType] = computedDigest;
  }

  const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/apply_local_migration`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_user_id: user.id,
      p_migration_id: body.migrationId,
      p_documents: body.documents,
      p_document_digests: documentDigests,
    }),
  });

  if (!rpcResponse.ok) {
    return jsonResponse(
      rpcResponse.status === 409 ? 409 : 400,
      { code: rpcResponse.status === 409 ? "destination_not_empty" : "migration_rejected" },
      origin,
    );
  }

  const result: unknown = await rpcResponse.json();
  return jsonResponse(200, result, origin);
});
