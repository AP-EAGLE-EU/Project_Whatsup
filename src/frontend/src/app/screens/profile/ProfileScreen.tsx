import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Avatar from '../../../components/Avatar';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Notice from '../../../components/Notice';
import TextField from '../../../components/TextField';
import { useAuth, useCurrentUser } from '../../../features/auth/AuthContext';
import { useApi } from '../../../hooks/useApi';
import { ROLE_LABELS } from '../../../utils/roles';
import styles from '../screens.module.css';

const AVATAR_MAX_BYTES = 1024 * 1024;
const AVATAR_TYPES = ['image/png', 'image/jpeg'];

type Feedback = { tone: 'success' | 'error'; text: string } | null;

export default function ProfileScreen() {
  const api = useApi();
  const user = useCurrentUser();
  const { replaceUser, handleError } = useAuth();
  const [displayName, setDisplayName] = useState(user.display_name);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      replaceUser(await api.profile.update(displayName.trim()));
      setFeedback({ tone: 'success', text: 'Display name saved.' });
    } catch (error) {
      setFeedback({ tone: 'error', text: handleError(error) });
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(event: FormEvent) {
    event.preventDefault();
    const file = fileInput.current?.files?.[0];
    setFeedback(null);
    if (file === undefined) {
      setFeedback({ tone: 'error', text: 'Choose a PNG or JPEG image first.' });
      return;
    }
    // Usability pre-check only; the back-office checks type, content and size again (SR-FILE-01).
    if (!AVATAR_TYPES.includes(file.type) || file.size > AVATAR_MAX_BYTES) {
      setFeedback({ tone: 'error', text: 'Avatars must be PNG or JPEG images of 1 MB or less.' });
      return;
    }
    setSaving(true);
    try {
      replaceUser(await api.profile.uploadAvatar(file));
      setFeedback({ tone: 'success', text: 'Avatar updated.' });
      if (fileInput.current !== null) fileInput.current.value = '';
    } catch (error) {
      setFeedback({ tone: 'error', text: handleError(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>Profile</h1>
      {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
      <Card>
        <div className={styles.profileHead}>
          <Avatar name={user.display_name} src={user.avatar_url} size="large" />
          <dl className={styles.facts}>
            <dt>Username</dt>
            <dd>{user.username}</dd>
            <dt>Organisation</dt>
            <dd>{user.organisation.name}</dd>
            <dt>Role</dt>
            <dd data-testid="profile-role">{ROLE_LABELS[user.role]}</dd>
          </dl>
        </div>
        <p className={styles.muted}>Your role and organisation are managed by your IT admin.</p>
      </Card>
      <Card title="Display name">
        <form className={styles.inlineForm} onSubmit={(event) => void saveName(event)}>
          <TextField
            label="Display name"
            name="display_name"
            required
            maxLength={64}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <Button type="submit" disabled={saving}>
            Save
          </Button>
        </form>
      </Card>
      <Card title="Avatar">
        <form className={styles.inlineForm} onSubmit={(event) => void uploadAvatar(event)}>
          <div>
            <label htmlFor="avatar-file">PNG or JPEG, 1 MB maximum</label>
            <br />
            <input id="avatar-file" ref={fileInput} type="file" accept="image/png,image/jpeg" />
          </div>
          <Button type="submit" disabled={saving}>
            Upload
          </Button>
        </form>
      </Card>
    </>
  );
}
