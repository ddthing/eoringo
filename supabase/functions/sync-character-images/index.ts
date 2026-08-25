import { fetchWithTimeout, withTimeout } from "../_shared/asyncControl.ts";
import { resolveAllowedOrigins, isAllowedOrigin } from "../_shared/cors.ts";
import {
  buildCharacterImagePath,
  characterImageBucket,
  decodeBase64,
  inspectCharacterImage,
  isSafeCharacterImageId,
  isUserId,
  maxCharacterImageBytes,
  maxCharacterImageStorageBytes,
  maxCharacterImagesPerUser,
} from "../_shared/imageValidation.ts";

const maxRequestBytes = 720 * 1024;
const externalRequestTimeoutMs = 8_000;

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
  let response: Response;

  try {
    response = await fetchWithTimeout(
      `${supabaseUrl}/auth/v1/user`,
      { headers: { apikey: anonKey, Authorization: authorization } },
      externalRequestTimeoutMs,
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let user: unknown;

  try {
    user = await withTimeout(
      () => response.json(),
      externalRequestTimeoutMs,
      "auth_user_body_read",
    );
  } catch {
    return null;
  }

  if (!isRecord(user) || !isUserId(user.id) || user.is_anonymous === true) {
    return null;
  }

  return { id: user.id };
};

type ListedObject = {
  name: string;
  size: number;
};

const listUserObjects = async (supabaseUrl: string, serviceRoleKey: string, userId: string) => {
  let response: Response;

  try {
    response = await fetchWithTimeout(
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
      externalRequestTimeoutMs,
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let values: unknown;

  try {
    values = await withTimeout(
      () => response.json(),
      externalRequestTimeoutMs,
      "storage_list_body_read",
    );
  } catch {
    return null;
  }

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

  let rawBody: string;

  try {
    rawBody = await withTimeout(
      () => request.text(),
      externalRequestTimeoutMs,
      "image_request_body_read",
    );
  } catch {
    return jsonResponse(408, { code: "request_timeout" }, origin);
  }

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

  const currentObject = existingObjects.find((object) => object.name === body.imageId);
  const totalBytes = existingObjects.reduce(
    (total, object) => total + (object.name === body.imageId ? 0 : object.size),
    0,
  );

  if (!currentObject && existingObjects.length >= maxCharacterImagesPerUser) {
    return jsonResponse(413, { code: "image_quota" }, origin);
  }

  if (totalBytes + bytes.length > maxCharacterImageStorageBytes) {
    return jsonResponse(413, { code: "image_quota" }, origin);
  }

  const path = buildCharacterImagePath(user.id, body.imageId);
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  let uploadResponse: Response;

  try {
    uploadResponse = await fetchWithTimeout(
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
      externalRequestTimeoutMs,
    );
  } catch {
    return jsonResponse(502, { code: "storage_unavailable" }, origin);
  }

  if (!uploadResponse.ok) {
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
