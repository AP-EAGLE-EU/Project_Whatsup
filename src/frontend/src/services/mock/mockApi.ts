// In-memory mock of the API contract v0.1, used only when VITE_API_MODE=mock.
// It mirrors the rules the real back-office must enforce (Blueprint §4, SR-AUTH/AC/VAL/FILE),
// so the screens can be demonstrated and tested before stories B1–B3 exist.
// It is NOT a security control: a browser-side mock can always be bypassed.
import { ApiError } from '../apiError';
import type {
  AuditEvent,
  Channel,
  Message,
  RegisterInput,
  Role,
  User,
  WhatsUpApi,
} from '../../types/api';
import { ROLES } from '../../types/api';
import { createSeed, MOCK_DEMO_PASSWORD } from './mockSeed';
import type { MockChannel, MockMessage, MockState, MockUser } from './mockSeed';

const STORAGE_KEY = 'whatsup-mock-state-v1';
const LATENCY_MS = 120;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 30_000;
const USERNAME_PATTERN = /^[a-z0-9_.-]{3,32}$/;
const CHANNEL_NAME_PATTERN = /^[a-z0-9-]{2,32}$/;
const MAX_BODY_LENGTH = 1000;
const MAX_DISPLAY_NAME_LENGTH = 64;
const MAX_REASON_LENGTH = 500;
const AVATAR_MAX_BYTES = 1024 * 1024;
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];
const GENERIC_LOGIN_ERROR = 'Invalid username or password.';

function loadState(): MockState {
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      return JSON.parse(saved) as MockState;
    }
  } catch {
    // Storage blocked or corrupt: fall back to a fresh seed.
  }
  return createSeed();
}

function delay(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, LATENCY_MS));
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ApiError('unexpected'));
    reader.readAsDataURL(file);
  });
}

/** Content sniffing: the declared type must match the file's magic bytes (SR-FILE-01). */
async function sniffImageType(file: File): Promise<'image/png' | 'image/jpeg' | null> {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPng = [0x89, 0x50, 0x4e, 0x47].every((value, index) => bytes[index] === value);
  if (isPng) {
    return 'image/png';
  }
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return isJpeg ? 'image/jpeg' : null;
}

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function createMockApi(): WhatsUpApi {
  const state = loadState();

  function save(): void {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The demo still works in memory when storage is unavailable.
    }
  }

  function nextId(): number {
    state.next_id += 1;
    return state.next_id;
  }

  function audit(eventType: string, actor: MockUser | null, details: string, orgId?: number): void {
    state.audit.push({
      id: nextId(),
      organisation_id: actor?.organisation_id ?? orgId ?? null,
      event_type: eventType,
      actor_username: actor?.username ?? null,
      timestamp: new Date().toISOString(),
      details,
    });
  }

  function requireUser(): MockUser {
    const current = state.users.find((candidate) => candidate.id === state.session_user_id);
    if (current === undefined) {
      throw new ApiError('unauthenticated');
    }
    return current;
  }

  function requireAdmin(): MockUser {
    const current = requireUser();
    if (current.role !== 'org_admin') {
      throw new ApiError('forbidden');
    }
    return current;
  }

  function toUser(mockUser: MockUser): User {
    const organisation = state.organisations.find((org) => org.id === mockUser.organisation_id);
    return {
      id: mockUser.id,
      username: mockUser.username,
      display_name: mockUser.display_name,
      role: mockUser.role,
      organisation: organisation ?? { id: mockUser.organisation_id, name: 'Unknown' },
      avatar_url: mockUser.avatar_url,
    };
  }

  function toChannel(channel: MockChannel, viewer: MockUser): Channel {
    return {
      id: channel.id,
      name: channel.name,
      is_private: channel.is_private,
      is_member: channel.member_ids.includes(viewer.id),
      member_count: channel.member_ids.length,
    };
  }

  function toMessage(message: MockMessage): Message {
    const author = state.users.find((candidate) => candidate.id === message.author_id);
    const attachment = message.attachment;
    return {
      id: message.id,
      channel_id: message.channel_id,
      author: {
        id: message.author_id,
        display_name: author?.display_name ?? 'Unknown user',
        avatar_url: author?.avatar_url ?? null,
      },
      body: message.body,
      created_at: message.created_at,
      attachment:
        attachment === null
          ? null
          : {
              id: attachment.id,
              filename: attachment.filename,
              content_type: attachment.content_type,
              size_bytes: attachment.size_bytes,
              confidential: attachment.confidential,
              download_url: attachment.data_url,
            },
    };
  }

  /** Cross-organisation channels look exactly like missing ones (no existence oracle). */
  function findChannel(channelId: number, viewer: MockUser): MockChannel {
    const channel = state.channels.find(
      (candidate) =>
        candidate.id === channelId && candidate.organisation_id === viewer.organisation_id,
    );
    if (channel === undefined) {
      throw new ApiError('not_found', 'Channel not found.');
    }
    return channel;
  }

  function requireMembership(channelId: number, viewer: MockUser): MockChannel {
    const channel = findChannel(channelId, viewer);
    if (!channel.member_ids.includes(viewer.id)) {
      throw new ApiError('forbidden');
    }
    return channel;
  }

  function findVisibleMessage(messageId: number, viewer: MockUser): MockMessage {
    const message = state.messages.find((candidate) => candidate.id === messageId);
    if (message === undefined) {
      throw new ApiError('not_found', 'Message not found.');
    }
    requireMembership(message.channel_id, viewer);
    return message;
  }

  function validateRegistration(input: RegisterInput): void {
    if (!USERNAME_PATTERN.test(input.username)) {
      throw new ApiError('validation', 'Username: 3–32 characters, a–z, 0–9, dot, dash or underscore.');
    }
    const displayName = input.display_name.trim();
    if (displayName.length === 0 || displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new ApiError('validation', 'Display name: 1–64 characters.');
    }
    if (input.password.length < 8 || input.password.length > 128) {
      throw new ApiError('validation', 'Password: 8–128 characters.');
    }
  }

  return {
    mode: 'mock',
    demoNotice:
      'Demo accounts: alice, bob (employees), grace (group manager), itadmin (IT admin) — ' +
      `Acme Legal; mallory — Globex Finance. Password for all: ${MOCK_DEMO_PASSWORD}`,

    auth: {
      async me() {
        await delay();
        return toUser(requireUser());
      },

      async login(username, password) {
        await delay();
        const candidate = state.users.find((entry) => entry.username === username);
        if (candidate !== undefined && candidate.locked_until > Date.now()) {
          audit('login_locked', candidate, 'Login refused: account temporarily locked');
          save();
          throw new ApiError('rate_limited');
        }
        if (candidate === undefined || candidate.password !== password) {
          if (candidate !== undefined) {
            candidate.failed_logins += 1;
            if (candidate.failed_logins >= MAX_FAILED_LOGINS) {
              candidate.locked_until = Date.now() + LOCKOUT_MS;
              candidate.failed_logins = 0;
            }
          }
          audit('login_failure', candidate ?? null, 'Invalid credentials', 1);
          save();
          throw new ApiError('unauthenticated', GENERIC_LOGIN_ERROR);
        }
        candidate.failed_logins = 0;
        state.session_user_id = candidate.id;
        audit('login_success', candidate, 'Session created');
        save();
        return toUser(candidate);
      },

      async register(input) {
        await delay();
        validateRegistration(input);
        if (state.users.some((entry) => entry.username === input.username)) {
          throw new ApiError('conflict', 'This username is not available.');
        }
        const created: MockUser = {
          id: nextId(),
          username: input.username,
          password: input.password,
          display_name: input.display_name.trim(),
          role: 'employee',
          organisation_id: 1,
          avatar_url: null,
          failed_logins: 0,
          locked_until: 0,
        };
        state.users.push(created);
        audit('register', created, 'Account created with role employee');
        save();
        return toUser(created);
      },

      async logout() {
        await delay();
        const current = state.users.find((entry) => entry.id === state.session_user_id);
        if (current !== undefined) {
          audit('logout', current, 'Session destroyed');
        }
        state.session_user_id = null;
        save();
      },
    },

    channels: {
      async list() {
        await delay();
        const viewer = requireUser();
        return state.channels
          .filter((channel) => channel.organisation_id === viewer.organisation_id)
          .map((channel) => toChannel(channel, viewer));
      },

      async get(channelId) {
        await delay();
        const viewer = requireUser();
        return toChannel(findChannel(channelId, viewer), viewer);
      },

      async create(name) {
        await delay();
        const viewer = requireUser();
        if (!CHANNEL_NAME_PATTERN.test(name)) {
          throw new ApiError('validation', 'Channel name: 2–32 characters, a–z, 0–9 or dash.');
        }
        const exists = state.channels.some(
          (channel) => channel.organisation_id === viewer.organisation_id && channel.name === name,
        );
        if (exists) {
          throw new ApiError('conflict', 'A channel with this name already exists.');
        }
        const channel: MockChannel = {
          id: nextId(),
          name,
          organisation_id: viewer.organisation_id,
          is_private: false,
          member_ids: [viewer.id],
        };
        state.channels.push(channel);
        audit('channel_created', viewer, `Channel #${name} created`);
        save();
        return toChannel(channel, viewer);
      },

      async join(channelId) {
        await delay();
        const viewer = requireUser();
        const channel = findChannel(channelId, viewer);
        if (channel.is_private && !channel.member_ids.includes(viewer.id)) {
          throw new ApiError('forbidden', 'This channel is private. Ask a group manager to add you.');
        }
        if (!channel.member_ids.includes(viewer.id)) {
          channel.member_ids.push(viewer.id);
          audit('channel_joined', viewer, `Joined #${channel.name}`);
          save();
        }
        return toChannel(channel, viewer);
      },
    },

    messages: {
      async list(channelId, afterId) {
        await delay();
        const viewer = requireUser();
        requireMembership(channelId, viewer);
        return state.messages
          .filter((message) => message.channel_id === channelId)
          .filter((message) => afterId === undefined || message.id > afterId)
          .slice(-100)
          .map(toMessage);
      },

      async post(channelId, body) {
        await delay();
        const viewer = requireUser();
        requireMembership(channelId, viewer);
        const text = body.trim();
        if (text.length === 0 || text.length > MAX_BODY_LENGTH) {
          throw new ApiError('validation', 'A message must contain 1–1000 characters.');
        }
        const message: MockMessage = {
          id: nextId(),
          channel_id: channelId,
          author_id: viewer.id,
          body: text,
          created_at: new Date().toISOString(),
          attachment: null,
        };
        state.messages.push(message);
        save();
        return toMessage(message);
      },

      async attach(messageId, { file, confidential }) {
        await delay();
        const viewer = requireUser();
        const message = findVisibleMessage(messageId, viewer);
        if (message.author_id !== viewer.id) {
          throw new ApiError('forbidden');
        }
        if (file.size > ATTACHMENT_MAX_BYTES) {
          throw new ApiError('validation', 'Attachments are limited to 5 MB.');
        }
        if (!ATTACHMENT_TYPES.includes(file.type)) {
          throw new ApiError('validation', 'Allowed attachments: PDF, PNG, JPEG or plain text.');
        }
        message.attachment = {
          id: nextId(),
          filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
          confidential,
          data_url: await readAsDataUrl(file),
        };
        audit('attachment_uploaded', viewer, `${confidential ? 'Confidential' : 'Standard'} attachment on message ${messageId}`);
        save();
        return toMessage(message);
      },

      async report(messageId, reason) {
        await delay();
        const viewer = requireUser();
        findVisibleMessage(messageId, viewer);
        const text = reason.trim();
        if (text.length === 0 || text.length > MAX_REASON_LENGTH) {
          throw new ApiError('validation', 'Please give a reason (up to 500 characters).');
        }
        state.reports.push({ message_id: messageId, reporter_id: viewer.id, reason: text });
        audit('message_reported', viewer, `Message ${messageId} reported as suspicious`);
        save();
      },
    },

    profile: {
      async update(displayName) {
        await delay();
        const viewer = requireUser();
        const name = displayName.trim();
        if (name.length === 0 || name.length > MAX_DISPLAY_NAME_LENGTH) {
          throw new ApiError('validation', 'Display name: 1–64 characters.');
        }
        viewer.display_name = name;
        save();
        return toUser(viewer);
      },

      async uploadAvatar(file) {
        await delay();
        const viewer = requireUser();
        if (file.size > AVATAR_MAX_BYTES) {
          throw new ApiError('validation', 'Avatars are limited to 1 MB.');
        }
        const sniffed = await sniffImageType(file);
        if (sniffed === null || sniffed !== file.type) {
          throw new ApiError('validation', 'Avatars must be real PNG or JPEG images.');
        }
        viewer.avatar_url = await readAsDataUrl(file);
        audit('avatar_updated', viewer, 'Avatar replaced');
        save();
        return toUser(viewer);
      },
    },

    admin: {
      async listUsers() {
        await delay();
        const admin = requireAdmin();
        return state.users
          .filter((entry) => entry.organisation_id === admin.organisation_id)
          .map(toUser);
      },

      async setRole(userId, role) {
        await delay();
        const admin = requireAdmin();
        if (!isRole(role)) {
          throw new ApiError('validation', 'Unknown role.');
        }
        const target = state.users.find(
          (entry) => entry.id === userId && entry.organisation_id === admin.organisation_id,
        );
        if (target === undefined) {
          throw new ApiError('not_found', 'User not found.');
        }
        if (target.id === admin.id) {
          throw new ApiError('forbidden', 'Administrators cannot change their own role.');
        }
        const previous = target.role;
        target.role = role;
        audit('role_changed', admin, `${target.username}: ${previous} → ${role}`);
        save();
        return toUser(target);
      },

      async listAuditEvents() {
        await delay();
        const admin = requireAdmin();
        return state.audit
          .filter((event) => event.organisation_id === admin.organisation_id)
          .slice(-100)
          .reverse()
          .map(
            (event): AuditEvent => ({
              id: event.id,
              event_type: event.event_type,
              actor_username: event.actor_username,
              timestamp: event.timestamp,
              source_ip: '127.0.0.1 (mock)',
              details: event.details,
            }),
          );
      },
    },

    system: {
      async health() {
        await delay();
        return 'ok (mock)';
      },
      async greeting() {
        await delay();
        return 'hello (mock data)';
      },
    },
  };
}
