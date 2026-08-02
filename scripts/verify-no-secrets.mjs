import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const roots = process.argv.slice(2);

if (roots.length === 0) {
  throw new Error("Provide one or more files or directories to scan.");
}

const ignoredNames = new Set([".git", ".pnpm-store", ".temp", "node_modules"]);
const textExtensions = new Set([
  ".css",
  ".env",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".md",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
]);
const patterns = [
  { name: "private key", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Supabase secret key", expression: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: "Google OAuth client secret", expression: /GOCSPX-[A-Za-z0-9_-]{10,}/ },
  {
    name: "database credential URL",
    expression: /postgres(?:ql)?:\/\/[^\s/:]+:[^\s/@]+@[^\s/]+/i,
  },
  {
    name: "browser privileged variable",
    expression: /VITE_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET_KEY|DB_PASSWORD|DATABASE_URL)\s*=/,
  },
];

const getExtension = (path) => {
  const name = path.split(/[\\/]/).at(-1) ?? "";

  if (name.startsWith(".env")) {
    return ".env";
  }

  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
};

const collectFiles = (path) => {
  const absolute = resolve(path);
  const stat = statSync(absolute);

  if (stat.isFile()) {
    return [absolute];
  }

  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredNames.has(entry.name)) {
      return [];
    }

    return collectFiles(resolve(absolute, entry.name));
  });
};

const failures = [];

roots
  .flatMap(collectFiles)
  .filter((path) => !path.endsWith("verify-no-secrets.mjs"))
  .filter((path) => textExtensions.has(getExtension(path)))
  .forEach((path) => {
    const content = readFileSync(path, "utf8");

    patterns.forEach(({ name, expression }) => {
      if (expression.test(content)) {
        failures.push(`${name}: ${path}`);
      }
    });
  });

if (failures.length > 0) {
  process.stderr.write(`Secret scan failed:\n${failures.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`Secret scan passed for ${roots.join(", ")}.\n`);
