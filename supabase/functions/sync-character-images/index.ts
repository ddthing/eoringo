import { resolveAllowedOrigins, isAllowedOrigin } from "../_shared/cors.ts";
import {
  buildCharacterImagePath,
  characterImageBucket,
  decodeBase64,
  inspectCharacterImage,
  isSafeCharacterImageId,
  isUserId,
  maxCharacterImageBytes,
  maxCharacterImagesPerUser,
} from "../_shared/imageValidation.ts";

const maxRequestBytes = 720 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: string[]) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();

  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

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

const getConfig = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return null;
  }

  return { supabaseUrl, anonKey, serviceRoleKey };
};

const getUser = async (supabaseUrl: string, anonKey: string, authorization: string) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });

  if (!response.ok) {
    return null;
  }

  const user: unknown = await response.json();

  if (!isRecord(user) || !isUserId(user.id) || user.is_anonymous === true) {
    return null;
  }

  return { id: user.id };
};

type ListedObject = {
  name: string;
  size: number;
};

type QuotaRpcResult = {
  ok: boolean;
  code?: string;
  reservationId?: string;
};

const reservationIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isQuotaRpcResult = (value: unknown): value is QuotaRpcResult =>
  isRecord(value) && typeof value.ok === "boolean";

const listUserObjects = async (supabaseUrl: string, serviceRoleKey: string, userId: string) => {
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/list/${encodeURIComponent(characterImageBucket)}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prefix: `${userId}/`,
        limit: maxCharacterImagesPerUser + 1,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const values: unknown = await response.json();

  if (!Array.isArray(values)) {
    return null;
  }

  const objects: ListedObject[] = [];

  for (const value of values) {
    if (!isRecord(value) || typeof value.name !== "string") {
      return null;
    }

    const rawName = value.name.startsWith(`${userId}/`)
      ? value.name.slice(userId.length + 1)
      : value.name;
    const metadata = isRecord(value.metadata) ? value.metadata : null;
    const rawSize = metadata?.size;
    const size =
      typeof rawSize === "number"
        ? rawSize
        : typeof rawSize === "string" && /^\d+$/.test(rawSize)
          ? Number(rawSize)
          : NaN;

    if (!isSafeCharacterImageId(rawName) || !Number.isSafeInteger(size) || size <= 0) {
      return null;
    }

    objects.push({ name: rawName, size });
  }

  return objects;
};

const invokeQuotaRpc = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  functionName:
    | "reserve_character_image_upload"
    | "finalize_character_image_upload"
    | "release_character_image_upload",
  body: Record<string, unknown>,
) => {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return null;
    }

    const value: unknown = await response.json();

    return isQuotaRpcResult(value) ? value : null;
  } catch {
    return null;
  }
};

const digestBytes = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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

  const config = getConfig();

  if (!config) {
    return jsonResponse(503, { code: "configuration" }, origin);
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
    !hasExactKeys(body, ["operation", "imageId", "contentType", "data"]) ||
    body.operation !== "upload" ||
    !isSafeCharacterImageId(body.imageId) ||
    typeof body.contentType !== "string" ||
    typeof body.data !== "string"
  ) {
    return jsonResponse(400, { code: "invalid_payload" }, origin);
  }

  const user = await getUser(config.supabaseUrl, config.anonKey, authorization);

  if (!user) {
    return jsonResponse(403, { code: "permanent_account_required" }, origin);
  }

  const bytes = decodeBase64(body.data);
  const inspection = bytes ? inspectCharacterImage(bytes, body.contentType) : null;

  if (!bytes || !inspection || bytes.length > maxCharacterImageBytes) {
    return jsonResponse(400, { code: "invalid_image" }, origin);
  }

  const existingObjects = await listUserObjects(config.supabaseUrl, config.serviceRoleKey, user.id);

  if (!existingObjects) {
    return jsonResponse(503, { code: "storage_unavailable" }, origin);
  }

  const quota = await invokeQuotaRpc(
    config.supabaseUrl,
    config.serviceRoleKey,
    "reserve_character_image_upload",
    {
      p_user_id: user.id,
      p_image_id: body.imageId,
      p_byte_size: bytes.length,
      p_existing_objects: existingObjects.map((object) => ({
        imageId: object.name,
        bytes: object.size,
      })),
    },
  );

  if (!quota) {
    return jsonResponse(503, { code: "quota_unavailable" }, origin);
  }

  if (!quota.ok) {
    if (quota.code === "image_quota") {
      return jsonResponse(413, { code: "image_quota" }, origin);
    }

    if (quota.code === "image_upload_in_progress") {
      return jsonResponse(409, { code: "image_upload_in_progress" }, origin);
    }

    return jsonResponse(400, { code: "invalid_payload" }, origin);
  }

  if (!quota.reservationId || !reservationIdPattern.test(quota.reservationId)) {
    return jsonResponse(503, { code: "quota_unavailable" }, origin);
  }

  const reservationId = quota.reservationId;
  const releaseReservation = () =>
    invokeQuotaRpc(
      config.supabaseUrl,
      config.serviceRoleKey,
      "release_character_image_upload",
      { p_reservation_id: reservationId },
    );

  const path = buildCharacterImagePath(user.id, body.imageId);
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  try {
    const uploadResponse = await fetch(
      `${config.supabaseUrl}/storage/v1/object/${encodeURIComponent(characterImageBucket)}/${encodedPath}`,
      {
        method: "POST",
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
          "Content-Type": inspection.contentType,
          "Cache-Control": "31536000",
          "x-upsert": "true",
        },
        body: bytes,
      },
    );

    if (!uploadResponse.ok) {
      await releaseReservation();
      return jsonResponse(502, { code: "storage_unavailable" }, origin);
    }

    const finalized = await invokeQuotaRpc(
      config.supabaseUrl,
      config.serviceRoleKey,
      "finalize_character_image_upload",
      { p_reservation_id: reservationId },
    );

    if (!finalized?.ok) {
      // Keep the reservation when finalization fails. The uploaded object is
      // already present, so releasing here could allow the hard quota to be
      // exceeded on a retry.
      return jsonResponse(503, { code: "quota_unavailable" }, origin);
    }
  } catch {
    await releaseReservation();
    return jsonResponse(502, { code: "storage_unavailable" }, origin);
  }

  return jsonResponse(
    200,
    {
      imageId: body.imageId,
      path,
      contentType: inspection.contentType,
      bytes: inspection.bytes,
      width: inspection.width,
      height: inspection.height,
      digest: await digestBytes(bytes),
    },
    origin,
  );
});
