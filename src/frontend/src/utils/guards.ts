// Small runtime checks: every API response is untrusted until its shape is verified.

export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readString(record: JsonRecord, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new TypeError(`Expected "${key}" to be a string.`);
  }
  return value;
}

export function readNumber(record: JsonRecord, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Expected "${key}" to be a number.`);
  }
  return value;
}

export function readBoolean(record: JsonRecord, key: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') {
    throw new TypeError(`Expected "${key}" to be a boolean.`);
  }
  return value;
}

export function readNullableString(record: JsonRecord, key: string): string | null {
  const value = record[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new TypeError(`Expected "${key}" to be a string or null.`);
  }
  return value;
}

export function readRecord(record: JsonRecord, key: string): JsonRecord {
  const value = record[key];
  if (!isRecord(value)) {
    throw new TypeError(`Expected "${key}" to be an object.`);
  }
  return value;
}

export function readArray(record: JsonRecord, key: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new TypeError(`Expected "${key}" to be an array.`);
  }
  return value;
}

/** Only same-origin relative paths are allowed as links or image sources from the API. */
function isRelativePath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//');
}

export function isSafeRelativeUrl(value: string | null): value is string {
  return value !== null && isRelativePath(value);
}

const SAFE_IMAGE_DATA_PREFIXES = ['data:image/png;base64,', 'data:image/jpeg;base64,'];

/** Image sources: same-origin paths (live) or PNG/JPEG data URLs (mock mode only). */
export function isSafeImageSrc(value: string | null): value is string {
  if (value === null) {
    return false;
  }
  return isRelativePath(value) || SAFE_IMAGE_DATA_PREFIXES.some((prefix) => value.startsWith(prefix));
}

/** Download links: same-origin paths (live) or base64 data URLs created by the mock. */
export function isSafeDownloadHref(value: string): boolean {
  return isRelativePath(value) || /^data:[a-z]+\/[a-z0-9.+-]+;base64,/.test(value);
}
