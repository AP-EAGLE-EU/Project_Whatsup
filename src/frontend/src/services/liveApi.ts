// Live implementation: talks to the FastAPI back-office through the same-origin /api proxy.
// Endpoints follow the API contract v0.1 (Blueprint §4). Today only /api/health and
// /api/greetings/hello exist; the others answer "not available" until stories B1–B3 land.
import type { WhatsUpApi } from '../types/api';
import { parseOrThrow, request } from './httpClient';
import {
  listOf,
  parseAuditEvent,
  parseChannel,
  parseField,
  parseMessage,
  parseUser,
} from './parsers';

function channelPath(channelId: number, suffix = ''): string {
  return `/api/channels/${encodeURIComponent(String(channelId))}${suffix}`;
}

function messagePath(messageId: number, suffix: string): string {
  return `/api/messages/${encodeURIComponent(String(messageId))}${suffix}`;
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

  channels: {
    async list() {
      return parseOrThrow(await request('GET', '/api/channels'), listOf('channels', parseChannel));
    },
    async get(channelId) {
      return parseOrThrow(await request('GET', channelPath(channelId)), parseChannel);
    },
    async create(name) {
      return parseOrThrow(await request('POST', '/api/channels', { json: { name } }), parseChannel);
    },
    async join(channelId) {
      return parseOrThrow(await request('POST', channelPath(channelId, '/join')), parseChannel);
    },
  },

  messages: {
    async list(channelId, afterId) {
      const query = afterId === undefined ? '' : `?after_id=${encodeURIComponent(String(afterId))}`;
      const data = await request('GET', channelPath(channelId, `/messages${query}`));
      return parseOrThrow(data, listOf('messages', parseMessage));
    },
    async post(channelId, body) {
      const data = await request('POST', channelPath(channelId, '/messages'), { json: { body } });
      return parseOrThrow(data, parseMessage);
    },
    async attach(messageId, { file, confidential }) {
      const form = new FormData();
      form.append('file', file);
      form.append('confidential', confidential ? 'true' : 'false');
      const data = await request('POST', messagePath(messageId, '/attachments'), { form });
      return parseOrThrow(data, parseMessage);
    },
    async report(messageId, reason) {
      await request('POST', messagePath(messageId, '/reports'), { json: { reason } });
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
      const path = `/api/admin/users/${encodeURIComponent(String(userId))}`;
      return parseOrThrow(await request('PATCH', path, { json: { role } }), parseUser);
    },
    async listAuditEvents() {
      const data = await request('GET', '/api/admin/audit-events?limit=100');
      return parseOrThrow(data, listOf('events', parseAuditEvent));
    },
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
