import { ApiError } from './apiError';
import { isRecord } from '../utils/guards';

const TIMEOUT_MS = 10_000;
// Double-submit CSRF pattern (contract v0.1): the backend sets a readable csrf_token
// cookie at login; the front echoes it in a header on every state-changing request.
const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'X-CSRF-Token';
const UNEXPECTED_RESPONSE = 'The server returned an unexpected response.';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  json?: unknown;
  form?: FormData;
}

function readCookie(name: string): string | null {
  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

async function readDetail(response: Response): Promise<string | null> {
  try {
    const data: unknown = await response.json();
    if (isRecord(data) && typeof data.detail === 'string') {
      return data.detail;
    }
  } catch {
    // Non-JSON error bodies (e.g. an nginx error page) are never shown to the user.
  }
  return null;
}

function errorForStatus(status: number, detail: string | null): ApiError {
  // FastAPI answers an unknown route with exactly "Not Found"; resource 404s carry their
  // own detail (contract rule), so this means "endpoint not built yet".
  if ((status === 404 && detail === 'Not Found') || status === 405) {
    return new ApiError('not_available');
  }

  const safeDetail = detail ?? undefined;
  switch (status) {
    case 400:
    case 422:
      return new ApiError('validation', safeDetail);
    case 401:
      return new ApiError('unauthenticated', safeDetail);
    case 403:
      return new ApiError('forbidden');
    case 404:
      return new ApiError('not_found');
    case 409:
      return new ApiError('conflict', safeDetail);
    case 413:
      return new ApiError('validation', 'The file is too large.');
    case 415:
      return new ApiError('validation', 'This file type is not allowed.');
    case 429:
      return new ApiError('rate_limited');
    case 502:
    case 503:
    case 504:
      return new ApiError('unavailable');
    default:
      return new ApiError('unexpected');
  }
}

export async function request(
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const headers = new Headers({ Accept: 'application/json' });
  let body: BodyInit | undefined;

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  } else if (options.form !== undefined) {
    body = options.form; // The browser sets the multipart boundary itself.
  }

  if (method !== 'GET') {
    const csrfToken = readCookie(CSRF_COOKIE);
    if (csrfToken !== null) {
      headers.set(CSRF_HEADER, csrfToken);
    }
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError('network');
  }

  if (!response.ok) {
    throw errorForStatus(response.status, await readDetail(response));
  }
  if (response.status === 204) {
    return null;
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new ApiError('unexpected', UNEXPECTED_RESPONSE);
  }
}

/** Runs a shape parser and turns any shape mismatch into a user-safe error. */
export function parseOrThrow<T>(data: unknown, parse: (value: unknown) => T): T {
  try {
    return parse(data);
  } catch {
    throw new ApiError('unexpected', UNEXPECTED_RESPONSE);
  }
}
