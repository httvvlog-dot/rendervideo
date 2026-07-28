export type ErrorCategory =
  | "SYSTEM"
  | "PROVIDER"
  | "AUTH"
  | "VALIDATION"
  | "BILLING"
  | "RATE_LIMIT";

export type ErrorSeverity =
  | "INFO"
  | "WARNING"
  | "ERROR"
  | "CRITICAL";

export interface AppErrorParams {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
  correlationId?: string;
  originalError?: unknown;
}

export class AppError extends Error {
  public code: string;
  public category: ErrorCategory;
  public severity: ErrorSeverity;
  public retryable: boolean;
  public details?: Record<string, unknown>;
  public correlationId?: string;
  public originalError?: unknown;

  constructor(params: AppErrorParams) {
    super(params.message);
    this.name = "AppError";
    this.code = params.code;
    this.category = params.category;
    this.severity = params.severity;
    this.retryable = params.retryable;
    this.details = params.details;
    this.correlationId = params.correlationId;
    this.originalError = params.originalError;
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      severity: this.severity,
      message: this.message,
      retryable: this.retryable,
      details: this.details,
      correlationId: this.correlationId,
    };
  }
}
