import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { errorMessage } from '../../services/apiError';
import styles from './GreetingPanel.module.css';

type GreetingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

/** Team scaffold feature (commit 0e5302d), now reading through the shared API layer. */
export default function GreetingPanel() {
  const api = useApi();
  const [state, setState] = useState<GreetingState>({ status: 'idle' });
  const isLoading = state.status === 'loading';

  async function loadGreeting() {
    setState({ status: 'loading' });

    try {
      const message = await api.system.greeting();
      setState({ status: 'success', message });
    } catch (error) {
      setState({ status: 'error', message: errorMessage(error) });
    }
  }

  return (
    <>
      <button
        className={styles.button}
        type="button"
        onClick={() => void loadGreeting()}
        disabled={isLoading}
      >
        {isLoading ? 'Fetching…' : 'Fetch hello'}
      </button>
      <div className={styles.result} role="status" aria-live="polite" aria-busy={isLoading}>
        {state.status === 'success' && (
          <p className={styles.greeting} data-testid="greeting">
            {state.message}
          </p>
        )}
        {state.status === 'error' && <p className={styles.error}>{state.message}</p>}
      </div>
    </>
  );
}
