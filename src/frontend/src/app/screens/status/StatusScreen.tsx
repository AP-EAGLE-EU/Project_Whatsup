import { useEffect, useState } from 'react';
import Badge from '../../../components/Badge';
import Card from '../../../components/Card';
import { useAuth } from '../../../features/auth/AuthContext';
import GreetingPanel from '../../../features/greetings/GreetingPanel';
import { useRealtime } from '../../../features/realtime/RealtimeContext';
import { useApi } from '../../../hooks/useApi';
import { errorMessage } from '../../../services/apiError';
import styles from '../screens.module.css';

/** Public diagnostics page: shows what the front can reach on the back-office today. */
export default function StatusScreen() {
  const api = useApi();
  const { state } = useAuth();
  const { status: liveStatus } = useRealtime();
  const [health, setHealth] = useState<string>('Checking…');

  useEffect(() => {
    let active = true;
    api.system
      .health()
      .then((status) => {
        if (active) setHealth(status);
      })
      .catch((error: unknown) => {
        if (active) setHealth(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [api]);

  const authLabel =
    state.status === 'loading'
      ? 'Checking…'
      : state.status === 'anonymous' && !state.authAvailable
        ? 'Not available yet (story B1)'
        : 'Available';

  return (
    <>
      <h1>System status</h1>
      <Card title="Connection">
        <dl className={styles.statusList}>
          <dt>API mode</dt>
          <dd data-testid="api-mode">
            {api.mode === 'mock' ? <Badge tone="brand">mock</Badge> : <Badge>live</Badge>}
          </dd>
          <dt>Back-office health (/api/health)</dt>
          <dd data-testid="health">{health}</dd>
          <dt>Authentication endpoints (/api/auth)</dt>
          <dd data-testid="auth-availability">{authLabel}</dd>
          <dt>Live updates (WebSocket /api/ws)</dt>
          <dd data-testid="realtime-status">
            {state.status === 'authenticated' ? liveStatus : 'Sign in to connect'}
          </dd>
        </dl>
      </Card>
      <Card title="Database greeting (/api/greetings/hello)">
        <p>Fetch a greeting from the database to check the full chain browser → nginx → FastAPI → MySQL.</p>
        <GreetingPanel />
      </Card>
    </>
  );
}
