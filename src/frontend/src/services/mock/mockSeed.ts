// Demo data for mock mode only (VITE_API_MODE=mock). Fictional people and organisations;
// the shared demo password is not a secret and never exists in the live back-office.
import type { Organisation, Role } from '../../types/api';

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

export interface MockChannel {
  id: number;
  name: string;
  organisation_id: number;
  is_private: boolean;
  member_ids: number[];
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
  channel_id: number;
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
  message_id: number;
  reporter_id: number;
  reason: string;
}

export interface MockState {
  organisations: Organisation[];
  users: MockUser[];
  channels: MockChannel[];
  messages: MockMessage[];
  audit: MockAuditEvent[];
  reports: MockReport[];
  session_user_id: number | null;
  next_id: number;
}

function user(
  id: number,
  username: string,
  displayName: string,
  role: Role,
  organisationId: number,
): MockUser {
  return {
    id,
    username,
    password: MOCK_DEMO_PASSWORD,
    display_name: displayName,
    role,
    organisation_id: organisationId,
    avatar_url: null,
    failed_logins: 0,
    locked_until: 0,
  };
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function createSeed(): MockState {
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
    channels: [
      { id: 1, name: 'general', organisation_id: 1, is_private: false, member_ids: [1, 2, 3, 4] },
      { id: 2, name: 'legal-team', organisation_id: 1, is_private: true, member_ids: [2, 3] },
      { id: 3, name: 'random', organisation_id: 1, is_private: false, member_ids: [2] },
      { id: 4, name: 'globex-general', organisation_id: 2, is_private: false, member_ids: [5] },
    ],
    messages: [
      { id: 1, channel_id: 1, author_id: 2, body: 'Welcome to #general!', created_at: minutesAgo(30), attachment: null },
      { id: 2, channel_id: 1, author_id: 1, body: 'Hi Bob, thanks.', created_at: minutesAgo(25), attachment: null },
      { id: 3, channel_id: 2, author_id: 3, body: 'Contract review moved to Friday.', created_at: minutesAgo(20), attachment: null },
      { id: 4, channel_id: 4, author_id: 5, body: 'Globex internal only.', created_at: minutesAgo(15), attachment: null },
    ],
    audit: [
      {
        id: 1,
        organisation_id: 1,
        event_type: 'seed',
        actor_username: null,
        timestamp: minutesAgo(60),
        details: 'Mock data loaded',
      },
    ],
    reports: [],
    session_user_id: null,
    next_id: 100,
  };
}
