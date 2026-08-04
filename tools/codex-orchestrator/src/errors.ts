export class OrchestratorError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "OrchestratorError";
    this.code = code;
    this.details = details;
  }
}

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
