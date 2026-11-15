import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Link from '../../../components/Link';
import Notice from '../../../components/Notice';
import TextField from '../../../components/TextField';
import { useAuth } from '../../../features/auth/AuthContext';
import { useApi } from '../../../hooks/useApi';
import { navigate } from '../../../hooks/useRoute';
import { errorMessage } from '../../../services/apiError';
import styles from '../screens.module.css';

export default function LoginScreen({ search }: { search: URLSearchParams }) {
  const api = useApi();
  const { state, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const authUnavailable = state.status === 'anonymous' && !state.authAvailable;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate('/channels', { replace: true });
    } catch (loginError) {
      // One generic message whatever failed (SR-AUTH-03): the server's message is reused as-is.
      setError(errorMessage(loginError));
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.narrow}>
      <h1>Sign in</h1>
      {search.get('registered') === '1' && <Notice tone="success">Account created. You can sign in.</Notice>}
      {search.get('expired') === '1' && <Notice tone="warning">Your session has ended. Please sign in again.</Notice>}
      {authUnavailable && (
        <Notice tone="warning">
          The back-office does not provide sign-in yet (story B1). Use the mock demo or check System
          status.
        </Notice>
      )}
      {api.demoNotice && <Notice tone="info">{api.demoNotice}</Notice>}
      <Card>
        <form onSubmit={(event) => void submit(event)} aria-label="Sign in">
          {error && <Notice tone="error">{error}</Notice>}
          <TextField
            label="Username"
            name="username"
            autoComplete="username"
            required
            maxLength={32}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
      <p>
        No account yet? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}
