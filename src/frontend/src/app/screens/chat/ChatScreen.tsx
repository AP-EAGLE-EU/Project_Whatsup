import { useCallback, useEffect, useRef, useState } from 'react';
import Badge from '../../../components/Badge';
import Link from '../../../components/Link';
import Notice from '../../../components/Notice';
import { useAuth, useCurrentUser } from '../../../features/auth/AuthContext';
import Composer from '../../../features/chat/Composer';
import MembersPanel from '../../../features/chat/MembersPanel';
import MessageItem from '../../../features/chat/MessageItem';
import chatStyles from '../../../features/chat/chat.module.css';
import { useMessages } from '../../../features/chat/useMessages';
import { useRealtime } from '../../../features/realtime/RealtimeContext';
import { useApi } from '../../../hooks/useApi';
import { ApiError, errorMessage } from '../../../services/apiError';
import type { AttachmentInput, Conversation, RealtimeStatus } from '../../../types/api';
import { conversationTitle } from '../../../utils/format';
import styles from '../screens.module.css';

type ConversationState =
  | { status: 'loading' }
  | { status: 'ready'; conversation: Conversation }
  | { status: 'error'; message: string };

const LIVE_LABELS: Record<RealtimeStatus, string> = {
  live: 'Live',
  connecting: 'Connecting…',
  offline: 'Reconnecting — refreshing every 3 s',
};

export default function ChatScreen({ conversationId }: { conversationId: number }) {
  const api = useApi();
  const user = useCurrentUser();
  const { handleError } = useAuth();
  const { subscribe } = useRealtime();
  const [state, setState] = useState<ConversationState>({ status: 'loading' });
  const ready = state.status === 'ready';
  const { messages, error: messagesError, loaded, upsert, liveStatus } = useMessages(conversationId, ready);
  const listEnd = useRef<HTMLLIElement>(null);

  const load = useCallback(async () => {
    try {
      setState({ status: 'ready', conversation: await api.conversations.get(conversationId) });
    } catch (error) {
      setState({ status: 'error', message: handleError(error) });
    }
  }, [api, conversationId, handleError]);

  useEffect(() => {
    setState({ status: 'loading' });
    void load();
  }, [load]);

  // Membership changed (e.g. I was removed): re-check access with the server.
  useEffect(
    () =>
      subscribe((event) => {
        if (event.type === 'conversation.updated' && event.conversation_id === conversationId) void load();
      }),
    [subscribe, conversationId, load],
  );

  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  // An expired session while loading/polling sends the user back to sign in (side effect, not render).
  useEffect(() => {
    if (messagesError !== null) handleError(messagesError);
  }, [messagesError, handleError]);

  async function send(body: string, attachment: AttachmentInput | null, onProgress: (percent: number) => void) {
    try {
      const posted = await api.messages.post(conversationId, body);
      upsert(posted);
      if (attachment !== null) {
        upsert(await api.messages.attach(posted.id, attachment, onProgress));
      }
    } catch (error) {
      throw new ApiError('unexpected', handleError(error));
    }
  }

  async function report(messageId: number, reason: string) {
    try {
      await api.messages.report(messageId, reason);
    } catch (error) {
      throw new ApiError('unexpected', handleError(error));
    }
  }

  if (state.status === 'loading') {
    return <p aria-busy="true">Loading conversation…</p>;
  }

  if (state.status === 'error') {
    return (
      <>
        <Notice tone="error">{state.message}</Notice>
        <Link to="/conversations">Back to conversations</Link>
      </>
    );
  }

  const conversation = state.conversation;
  return (
    <>
      <div className={styles.headerRow}>
        <h1>{conversationTitle(conversation)}</h1>
        <span className={styles.channelMeta}>
          <Badge>{conversation.type === 'group' ? 'Group' : 'Direct'}</Badge>
          <span className={chatStyles.liveStatus} data-status={liveStatus} data-testid="live-status">
            {LIVE_LABELS[liveStatus]}
          </span>
          <Link to="/conversations">All conversations</Link>
        </span>
      </div>
      <div className={chatStyles.layout}>
        <div className={chatStyles.thread}>
          {messagesError !== null && <Notice tone="error">{errorMessage(messagesError)}</Notice>}
          <ul
            className={chatStyles.messages}
            aria-label={`Messages in ${conversationTitle(conversation)}`}
            aria-live="polite"
            aria-busy={!loaded}
          >
            {!loaded && <li className={chatStyles.empty}>Loading messages…</li>}
            {loaded && messages.length === 0 && (
              <li className={chatStyles.empty} data-testid="empty-messages">
                No messages yet. Say hello!
              </li>
            )}
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} own={message.author.id === user.id} onReport={report} />
            ))}
            <li ref={listEnd} aria-hidden="true" />
          </ul>
          <Composer onSend={send} />
        </div>
        <MembersPanel conversation={conversation} currentUserId={user.id} />
      </div>
    </>
  );
}
