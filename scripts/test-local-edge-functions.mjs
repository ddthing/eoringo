import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";

const supabaseCli = "node_modules/supabase/dist/supabase.js";
const statusOutput = execFileSync(process.execPath, [supabaseCli, "status", "-o", "env"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});
const environment = Object.fromEntries(
  statusOutput
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);

const apiUrl = environment.API_URL;
const anonKey = environment.ANON_KEY;
const serviceRoleKey = environment.SERVICE_ROLE_KEY;
const jwtSecret = environment.JWT_SECRET;
const localOrigin = "http://127.0.0.1:5173";

if (!apiUrl || !anonKey || !serviceRoleKey || !jwtSecret) {
  throw new Error("Local Supabase is not running.");
}

const parseJson = async (response) => {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { raw: raw.slice(0, 160) };
  }
};

const requestJson = async (path, options = {}, expectedStatus = 200) => {
  const response = await fetch(`${apiUrl}${path}`, options);
  const body = await parseJson(response);

  if (response.status !== expectedStatus) {
    throw new Error(
      `Local Edge request ${path} returned ${response.status}; expected ${expectedStatus}.`,
    );
  }

  return body;
};

const signLocalUserToken = (userId) => {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      aud: "authenticated",
      exp: now + 300,
      iat: now,
      iss: "supabase-demo",
      role: "authenticated",
      sub: userId,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
};

const authHeaders = (accessToken) => ({
  apikey: anonKey,
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
  Origin: localOrigin,
});

const invokeFunction = (name, accessToken, body, expectedStatus = 200) =>
  requestJson(
    `/functions/v1/${name}`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(body),
    },
    expectedStatus,
  );

let userId;

try {
  const created = await requestJson("/auth/v1/admin/users", {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: `edge-${randomUUID()}@example.test`,
      email_confirm: true,
    }),
  });
  userId = created.id;
  const accessToken = signLocalUserToken(userId);
  const endpoint = `https://fcm.googleapis.com/send/local-e2e-${randomUUID()}`;
  const subscription = {
    endpoint,
    expirationTime: null,
    keys: {
      p256dh: "BabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-",
      auth: "auth-value-local-e2e",
    },
  };
  const summary = {
    summaryDate: "2026-08-25",
    characters: [],
    sourceDigest: "a".repeat(64),
  };

  const optionsRequest = await fetch(`${apiUrl}/functions/v1/manage-push-subscription`, {
    method: "OPTIONS",
    headers: { Origin: localOrigin },
  });
  if (optionsRequest.status !== 204) {
    throw new Error(`Local Edge CORS preflight returned ${optionsRequest.status}.`);
  }

  const upserted = await invokeFunction(
    "manage-push-subscription",
    accessToken,
    {
      operation: "upsert",
      subscription,
      timezone: "Asia/Seoul",
      notificationTime: "21:00",
      summary,
    },
  );
  if (upserted?.ok !== true) {
    throw new Error("Local push upsert response mismatch.");
  }

  const status = await invokeFunction("manage-push-subscription", accessToken, {
    operation: "status",
    endpoint,
  });
  if (status?.registered !== true || status.enabled !== true) {
    throw new Error("Local push status response mismatch.");
  }

  const deleted = await invokeFunction("manage-push-subscription", accessToken, {
    operation: "delete",
    endpoint,
  });
  if (deleted?.ok !== true || deleted.deleted !== true) {
    throw new Error("Local push delete response mismatch.");
  }

  const afterDelete = await invokeFunction("manage-push-subscription", accessToken, {
    operation: "status",
    endpoint,
  });
  if (afterDelete?.registered !== false) {
    throw new Error("Local push status did not clear the deleted subscription.");
  }

  await invokeFunction("manage-push-subscription", accessToken, { operation: "unknown" }, 400);
  await invokeFunction(
    "sync-character-images",
    accessToken,
    { operation: "upload", imageId: "image-1", contentType: "image/png", data: "AAAA" },
    400,
  );
  await requestJson(
    "/functions/v1/send-daily-task-notifications",
    { method: "GET" },
    405,
  );
  await requestJson(
    "/functions/v1/send-daily-task-notifications",
    { method: "POST", headers: { "X-Cron-Secret": "test-only" } },
    503,
  );

  process.stdout.write(
    "LOCAL_EDGE_E2E=PASS cors=ok push=upsert-status-delete image-validation=ok scheduler-config=ok\n",
  );
} finally {
  if (userId) {
    await fetch(`${apiUrl}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
  }
}
