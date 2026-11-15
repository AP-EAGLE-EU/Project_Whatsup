import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Badge from '../../../components/Badge';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Link from '../../../components/Link';
import Notice from '../../../components/Notice';
import TextField from '../../../components/TextField';
import { useAuth, useCurrentUser } from '../../../features/auth/AuthContext';
import { useApi } from '../../../hooks/useApi';
import { navigate } from '../../../hooks/useRoute';
import type { Channel } from '../../../types/api';
import styles from '../screens.module.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; channels: Channel[] }
  | { status: 'error'; message: string };

function ChannelRow({ channel, onJoin }: { channel: Channel; onJoin(channelId: number): void }) {
  return (
    <li className={styles.listItem} data-testid="channel">
      {channel.is_member ? (
        <Link to={`/channels/${channel.id}`}>#{channel.name}</Link>
      ) : (
        <span className={styles.muted}>#{channel.name}</span>
      )}
      <span className={styles.channelMeta}>
        {channel.is_private && <Badge>Private</Badge>}
        <span className={styles.muted}>
          {channel.member_count} member{channel.member_count === 1 ? '' : 's'}
        </span>
        {!channel.is_member && !channel.is_private && (
          <Button variant="ghost" onClick={() => onJoin(channel.id)}>
            Join
          </Button>
        )}
        {!channel.is_member && channel.is_private && (
          <span className={styles.muted}>Ask a group manager</span>
        )}
      </span>
    </li>
  );
}

export default function ChannelsScreen() {
  const api = useApi();
  const user = useCurrentUser();
  const { handleError } = useAuth();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.channels
      .list()
      .then((channels) => {
        if (active) setState({ status: 'ready', channels });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', message: handleError(error) });
      });
    return () => {
      active = false;
    };
  }, [api, handleError]);

  async function join(channelId: number) {
    try {
      const channel = await api.channels.join(channelId);
      navigate(`/channels/${channel.id}`);
    } catch (error) {
      setFormError(handleError(error));
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    try {
      const channel = await api.channels.create(name.trim().toLowerCase());
      navigate(`/channels/${channel.id}`);
    } catch (error) {
      setFormError(handleError(error));
    }
  }

  return (
    <>
      <div className={styles.headerRow}>
        <h1>Channels</h1>
        <span className={styles.muted}>{user.organisation.name}</span>
      </div>
      {formError && <Notice tone="error">{formError}</Notice>}
      <Card title="Your organisation's channels">
        {state.status === 'loading' && <p aria-busy="true">Loading channels…</p>}
        {state.status === 'error' && <Notice tone="error">{state.message}</Notice>}
        {state.status === 'ready' && state.channels.length === 0 && (
          <p className={styles.muted}>No channel yet. Create the first one below.</p>
        )}
        {state.status === 'ready' && state.channels.length > 0 && (
          <ul className={styles.list}>
            {state.channels.map((channel) => (
              <ChannelRow key={channel.id} channel={channel} onJoin={(id) => void join(id)} />
            ))}
          </ul>
        )}
      </Card>
      <Card title="Create a channel">
        <form className={styles.inlineForm} onSubmit={(event) => void create(event)}>
          <TextField
            label="Channel name"
            name="channel_name"
            required
            minLength={2}
            maxLength={32}
            pattern="[a-z0-9\-]{2,32}"
            hint="2–32 characters: lowercase letters, digits or dash."
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button type="submit">Create</Button>
        </form>
      </Card>
    </>
  );
}
