import { execFileSync } from "node:child_process";
import { createHash, createHmac, randomUUID } from "node:crypto";
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

if (!apiUrl || !anonKey || !serviceRoleKey || !jwtSecret) {
  throw new Error("Local Supabase is not running.");
}

const canonicalize = (value) => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }

  return value;
};

const digest = (payload) =>
  createHash("sha256").update(JSON.stringify(canonicalize(payload))).digest("hex");

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

const rawDocuments = [
  {
    documentType: "characters",
    payload: {
      characters: [{ id: "character-e2e", name: "E2E", server: "Chocobo", isMain: true }],
      activeCharacterId: "character-e2e",
    },
  },
  {
    documentType: "tasks",
    payload: {
      completedByCharacter: {},
      completedAtByCharacter: {},
      customTaskTemplatesByCharacter: {},
      disabledDefaultTaskIdsByCharacter: {},
      dailyResetKey: "",
      weeklyResetKey: "",
      resetKeysByRule: {},
    },
  },
  { documentType: "dday", payload: { eventsByCharacter: {} } },
  { documentType: "memo", payload: { memosByCharacter: {} } },
  { documentType: "allowance", payload: { value: 0, lastAccrualKey: "" } },
  { documentType: "history", payload: { entriesByDate: {} } },
];
const documents = rawDocuments.map((document) => ({
  ...document,
  schemaVersion: 1,
  digest: digest(document.payload),
}));
const migrationId = randomUUID();
const email = `migration-${randomUUID()}@example.test`;
let userId;

const providerRequest = async (path, options = {}) => {
  const response = await fetch(`${apiUrl}${path}`, options);

  if (!response.ok) {
    let code = "unknown";
    let detail = "unknown";

    try {
      const failure = await response.json();
      code = String(failure.code ?? failure.error_code ?? "unknown").replace(/[^a-z0-9_-]/gi, "");
      detail = String(failure.msg ?? failure.message ?? failure.error_description ?? "unknown")
        .replace(/[\w.+-]+@[\w.-]+/g, "[redacted-email]")
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .slice(0, 160);
    } catch {
      code = "unknown";
    }

    throw new Error(
      `Local provider request failed with status ${response.status} (${code}: ${detail}).`,
    );
  }

  return response.json();
};

try {
  const created = await providerRequest("/auth/v1/admin/users", {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, email_confirm: true }),
  });
  userId = created.id;
  const accessToken = signLocalUserToken(userId);

  const invoke = () =>
    providerRequest("/functions/v1/migrate-local-data", {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Origin: "http://127.0.0.1:5173",
      },
      body: JSON.stringify({ migrationId, documents }),
    });

  const first = await invoke();
  const replay = await invoke();

  if (first.migrationId !== migrationId || replay.migrationId !== migrationId) {
    throw new Error("Local migration receipt mismatch.");
  }

  const rows = await providerRequest(
    `/rest/v1/user_documents?select=document_type&user_id=eq.${userId}`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!Array.isArray(rows) || rows.length !== 6) {
    throw new Error("Local migration read-back count mismatch.");
  }

  process.stdout.write("LOCAL_MIGRATION_E2E=PASS documents=6 replay=ok\n");
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
