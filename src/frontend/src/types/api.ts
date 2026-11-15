// Shapes of the WhatsUp API contract v0.1 (Blueprint §4 "API contract").
// The backend owns every rule; these types only describe what the front expects back.

export type Role = 'employee' | 'group_manager' | 'org_admin';

export const ROLES: readonly Role[] = ['employee', 'group_manager', 'org_admin'];

export interface Organisation {
  id: number;
  name: string;
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  role: Role;
  organisation: Organisation;
  avatar_url: string | null;
}

export interface PublicProfile {
  id: number;
  display_name: string;
  avatar_url: string | null;
}

export interface Channel {
  id: number;
  name: string;
  is_private: boolean;
  is_member: boolean;
  member_count: number;
}

export interface Attachment {
  id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  confidential: boolean;
  download_url: string;
}

export interface Message {
  id: number;
  channel_id: number;
  author: PublicProfile;
  body: string;
  created_at: string;
  attachment: Attachment | null;
}

export interface AuditEvent {
  id: number;
  event_type: string;
  actor_username: string | null;
  timestamp: string;
  source_ip: string;
  details: string;
}

export interface RegisterInput {
  username: string;
  display_name: string;
  password: string;
}

export interface AttachmentInput {
  file: File;
  confidential: boolean;
}

/** One implementation talks to FastAPI (live), the other is an in-memory demo (mock). */
export interface WhatsUpApi {
  mode: 'live' | 'mock';
  /** Mock mode only: the fictional demo accounts shown on the login screen. */
  demoNotice?: string;
  auth: {
    me(): Promise<User>;
    login(username: string, password: string): Promise<User>;
    register(input: RegisterInput): Promise<User>;
    logout(): Promise<void>;
  };
  channels: {
    list(): Promise<Channel[]>;
    get(channelId: number): Promise<Channel>;
    create(name: string): Promise<Channel>;
    join(channelId: number): Promise<Channel>;
  };
  messages: {
    list(channelId: number, afterId?: number): Promise<Message[]>;
    post(channelId: number, body: string): Promise<Message>;
    attach(messageId: number, input: AttachmentInput): Promise<Message>;
    report(messageId: number, reason: string): Promise<void>;
  };
  profile: {
    update(displayName: string): Promise<User>;
    uploadAvatar(file: File): Promise<User>;
  };
  admin: {
    listUsers(): Promise<User[]>;
    setRole(userId: number, role: Role): Promise<User>;
    listAuditEvents(): Promise<AuditEvent[]>;
  };
  system: {
    health(): Promise<string>;
    greeting(): Promise<string>;
  };
}
