// Live implementation: talks to the FastAPI back-office through the same-origin /api proxy.
// Endpoints follow the API contract v0.2 (Blueprint §4, proposal for SH-01 #4). Today only
// /api/health and /api/greetings/hello exist; the others answer "not available" until the
// BE issues (#6, #8, #9, #11, #13, #15, #17) land.
import type { WhatsUpApi } from '../types/api';
import { parseOrThrow, request, uploadWithProgress } from './httpClient';
import { connectLiveRealtime } from './liveRealtime';
import {
  listOf,
  parseAuditEvent,
  parseConversation,
  parseDirectoryUser,
  parseField,
  parseMember,
  parseMessage,
  parseReport,
  parseUser,
} from './parsers';

function id(value: number): string {
  return encodeURIComponent(String(value));
}

function conversationPath(conversationId: number, suffix = ''): string {
  return `/api/conversations/${id(conversationId)}${suffix}`;
}

export const liveApi: WhatsUpApi = {
  mode: 'live',

  auth: {
    async me() {
      return parseOrThrow(await request('GET', '/api/auth/me'), parseUser);
    },
    async login(username, password) {
      const data = await request('POST', '/api/auth/login', { json: { username, password } });
      return parseOrThrow(data, parseUser);
    },
    async register(input) {
      return parseOrThrow(await request('POST', '/api/auth/register', { json: input }), parseUser);
    },
    async logout() {
      await request('POST', '/api/auth/logout');
    },
  },

  users: {
    async directory() {
      return parseOrThrow(await request('GET', '/api/users'), listOf('users', parseDirectoryUser));
    },
  },

  conversations: {
    async list() {
      const data = await request('GET', '/api/conversations');
      return parseOrThrow(data, listOf('conversations', parseConversation));
    },
    async get(conversationId) {
      return parseOrThrow(await request('GET', conversationPath(conversationId)), parseConversation);
    },
    async createGroup(name) {
      const data = await request('POST', '/api/conversations', { json: { type: 'group', name } });
      return parseOrThrow(data, parseConversation);
    },
    async openDirect(userId) {
      const data = await request('POST', '/api/conversations', {
        json: { type: 'direct', participant_id: userId },
      });
      return parseOrThrow(data, parseConversation);
    },
    async members(conversationId) {
      const data = await request('GET', conversationPath(conversationId, '/members'));
      return parseOrThrow(data, listOf('members', parseMember));
    },
    async addMember(conversationId, userId) {
      const data = await request('POST', conversationPath(conversationId, '/members'), {
        json: { user_id: userId },
      });
      return parseOrThrow(data, listOf('members', parseMember));
    },
    async removeMember(conversationId, userId) {
      await request('DELETE', conversationPath(conversationId, `/members/${id(userId)}`));
    },
  },

  messages: {
    async list(conversationId, afterId) {
      const query = afterId === undefined ? '' : `?after_id=${id(afterId)}`;
      const data = await request('GET', conversationPath(conversationId, `/messages${query}`));
      return parseOrThrow(data, listOf('messages', parseMessage));
    },
    async post(conversationId, body) {
      const data = await request('POST', conversationPath(conversationId, '/messages'), {
        json: { body },
      });
      return parseOrThrow(data, parseMessage);
    },
    async attach(messageId, { file, confidential }, onProgress) {
      const form = new FormData();
      form.append('file', file);
      form.append('confidential', confidential ? 'true' : 'false');
      const data = await uploadWithProgress(`/api/messages/${id(messageId)}/attachments`, form, onProgress);
      return parseOrThrow(data, parseMessage);
    },
    async report(messageId, reason) {
      await request('POST', `/api/messages/${id(messageId)}/reports`, { json: { reason } });
    },
  },

  profile: {
    async update(displayName) {
      const data = await request('PATCH', '/api/profile', { json: { display_name: displayName } });
      return parseOrThrow(data, parseUser);
    },
    async uploadAvatar(file) {
      const form = new FormData();
      form.append('file', file);
      return parseOrThrow(await request('POST', '/api/profile/avatar', { form }), parseUser);
    },
  },

  admin: {
    async listUsers() {
      return parseOrThrow(await request('GET', '/api/admin/users'), listOf('users', parseUser));
    },
    async setRole(userId, role) {
      const data = await request('PATCH', `/api/admin/users/${id(userId)}`, { json: { role } });
      return parseOrThrow(data, parseUser);
    },
    async listAuditEvents() {
      const data = await request('GET', '/api/admin/audit-events?limit=100');
      return parseOrThrow(data, listOf('events', parseAuditEvent));
    },
    async listReports() {
      const data = await request('GET', '/api/admin/reports?limit=100');
      return parseOrThrow(data, listOf('reports', parseReport));
    },
  },

  realtime: {
    connect: connectLiveRealtime,
  },

  system: {
    async health() {
      return parseOrThrow(await request('GET', '/api/health'), parseField('status'));
    },
    async greeting() {
      return parseOrThrow(await request('GET', '/api/greetings/hello'), parseField('message'));
    },
  },
};
