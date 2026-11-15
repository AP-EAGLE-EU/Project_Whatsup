import { useEffect, useRef, useState } from 'react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Link from '../../../components/Link';
import Notice from '../../../components/Notice';
import { useAuth, useCurrentUser } from '../../../features/auth/AuthContext';
import Composer from '../../../features/chat/Composer';
import MessageItem from '../../../features/chat/MessageItem';
import chatStyles from '../../../features/chat/chat.module.css';
import { useMessages } from '../../../features/chat/useMessages';
import { useApi } from '../../../hooks/useApi';
import { ApiError, errorMessage } from '../../../services/apiError';
import type { AttachmentInput, Channel } from '../../../types/api';
import styles from '../screens.module.css';

type ChannelState =
  | { status: 'loading' }
  | { status: 'ready'; channel: Channel }
  | { status: 'error'; message: string };

export default function ChatScreen({ channelId }: { channelId: number }) {
  const api = useApi();
  const user = useCurrentUser();
  const { handleError } = useAuth();
  const [state, setState] = useState<ChannelState>({ status: 'loading' });
  const channel = state.status === 'ready' ? state.channel : null;
  const isMember = channel?.is_member ?? false;
  const { messages, error: pollError, upsert } = useMessages(channelId, isMember);
  const listEnd = useRef<HTMLLIElement>(null);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    api.channels
      .get(channelId)
      .then((loaded) => {
        if (active) setState({ status: 'ready', channel: loaded });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: handleError(error) });
      });
    return () => {
      active = false;
    };
  }, [api, channelId, handleError]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  // An expired session during polling sends the user back to sign in (side effect, not render).
  useEffect(() => {
    if (pollError !== null) handleError(pollError);
  }, [pollError, handleError]);
  const pollMessage = pollError === null ? null : errorMessage(pollError);

  async function join() {
    try {
      setState({ status: 'ready', channel: await api.channels.join(channelId) });
    } catch (error) {
      setState({ status: 'error', message: handleError(error) });
    }
  }

  async function send(body: string, attachment: AttachmentInput | null) {
    try {
      const posted = await api.messages.post(channelId, body);
      upsert(posted);
      if (attachment !== null) {
        upsert(await api.messages.attach(posted.id, attachment));
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
    return <p aria-busy="true">Loading channel…</p>;
  }

  if (state.status === 'error') {
    return (
      <>
        <Notice tone="error">{state.message}</Notice>
        <Link to="/channels">Back to channels</Link>
      </>
    );
  }

  const current = state.channel;
  return (
    <>
      <div className={styles.headerRow}>
        <h1>#{current.name}</h1>
        <Link to="/channels">All channels</Link>
      </div>
      {!current.is_member ? (
        <Card>
          <p>You are not a member of this channel, so its messages are hidden.</p>
          {current.is_private ? (
            <p className={styles.muted}>This channel is private. Ask a group manager to add you.</p>
          ) : (
            <Button onClick={() => void join()}>Join #{current.name}</Button>
          )}
        </Card>
      ) : (
        <>
          {pollMessage && <Notice tone="error">{pollMessage}</Notice>}
          <ul className={chatStyles.messages} aria-label={`Messages in #${current.name}`} aria-live="polite">
            {messages.length === 0 && <li className={chatStyles.empty}>No messages yet. Say hello!</li>}
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                own={message.author.id === user.id}
                onReport={report}
              />
            ))}
            <li ref={listEnd} aria-hidden="true" />
          </ul>
          <Composer onSend={send} />
        </>
      )}
    </>
  );
}
