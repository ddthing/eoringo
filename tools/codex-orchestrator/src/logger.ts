import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const redact = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.replace(/\b(sk|sbp)_[A-Za-z0-9_-]+/g, "[REDACTED_TOKEN]").replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]");
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, /token|password|secret|api.?key/i.test(key) ? "[REDACTED]" : redact(item)]));
  }
  return value;
};

export class StructuredLogger {
  readonly path: string;

  constructor(cwd: string, runId: string) {
    this.path = join(cwd, ".codex-orchestrator", "runs", `${runId}.jsonl`);
  }

  async log(event: string, data: unknown = {}): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const entry = { timestamp: new Date().toISOString(), event, data: redact(data) };
    await appendFile(this.path, `${JSON.stringify(entry)}\n`, "utf8");
  }
}
