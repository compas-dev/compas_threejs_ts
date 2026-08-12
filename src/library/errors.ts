export type CompasViewerErrorCode =
  | "decode_error"
  | "invalid_message"
  | "unsupported_message"
  | "connection_error"
  | "lifecycle_error"
  | "render_error";

export interface CompasViewerErrorOptions {
  cause?: unknown;
  details?: Readonly<Record<string, unknown>>;
}

/** A stable error reported by the public viewer boundary. */
export class CompasViewerError extends Error {
  readonly code: CompasViewerErrorCode;
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(
    code: CompasViewerErrorCode,
    message: string,
    options: CompasViewerErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "CompasViewerError";
    this.code = code;
    this.details = options.details;
  }
}

export function asCompasViewerError(
  error: unknown,
  code: CompasViewerErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): CompasViewerError {
  if (error instanceof CompasViewerError) return error;
  return new CompasViewerError(code, message, {
    cause: error,
    ...(details === undefined ? {} : { details }),
  });
}
