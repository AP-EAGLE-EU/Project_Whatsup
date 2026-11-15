import { ROLES } from '../types/api';
import type {
  Attachment,
  AuditEvent,
  Conversation,
  DirectoryUser,
  Member,
  Message,
  MessageReport,
  Organisation,
  PublicProfile,
  RealtimeEvent,
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

export function parseDirectoryUser(value: unknown): DirectoryUser {
  const record = asRecord(value);
  return {
    id: readNumber(record, 'id'),
    username: readString(record, 'username'),
    display_name: readString(record, 'display_name'),
    avatar_url: sameOriginUrl(record, 'avatar_url'),
  };
}

export function parseMember(value: unknown): Member {
  const record = asRecord(value);
  return { ...parseDirectoryUser(record), is_manager: readBoolean(record, 'is_manager') };
}

export function parseConversation(value: unknown): Conversation {
  const record = asRecord(value);
  const type = readString(record, 'type');
  if (type !== 'group' && type !== 'direct') {
    throw new TypeError('Unknown conversation type.');
  }
  return {
    id: readNumber(record, 'id'),
    type,
    name: readString(record, 'name'),
    member_count: readNumber(record, 'member_count'),
    can_manage: readBoolean(record, 'can_manage'),
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
    conversation_id: readNumber(record, 'conversation_id'),
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

export function parseReport(value: unknown): MessageReport {
  const record = asRecord(value);
  return {
    id: readNumber(record, 'id'),
    message_id: readNumber(record, 'message_id'),
    conversation_id: readNumber(record, 'conversation_id'),
    conversation_name: readString(record, 'conversation_name'),
    reporter_username: readString(record, 'reporter_username'),
    reason: readString(record, 'reason'),
    message_body: readString(record, 'message_body'),
    created_at: readString(record, 'created_at'),
  };
}

/** WebSocket frames are untrusted input too; unknown event types are ignored (null). */
export function parseRealtimeEvent(value: unknown): RealtimeEvent | null {
  const record = asRecord(value);
  const type = readString(record, 'type');
  switch (type) {
    case 'message.created':
    case 'message.updated':
      return { type, message: parseMessage(readRecord(record, 'message')) };
    case 'conversation.updated':
      return { type, conversation_id: readNumber(record, 'conversation_id') };
    default:
      return null; // e.g. "ping" heartbeats
  }
}

/** Parses `{ "<key>": [ ... ] }` list envelopes. */
export function listOf<T>(key: string, parseItem: (value: unknown) => T) {
  return (value: unknown): T[] => readArray(asRecord(value), key).map(parseItem);
}

export function parseField(key: string) {
  return (value: unknown): string => readString(asRecord(value), key);
}
