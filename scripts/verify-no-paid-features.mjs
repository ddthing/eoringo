import { readFileSync } from "node:fs";

const config = readFileSync("supabase/config.toml", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const sourceFiles = [
  "src/lib/supabase/client.ts",
  "src/sync/supabaseDocumentDataSource.ts",
].map((path) => readFileSync(path, "utf8")).join("\n");

const required = [
  {
    name: "Realtime disabled",
    expression: /\[realtime\]\s+enabled\s*=\s*false/m,
  },
  {
    name: "phone MFA enrollment disabled",
    expression: /\[auth\.mfa\.phone\][\s\S]*?enroll_enabled\s*=\s*false/,
  },
  {
    name: "phone MFA verification disabled",
    expression: /\[auth\.mfa\.phone\][\s\S]*?verify_enabled\s*=\s*false/,
  },
  {
    name: "image transformations disabled",
    expression: /\[storage\.image_transformation\][\s\S]*?enabled\s*=\s*false/,
  },
  {
    name: "remote sync defaults off",
    expression: /^VITE_REMOTE_SYNC_ENABLED=false$/m,
    source: envExample,
  },
  {
    name: "image uploads default off",
    expression: /^VITE_IMAGE_UPLOADS_ENABLED=false$/m,
    source: envExample,
  },
];

const failures = required
  .filter(({ expression, source = config }) => !expression.test(source))
  .map(({ name }) => name);

if (/\.channel\s*\(|postgres_changes/.test(sourceFiles)) {
  failures.push("Realtime client usage detected");
}

if (failures.length > 0) {
  process.stderr.write(`Free-tier guard failed:\n${failures.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write("Free-tier guard passed.\n");
