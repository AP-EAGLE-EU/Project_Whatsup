import { useCallback, useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Link from '../../../components/Link';
import Notice from '../../../components/Notice';
import TextField from '../../../components/TextField';
import uiStyles from '../../../components/ui.module.css';
import { useAuth, useCurrentUser } from '../../../features/auth/AuthContext';
import { useRealtime } from '../../../features/realtime/RealtimeContext';
import { useApi } from '../../../hooks/useApi';
import { navigate } from '../../../hooks/useRoute';
import type { Conversation, DirectoryUser } from '../../../types/api';
import { conversationTitle } from '../../../utils/format';
import styles from '../screens.module.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; conversations: Conversation[] }
  | { status: 'error'; message: string };

function ConversationRow({ conversation }: { conversation: Conversation }) {
  return (
    <li className={styles.listItem} data-testid="conversation">
      <Link to={`/conversations/${conversation.id}`}>{conversationTitle(conversation)}</Link>
      <span className={styles.channelMeta}>
        <Badge>{conversation.type === 'group' ? 'Group' : 'Direct'}</Badge>
        <span className={styles.muted}>
          {conversation.member_count} member{conversation.member_count === 1 ? '' : 's'}
        </span>
      </span>
    </li>
  );
}

function NewDirectForm({ onError }: { onError(message: string): void }) {
  const api = useApi();
  const user = useCurrentUser();
  const { handleError } = useAuth();
  const [colleagues, setColleagues] = useState<DirectoryUser[]>([]);
  const [selected, setSelected] = useState('');
  const selectId = useId();

  useEffect(() => {
    let active = true;
    api.users
      .directory()
      .then((users) => {
        if (active) setColleagues(users.filter((entry) => entry.id !== user.id));
      })
      .catch((error: unknown) => {
        if (active) onError(handleError(error));
      });
    return () => {
      active = false;
    };
  }, [api, user.id, handleError, onError]);

  async function start(event: FormEvent) {
    event.preventDefault();
    if (selected === '') return;
    try {
      const conversation = await api.conversations.openDirect(Number(selected));
      navigate(`/conversations/${conversation.id}`);
    } catch (error) {
      onError(handleError(error));
    }
  }

  return (
    <form className={styles.inlineForm} onSubmit={(event) => void start(event)}>
      <div>
        <label className={uiStyles.label} htmlFor={selectId}>
          Colleague
        </label>
        <select id={selectId} className={uiStyles.input} value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="">Choose a colleague…</option>
          {colleagues.map((colleague) => (
            <option key={colleague.id} value={colleague.id}>
              {colleague.display_name} ({colleague.username})
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={selected === ''}>
        Start
      </Button>
    </form>
  );
}

export default function ConversationsScreen() {
  const api = useApi();
  const user = useCurrentUser();
  const { handleError } = useAuth();
  const { subscribe } = useRealtime();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [groupName, setGroupName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const canCreateGroups = user.role !== 'employee';

  const load = useCallback(async () => {
    try {
      setState({ status: 'ready', conversations: await api.conversations.list() });
    } catch (error) {
      setState({ status: 'error', message: handleError(error) });
    }
  }, [api, handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  // A new direct conversation or a membership change shows up without reload (FE-04).
  useEffect(
    () =>
      subscribe((event) => {
        if (event.type === 'conversation.updated') void load();
      }),
    [subscribe, load],
  );

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      const conversation = await api.conversations.createGroup(groupName.trim().toLowerCase());
      navigate(`/conversations/${conversation.id}`);
    } catch (error) {
      setFormError(handleError(error));
    }
  }

  return (
    <>
      <div className={styles.headerRow}>
        <h1>Conversations</h1>
        <span className={styles.muted}>{user.organisation.name}</span>
      </div>
      {formError && <Notice tone="error">{formError}</Notice>}
      <Card title="Your conversations">
        {state.status === 'loading' && <p aria-busy="true">Loading conversations…</p>}
        {state.status === 'error' && <Notice tone="error">{state.message}</Notice>}
        {state.status === 'ready' && state.conversations.length === 0 && (
          <p className={styles.muted} data-testid="empty-conversations">
            No conversation yet. Start a direct message below.
          </p>
        )}
        {state.status === 'ready' && state.conversations.length > 0 && (
          <ul className={styles.list}>
            {state.conversations.map((conversation) => (
              <ConversationRow key={conversation.id} conversation={conversation} />
            ))}
          </ul>
        )}
      </Card>
      <Card title="New direct message">
        <NewDirectForm onError={setFormError} />
      </Card>
      {canCreateGroups && (
        <Card title="New group">
          <form className={styles.inlineForm} onSubmit={(event) => void createGroup(event)}>
            <TextField
              label="Group name"
              name="group_name"
              required
              minLength={2}
              maxLength={32}
              pattern="[a-z0-9\-]{2,32}"
              hint="2–32 characters: lowercase letters, digits or dash. You become its manager."
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
            />
            <Button type="submit">Create group</Button>
          </form>
        </Card>
      )}
    </>
  );
}
