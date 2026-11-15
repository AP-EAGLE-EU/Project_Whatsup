// Demo data for mock mode only (VITE_API_MODE=mock). Fictional people and organisations;
// the shared demo password is not a secret and never exists in the live back-office.
import type { ConversationType, Organisation, Role } from '../../types/api';

export const MOCK_DEMO_PASSWORD = 'demo-password-2026';

export interface MockUser {
  id: number;
  username: string;
  password: string;
  display_name: string;
  role: Role;
  organisation_id: number;
  avatar_url: string | null;
  failed_logins: number;
  locked_until: number;
}

export interface MockConversation {
  id: number;
  type: ConversationType;
  name: string; // empty for direct conversations (named after the other participant)
  organisation_id: number;
  member_ids: number[];
  manager_ids: number[];
}

export interface MockAttachment {
  id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  confidential: boolean;
  data_url: string;
}

export interface MockMessage {
  id: number;
  conversation_id: number;
  author_id: number;
  body: string;
  created_at: string;
  attachment: MockAttachment | null;
}

export interface MockAuditEvent {
  id: number;
  organisation_id: number | null;
  event_type: string;
  actor_username: string | null;
  timestamp: string;
  details: string;
}

export interface MockReport {
  id: number;
  message_id: number;
  reporter_id: number;
  reason: string;
  created_at: string;
}

export interface MockData {
  organisations: Organisation[];
  users: MockUser[];
  conversations: MockConversation[];
  messages: MockMessage[];
  audit: MockAuditEvent[];
  reports: MockReport[];
  next_id: number;
}

function user(id: number, username: string, displayName: string, role: Role, orgId: number): MockUser {
  return {
    id,
    username,
    password: MOCK_DEMO_PASSWORD,
    display_name: displayName,
    role,
    organisation_id: orgId,
    avatar_url: null,
    failed_logins: 0,
    locked_until: 0,
  };
}

function group(id: number, name: string, orgId: number, members: number[], managers: number[]): MockConversation {
  return { id, type: 'group', name, organisation_id: orgId, member_ids: members, manager_ids: managers };
}

function message(id: number, conversationId: number, authorId: number, body: string, minutesAgo: number): MockMessage {
  const createdAt = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  return { id, conversation_id: conversationId, author_id: authorId, body, created_at: createdAt, attachment: null };
}

export function createSeed(): MockData {
  return {
    organisations: [
      { id: 1, name: 'Acme Legal' },
      { id: 2, name: 'Globex Finance' },
    ],
    users: [
      user(1, 'alice', 'Alice Martin', 'employee', 1),
      user(2, 'bob', 'Bob Singh', 'employee', 1),
      user(3, 'grace', 'Grace Okafor', 'group_manager', 1),
      user(4, 'itadmin', 'IT Admin', 'org_admin', 1),
      user(5, 'mallory', 'Mallory Reed', 'employee', 2),
    ],
    conversations: [
      group(1, 'general', 1, [1, 2, 3, 4], [3]),
      group(2, 'legal-team', 1, [2, 3], [3]),
      { id: 3, type: 'direct', name: '', organisation_id: 1, member_ids: [1, 2], manager_ids: [] },
      group(4, 'it-ops', 1, [3, 4], [4]),
      group(5, 'globex-general', 2, [5], []),
    ],
    messages: [
      message(1, 1, 2, 'Welcome to #general!', 30),
      message(2, 1, 1, 'Hi Bob, thanks.', 25),
      message(3, 2, 3, 'Contract review moved to Friday.', 20),
      message(4, 3, 2, 'Can you check the NDA draft?', 18),
      message(5, 4, 4, 'Patch window tonight at 22:00.', 16),
      message(6, 5, 5, 'Globex internal only.', 15),
    ],
    audit: [
      { id: 1, organisation_id: 1, event_type: 'seed', actor_username: null, timestamp: new Date().toISOString(), details: 'Mock data loaded' },
    ],
    reports: [],
    next_id: 100,
  };
}
