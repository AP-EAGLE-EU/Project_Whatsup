import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Link from '../../../components/Link';
import Notice from '../../../components/Notice';
import TextField from '../../../components/TextField';
import { useApi } from '../../../hooks/useApi';
import { navigate } from '../../../hooks/useRoute';
import { errorMessage } from '../../../services/apiError';
import styles from '../screens.module.css';

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

export default function RegisterScreen() {
  const api = useApi();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirmation.length > 0 && confirmation !== password;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD || password !== confirmation) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.auth.register({
        username: username.trim().toLowerCase(),
        display_name: displayName.trim(),
        password,
      });
      // Registration never signs in by itself: the user logs in, which creates a fresh session.
      navigate('/login?registered=1', { replace: true });
    } catch (registerError) {
      setError(errorMessage(registerError));
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.narrow}>
      <h1>Create an account</h1>
      <Card>
        <form onSubmit={(event) => void submit(event)} aria-label="Create an account">
          {error && <Notice tone="error">{error}</Notice>}
          <TextField
            label="Username"
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_.\-]{3,32}"
            hint="3–32 characters: letters, digits, dot, dash or underscore."
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <TextField
            label="Display name"
            name="display_name"
            autoComplete="name"
            required
            maxLength={64}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            maxLength={MAX_PASSWORD}
            hint="At least 8 characters. Long passphrases are welcome."
            error={passwordTooShort ? 'The password must contain at least 8 characters.' : null}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <TextField
            label="Confirm password"
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            required
            maxLength={MAX_PASSWORD}
            error={mismatch ? 'The passwords do not match.' : null}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <Button type="submit" disabled={submitting || passwordTooShort || mismatch}>
            {submitting ? 'Creating…' : 'Create account'}
          </Button>
        </form>
      </Card>
      <p>
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
