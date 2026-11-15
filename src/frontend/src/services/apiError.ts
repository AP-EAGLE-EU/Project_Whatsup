export type ApiErrorKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'not_available'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'unavailable'
  | 'network'
  | 'unexpected';

const DEFAULT_MESSAGES: Record<ApiErrorKind, string> = {
  unauthenticated: 'Please sign in to continue.',
  forbidden: 'You do not have access to this resource.',
  not_found: 'This item could not be found.',
  not_available: 'This feature is not available on the back-office yet.',
  validation: 'Some fields are invalid. Please check them and try again.',
  conflict: 'This action conflicts with existing data.',
  rate_limited: 'Too many attempts. Please wait a moment and try again.',
  unavailable: 'The service is temporarily unavailable. Please try again.',
  network: 'The server could not be reached. Check your connection.',
  unexpected: 'Something went wrong. Please try again.',
};

/** A user-safe error: its message is always fit to display, never a raw server trace. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message?: string) {
    super(message ?? DEFAULT_MESSAGES[kind]);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return DEFAULT_MESSAGES.unexpected;
}

export function isApiError(error: unknown, kind: ApiErrorKind): boolean {
  return error instanceof ApiError && error.kind === kind;
}
