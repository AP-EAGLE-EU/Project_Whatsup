// Shapes of the WhatsUp API contract v0.2 (Blueprint §4 — proposal for SH-01, issue #4).
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

/** A colleague from my organisation (directory entry: public fields only). */
export interface DirectoryUser {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Member extends DirectoryUser {
  is_manager: boolean;
}

export type ConversationType = 'group' | 'direct';

export interface Conversation {
  id: number;
  type: ConversationType;
  /** Group name, or the other participant's display name for a direct conversation. */
  name: string;
  member_count: number;
  /** Server-computed: may I add/remove members? (UX hint only — the API decides.) */
  can_manage: boolean;
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
  conversation_id: number;
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

export interface MessageReport {
  id: number;
  message_id: number;
  conversation_id: number;
  conversation_name: string;
  reporter_username: string;
  reason: string;
  message_body: string;
  created_at: string;
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

/** Server → client events on the WebSocket (contract v0.2, BE-06 / FE-04). */
export type RealtimeEvent =
  | { type: 'message.created'; message: Message }
  | { type: 'message.updated'; message: Message }
  | { type: 'conversation.updated'; conversation_id: number };

export type RealtimeStatus = 'connecting' | 'live' | 'offline';

export interface RealtimeHandlers {
  onEvent(event: RealtimeEvent): void;
  onStatus(status: RealtimeStatus): void;
  /** The server closed the socket because the session is missing or expired. */
  onUnauthorized(): void;
}

/** One implementation talks to FastAPI (live), the other is an in-browser demo (mock). */
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
  users: {
    directory(): Promise<DirectoryUser[]>;
  };
  conversations: {
    list(): Promise<Conversation[]>;
    get(conversationId: number): Promise<Conversation>;
    createGroup(name: string): Promise<Conversation>;
    openDirect(userId: number): Promise<Conversation>;
    members(conversationId: number): Promise<Member[]>;
    addMember(conversationId: number, userId: number): Promise<Member[]>;
    removeMember(conversationId: number, userId: number): Promise<void>;
  };
  messages: {
    list(conversationId: number, afterId?: number): Promise<Message[]>;
    post(conversationId: number, body: string): Promise<Message>;
    attach(
      messageId: number,
      input: AttachmentInput,
      onProgress?: (percent: number) => void,
    ): Promise<Message>;
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
    listReports(): Promise<MessageReport[]>;
  };
  realtime: {
    /** Opens the live channel; returns a function that closes it. */
    connect(handlers: RealtimeHandlers): () => void;
  };
  system: {
    health(): Promise<string>;
    greeting(): Promise<string>;
  };
}
