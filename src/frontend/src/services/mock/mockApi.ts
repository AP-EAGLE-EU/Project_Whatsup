// In-browser mock of the API contract v0.2, used only when VITE_API_MODE=mock.
// It mirrors the rules the real back-office must enforce (Blueprint §4; BE-03/04/05/07/08/09),
// so every screen can be demonstrated and tested before the BE issues land.
// Data lives in localStorage (shared by the tabs of one browser) and the session in
// sessionStorage (one user per tab), so two tabs can chat "live" through BroadcastChannel.
// It is NOT a security control: a browser-side mock can always be bypassed.
import { ApiError } from '../apiError';
import type {
  AuditEvent,
  Conversation,
  DirectoryUser,
  Member,
  Message,
  MessageReport,
  RealtimeEvent,
  RegisterInput,
  Role,
  User,
  WhatsUpApi,
} from '../../types/api';
import { ROLES } from '../../types/api';
import { createSeed, MOCK_DEMO_PASSWORD } from './mockSeed';
import type { MockConversation, MockData, MockMessage, MockUser } from './mockSeed';

const DATA_KEY = 'whatsup-mock-data-v2';
const SESSION_KEY = 'whatsup-mock-session-v2';
const EVENTS_CHANNEL = 'whatsup-mock-events';
const LATENCY_MS = 120;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 30_000;
const USERNAME_PATTERN = /^[a-z0-9_.-]{3,32}$/;
const GROUP_NAME_PATTERN = /^[a-z0-9-]{2,32}$/;
const MAX_BODY_LENGTH = 1000;
const MAX_DISPLAY_NAME_LENGTH = 64;
const MAX_REASON_LENGTH = 500;
const AVATAR_MAX_BYTES = 1024 * 1024;
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain'];
const GENERIC_LOGIN_ERROR = 'Invalid username or password.';

/** What travels on the mock "server" bus; recipients are filtered like a real server would. */
interface BusEnvelope {
  event: RealtimeEvent;
  organisation_id: number;
  member_ids: number[];
}

function loadData(): MockData {
  try {
    const saved = window.localStorage.getItem(DATA_KEY);
    if (saved !== null) return JSON.parse(saved) as MockData;
  } catch {
    // Storage blocked or corrupt: fall back to a fresh seed.
  }
  return createSeed();
}

function saveData(data: MockData): void {
  try {
    window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch {
    // The demo still works for this call when storage is unavailable.
  }
}

/** The tab's session: plays the role of the server-side session store (SR-SESS). */
function sessionUserId(): number | null {
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

function setSessionUserId(userId: number | null): void {
  try {
    if (userId === null) window.sessionStorage.removeItem(SESSION_KEY);
    else window.sessionStorage.setItem(SESSION_KEY, String(userId));
  } catch {
    // ignore
  }
}

function delay(ms = LATENCY_MS): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
  if (isPng) return 'image/png';
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return isJpeg ? 'image/jpeg' : null;
}

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function nextId(data: MockData): number {
  data.next_id += 1;
  return data.next_id;
}

function audit(data: MockData, eventType: string, actor: MockUser | null, details: string, orgId = 1): void {
  data.audit.push({
    id: nextId(data),
    organisation_id: actor?.organisation_id ?? orgId,
    event_type: eventType,
    actor_username: actor?.username ?? null,
    timestamp: new Date().toISOString(),
    details,
  });
}

function requireUser(data: MockData): MockUser {
  const current = data.users.find((candidate) => candidate.id === sessionUserId());
  if (current === undefined) throw new ApiError('unauthenticated');
  return current;
}

function requireAdmin(data: MockData): MockUser {
  const current = requireUser(data);
  if (current.role !== 'org_admin') throw new ApiError('forbidden');
  return current;
}

function toUser(data: MockData, mockUser: MockUser): User {
  const organisation = data.organisations.find((org) => org.id === mockUser.organisation_id);
  return {
    id: mockUser.id,
    username: mockUser.username,
    display_name: mockUser.display_name,
    role: mockUser.role,
    organisation: organisation ?? { id: mockUser.organisation_id, name: 'Unknown' },
    avatar_url: mockUser.avatar_url,
  };
}

function toDirectoryUser(mockUser: MockUser): DirectoryUser {
  return {
    id: mockUser.id,
    username: mockUser.username,
    display_name: mockUser.display_name,
    avatar_url: mockUser.avatar_url,
  };
}

function canManage(conversation: MockConversation, viewer: MockUser): boolean {
  if (conversation.type !== 'group' || !conversation.member_ids.includes(viewer.id)) return false;
  return viewer.role === 'org_admin' || conversation.manager_ids.includes(viewer.id);
}

function toConversation(data: MockData, conversation: MockConversation, viewer: MockUser): Conversation {
  let name = conversation.name;
  if (conversation.type === 'direct') {
    const otherId = conversation.member_ids.find((memberId) => memberId !== viewer.id);
    name = data.users.find((candidate) => candidate.id === otherId)?.display_name ?? 'Unknown user';
  }
  return {
    id: conversation.id,
    type: conversation.type,
    name,
    member_count: conversation.member_ids.length,
    can_manage: canManage(conversation, viewer),
  };
}

function toMessage(data: MockData, message: MockMessage): Message {
  const author = data.users.find((candidate) => candidate.id === message.author_id);
  const attachment = message.attachment;
  return {
    id: message.id,
    conversation_id: message.conversation_id,
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

function toMembers(data: MockData, conversation: MockConversation): Member[] {
  return conversation.member_ids
    .map((memberId) => data.users.find((candidate) => candidate.id === memberId))
    .filter((member): member is MockUser => member !== undefined)
    .map((member) => ({ ...toDirectoryUser(member), is_manager: conversation.manager_ids.includes(member.id) }));
}

/** Other-organisation conversations look exactly like missing ones (no existence oracle). */
function findConversation(data: MockData, conversationId: number, viewer: MockUser): MockConversation {
  const conversation = data.conversations.find(
    (candidate) => candidate.id === conversationId && candidate.organisation_id === viewer.organisation_id,
  );
  if (conversation === undefined) throw new ApiError('not_found', 'Conversation not found.');
  return conversation;
}

function requireParticipant(data: MockData, conversationId: number, viewer: MockUser): MockConversation {
  const conversation = findConversation(data, conversationId, viewer);
  if (!conversation.member_ids.includes(viewer.id)) {
    throw new ApiError('forbidden', 'You are not a participant of this conversation.');
  }
  return conversation;
}

function requireManager(data: MockData, conversationId: number, viewer: MockUser): MockConversation {
  const conversation = requireParticipant(data, conversationId, viewer);
  if (!canManage(conversation, viewer)) {
    throw new ApiError('forbidden', 'Only a manager of this group can change its members.');
  }
  return conversation;
}

function findSameOrgUser(data: MockData, userId: number, viewer: MockUser): MockUser {
  const found = data.users.find(
    (candidate) => candidate.id === userId && candidate.organisation_id === viewer.organisation_id,
  );
  if (found === undefined) throw new ApiError('not_found', 'User not found.');
  return found;
}

function findVisibleMessage(data: MockData, messageId: number, viewer: MockUser): MockMessage {
  const message = data.messages.find((candidate) => candidate.id === messageId);
  if (message === undefined) throw new ApiError('not_found', 'Message not found.');
  requireParticipant(data, message.conversation_id, viewer);
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

export function createMockApi(): WhatsUpApi {
  const bus = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(EVENTS_CHANNEL);

  function publish(event: RealtimeEvent, conversation: MockConversation): void {
    const envelope: BusEnvelope = {
      event,
      organisation_id: conversation.organisation_id,
      member_ids: [...conversation.member_ids],
    };
    bus?.postMessage(envelope);
  }

  return {
    mode: 'mock',
    demoNotice:
      'Demo accounts: alice, bob (employees), grace (group manager), itadmin (IT admin) — ' +
      `Acme Legal; mallory — Globex Finance. Password for all: ${MOCK_DEMO_PASSWORD}`,

    auth: {
      async me() {
        await delay();
        const data = loadData();
        return toUser(data, requireUser(data));
      },

      async login(username, password) {
        await delay();
        const data = loadData();
        const candidate = data.users.find((entry) => entry.username === username);
        if (candidate !== undefined && candidate.locked_until > Date.now()) {
          audit(data, 'login_locked', candidate, 'Login refused: account temporarily locked');
          saveData(data);
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
          audit(data, 'login_failure', candidate ?? null, 'Invalid credentials');
          saveData(data);
          throw new ApiError('unauthenticated', GENERIC_LOGIN_ERROR);
        }
        candidate.failed_logins = 0;
        setSessionUserId(candidate.id);
        audit(data, 'login_success', candidate, 'Session created');
        saveData(data);
        return toUser(data, candidate);
      },

      async register(input) {
        await delay();
        const data = loadData();
        validateRegistration(input);
        if (data.users.some((entry) => entry.username === input.username)) {
          throw new ApiError('conflict', 'This username is not available.');
        }
        const created: MockUser = {
          id: nextId(data),
          username: input.username,
          password: input.password,
          display_name: input.display_name.trim(),
          role: 'employee',
          organisation_id: 1,
          avatar_url: null,
          failed_logins: 0,
          locked_until: 0,
        };
        data.users.push(created);
        audit(data, 'register', created, 'Account created with role employee');
        saveData(data);
        return toUser(data, created);
      },

      async logout() {
        await delay();
        const data = loadData();
        const current = data.users.find((entry) => entry.id === sessionUserId());
        if (current !== undefined) {
          audit(data, 'logout', current, 'Session destroyed');
          saveData(data);
        }
        setSessionUserId(null);
      },
    },

    users: {
      async directory() {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        return data.users
          .filter((entry) => entry.organisation_id === viewer.organisation_id)
          .map(toDirectoryUser);
      },
    },

    conversations: {
      async list() {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        return data.conversations
          .filter((c) => c.organisation_id === viewer.organisation_id && c.member_ids.includes(viewer.id))
          .map((c) => toConversation(data, c, viewer));
      },

      async get(conversationId) {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        return toConversation(data, requireParticipant(data, conversationId, viewer), viewer);
      },

      async createGroup(name) {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        if (viewer.role === 'employee') {
          throw new ApiError('forbidden', 'Only group managers and IT admins can create groups.');
        }
        if (!GROUP_NAME_PATTERN.test(name)) {
          throw new ApiError('validation', 'Group name: 2–32 characters, a–z, 0–9 or dash.');
        }
        const exists = data.conversations.some(
          (c) => c.type === 'group' && c.organisation_id === viewer.organisation_id && c.name === name,
        );
        if (exists) throw new ApiError('conflict', 'A group with this name already exists.');
        const conversation: MockConversation = {
          id: nextId(data),
          type: 'group',
          name,
          organisation_id: viewer.organisation_id,
          member_ids: [viewer.id],
          manager_ids: [viewer.id],
        };
        data.conversations.push(conversation);
        audit(data, 'group_created', viewer, `Group #${name} created`);
        saveData(data);
        return toConversation(data, conversation, viewer);
      },

      async openDirect(userId) {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        if (userId === viewer.id) {
          throw new ApiError('validation', 'You cannot start a conversation with yourself.');
        }
        const other = findSameOrgUser(data, userId, viewer);
        const existing = data.conversations.find(
          (c) =>
            c.type === 'direct' &&
            c.member_ids.length === 2 &&
            c.member_ids.includes(viewer.id) &&
            c.member_ids.includes(other.id),
        );
        if (existing !== undefined) return toConversation(data, existing, viewer);
        const conversation: MockConversation = {
          id: nextId(data),
          type: 'direct',
          name: '',
          organisation_id: viewer.organisation_id,
          member_ids: [viewer.id, other.id],
          manager_ids: [],
        };
        data.conversations.push(conversation);
        saveData(data);
        publish({ type: 'conversation.updated', conversation_id: conversation.id }, conversation);
        return toConversation(data, conversation, viewer);
      },

      async members(conversationId) {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        return toMembers(data, requireParticipant(data, conversationId, viewer));
      },

      async addMember(conversationId, userId) {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        const conversation = requireManager(data, conversationId, viewer);
        const target = findSameOrgUser(data, userId, viewer);
        if (conversation.member_ids.includes(target.id)) {
          throw new ApiError('conflict', `${target.display_name} is already a member.`);
        }
        conversation.member_ids.push(target.id);
        audit(data, 'member_added', viewer, `${target.username} added to #${conversation.name}`);
        saveData(data);
        publish({ type: 'conversation.updated', conversation_id: conversation.id }, conversation);
        return toMembers(data, conversation);
      },

      async removeMember(conversationId, userId) {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        const conversation = requireManager(data, conversationId, viewer);
        if (userId === viewer.id) {
          throw new ApiError('validation', 'You cannot remove yourself from the group.');
        }
        if (!conversation.member_ids.includes(userId)) {
          throw new ApiError('not_found', 'User not found.');
        }
        const target = findSameOrgUser(data, userId, viewer);
        publish({ type: 'conversation.updated', conversation_id: conversation.id }, conversation);
        conversation.member_ids = conversation.member_ids.filter((memberId) => memberId !== userId);
        conversation.manager_ids = conversation.manager_ids.filter((managerId) => managerId !== userId);
        audit(data, 'member_removed', viewer, `${target.username} removed from #${conversation.name}`);
        saveData(data);
      },
    },

    messages: {
      async list(conversationId, afterId) {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        requireParticipant(data, conversationId, viewer);
        return data.messages
          .filter((message) => message.conversation_id === conversationId)
          .filter((message) => afterId === undefined || message.id > afterId)
          .slice(-100)
          .map((message) => toMessage(data, message));
      },

      async post(conversationId, body) {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        const conversation = requireParticipant(data, conversationId, viewer);
        const text = body.trim();
        if (text.length === 0 || text.length > MAX_BODY_LENGTH) {
          throw new ApiError('validation', 'A message must contain 1–1000 characters.');
        }
        const message: MockMessage = {
          id: nextId(data),
          conversation_id: conversationId,
          author_id: viewer.id,
          body: text,
          created_at: new Date().toISOString(),
          attachment: null,
        };
        data.messages.push(message);
        saveData(data);
        const result = toMessage(data, message);
        publish({ type: 'message.created', message: result }, conversation);
        return result;
      },

      async attach(messageId, { file, confidential }, onProgress) {
        const data = loadData();
        const viewer = requireUser(data);
        const message = findVisibleMessage(data, messageId, viewer);
        if (message.author_id !== viewer.id) throw new ApiError('forbidden');
        if (file.size > ATTACHMENT_MAX_BYTES) {
          throw new ApiError('validation', 'Attachments are limited to 5 MB.');
        }
        if (!ATTACHMENT_TYPES.includes(file.type)) {
          throw new ApiError('validation', 'Allowed attachments: PDF, PNG, JPEG or plain text.');
        }
        for (const percent of [25, 50, 75, 100]) {
          await delay(150); // simulated network, so the progress bar is visible (FE-05)
          onProgress?.(percent);
        }
        const dataUrl = await readAsDataUrl(file);
        const fresh = loadData();
        const target = fresh.messages.find((candidate) => candidate.id === messageId);
        const conversation = fresh.conversations.find((c) => c.id === target?.conversation_id);
        if (target === undefined || conversation === undefined) throw new ApiError('not_found');
        target.attachment = {
          id: nextId(fresh),
          filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
          confidential,
          data_url: dataUrl,
        };
        audit(fresh, 'attachment_uploaded', viewer, `${confidential ? 'Confidential' : 'Standard'} attachment on message ${messageId}`);
        saveData(fresh);
        const result = toMessage(fresh, target);
        publish({ type: 'message.updated', message: result }, conversation);
        return result;
      },

      async report(messageId, reason) {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        findVisibleMessage(data, messageId, viewer);
        const text = reason.trim();
        if (text.length === 0 || text.length > MAX_REASON_LENGTH) {
          throw new ApiError('validation', 'Please give a reason (up to 500 characters).');
        }
        data.reports.push({
          id: nextId(data),
          message_id: messageId,
          reporter_id: viewer.id,
          reason: text,
          created_at: new Date().toISOString(),
        });
        audit(data, 'message_reported', viewer, `Message ${messageId} reported as suspicious`);
        saveData(data);
      },
    },

    profile: {
      async update(displayName) {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        const name = displayName.trim();
        if (name.length === 0 || name.length > MAX_DISPLAY_NAME_LENGTH) {
          throw new ApiError('validation', 'Display name: 1–64 characters.');
        }
        viewer.display_name = name;
        saveData(data);
        return toUser(data, viewer);
      },

      async uploadAvatar(file) {
        await delay();
        const data = loadData();
        const viewer = requireUser(data);
        if (file.size > AVATAR_MAX_BYTES) {
          throw new ApiError('validation', 'Avatars are limited to 1 MB.');
        }
        const sniffed = await sniffImageType(file);
        if (sniffed === null || sniffed !== file.type) {
          throw new ApiError('validation', 'Avatars must be real PNG or JPEG images.');
        }
        viewer.avatar_url = await readAsDataUrl(file);
        audit(data, 'avatar_updated', viewer, 'Avatar replaced');
        saveData(data);
        return toUser(data, viewer);
      },
    },

    admin: {
      async listUsers() {
        await delay();
        const data = loadData();
        const admin = requireAdmin(data);
        return data.users
          .filter((entry) => entry.organisation_id === admin.organisation_id)
          .map((entry) => toUser(data, entry));
      },

      async setRole(userId, role) {
        await delay();
        const data = loadData();
        const admin = requireAdmin(data);
        if (!isRole(role)) throw new ApiError('validation', 'Unknown role.');
        const target = findSameOrgUser(data, userId, admin);
        if (target.id === admin.id) {
          throw new ApiError('forbidden', 'Administrators cannot change their own role.');
        }
        const previous = target.role;
        target.role = role;
        audit(data, 'role_changed', admin, `${target.username}: ${previous} → ${role}`);
        saveData(data);
        return toUser(data, target);
      },

      async listAuditEvents() {
        await delay();
        const data = loadData();
        const admin = requireAdmin(data);
        return data.audit
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

      async listReports() {
        await delay();
        const data = loadData();
        const admin = requireAdmin(data);
        const result: MessageReport[] = [];
        for (const report of [...data.reports].reverse()) {
          const message = data.messages.find((candidate) => candidate.id === report.message_id);
          const conversation = data.conversations.find((c) => c.id === message?.conversation_id);
          const reporter = data.users.find((candidate) => candidate.id === report.reporter_id);
          if (message === undefined || conversation?.organisation_id !== admin.organisation_id) continue;
          result.push({
            id: report.id,
            message_id: message.id,
            conversation_id: conversation.id,
            conversation_name: conversation.type === 'group' ? `#${conversation.name}` : 'Direct conversation',
            reporter_username: reporter?.username ?? 'unknown',
            reason: report.reason,
            message_body: message.body,
            created_at: report.created_at,
          });
        }
        return result;
      },
    },

    realtime: {
      connect(handlers) {
        if (typeof BroadcastChannel === 'undefined') {
          handlers.onStatus('offline'); // the chat falls back to polling
          return () => undefined;
        }
        const listener = new BroadcastChannel(EVENTS_CHANNEL);
        let open = true;
        handlers.onStatus('connecting');
        window.setTimeout(() => {
          if (!open) return;
          if (sessionUserId() === null) handlers.onUnauthorized();
          else handlers.onStatus('live');
        }, LATENCY_MS);

        listener.onmessage = (frame: MessageEvent<BusEnvelope>) => {
          const viewerId = sessionUserId();
          if (!open || viewerId === null) return;
          const viewer = loadData().users.find((candidate) => candidate.id === viewerId);
          const { event, organisation_id: orgId, member_ids: memberIds } = frame.data;
          if (viewer === undefined || viewer.organisation_id !== orgId) return;
          const forMembersOnly = event.type !== 'conversation.updated';
          if (forMembersOnly && !memberIds.includes(viewerId)) return;
          // At-least-once delivery on purpose: every event arrives twice, so the
          // front's de-duplication is exercised by the tests (FE-04).
          handlers.onEvent(event);
          handlers.onEvent(event);
        };

        return () => {
          open = false;
          listener.close();
        };
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
