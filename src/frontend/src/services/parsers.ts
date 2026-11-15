import { ROLES } from '../types/api';
import type {
  Attachment,
  AuditEvent,
  Channel,
  Message,
  Organisation,
  PublicProfile,
  Role,
  User,
} from '../types/api';
import {
  isRecord,
  isSafeRelativeUrl,
  readArray,
  readBoolean,
  readNullableString,
  readNumber,
  readRecord,
  readString,
} from '../utils/guards';
import type { JsonRecord } from '../utils/guards';

function asRecord(value: unknown): JsonRecord {
  if (!isRecord(value)) {
    throw new TypeError('Expected an object.');
  }
  return value;
}

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** API links are kept only when they stay on our own origin. */
function sameOriginUrl(record: JsonRecord, key: string): string | null {
  const value = readNullableString(record, key);
  return isSafeRelativeUrl(value) ? value : null;
}

export function parseOrganisation(value: unknown): Organisation {
  const record = asRecord(value);
  return { id: readNumber(record, 'id'), name: readString(record, 'name') };
}

export function parseUser(value: unknown): User {
  const record = asRecord(value);
  const role = readString(record, 'role');
  if (!isRole(role)) {
    throw new TypeError('Unknown role.');
  }
  return {
    id: readNumber(record, 'id'),
    username: readString(record, 'username'),
    display_name: readString(record, 'display_name'),
    role,
    organisation: parseOrganisation(readRecord(record, 'organisation')),
    avatar_url: sameOriginUrl(record, 'avatar_url'),
  };
}

export function parsePublicProfile(value: unknown): PublicProfile {
  const record = asRecord(value);
  return {
    id: readNumber(record, 'id'),
    display_name: readString(record, 'display_name'),
    avatar_url: sameOriginUrl(record, 'avatar_url'),
  };
}

export function parseChannel(value: unknown): Channel {
  const record = asRecord(value);
  return {
    id: readNumber(record, 'id'),
    name: readString(record, 'name'),
    is_private: readBoolean(record, 'is_private'),
    is_member: readBoolean(record, 'is_member'),
    member_count: readNumber(record, 'member_count'),
  };
}

function parseAttachment(value: unknown): Attachment | null {
  if (value === null || value === undefined) {
    return null;
  }
  const record = asRecord(value);
  const downloadUrl = sameOriginUrl(record, 'download_url');
  if (downloadUrl === null) {
    throw new TypeError('Attachment download URL must be same-origin.');
  }
  return {
    id: readNumber(record, 'id'),
    filename: readString(record, 'filename'),
    content_type: readString(record, 'content_type'),
    size_bytes: readNumber(record, 'size_bytes'),
    confidential: readBoolean(record, 'confidential'),
    download_url: downloadUrl,
  };
}

export function parseMessage(value: unknown): Message {
  const record = asRecord(value);
  return {
    id: readNumber(record, 'id'),
    channel_id: readNumber(record, 'channel_id'),
    author: parsePublicProfile(readRecord(record, 'author')),
    body: readString(record, 'body'),
    created_at: readString(record, 'created_at'),
    attachment: parseAttachment(record.attachment),
  };
}

export function parseAuditEvent(value: unknown): AuditEvent {
  const record = asRecord(value);
  return {
    id: readNumber(record, 'id'),
    event_type: readString(record, 'event_type'),
    actor_username: readNullableString(record, 'actor_username'),
    timestamp: readString(record, 'timestamp'),
    source_ip: readString(record, 'source_ip'),
    details: readString(record, 'details'),
  };
}

/** Parses `{ "<key>": [ ... ] }` list envelopes. */
export function listOf<T>(key: string, parseItem: (value: unknown) => T) {
  return (value: unknown): T[] => readArray(asRecord(value), key).map(parseItem);
}

export function parseField(key: string) {
  return (value: unknown): string => readString(asRecord(value), key);
}
