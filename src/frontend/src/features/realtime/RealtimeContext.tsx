import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useApi } from '../../hooks/useApi';
import { ApiError } from '../../services/apiError';
import type { RealtimeEvent, RealtimeStatus } from '../../types/api';
import { useAuth } from '../auth/AuthContext';

type Listener = (event: RealtimeEvent) => void;

interface RealtimeContextValue {
  status: RealtimeStatus;
  subscribe(listener: Listener): () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: 'offline',
  subscribe: () => () => undefined,
});

/** One live connection per signed-in session (FE-04). Screens subscribe to its events. */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const { state, handleError } = useAuth();
  const userId = state.status === 'authenticated' ? state.user.id : null;
  const [status, setStatus] = useState<RealtimeStatus>('offline');
  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    if (userId === null) {
      setStatus('offline');
      return;
    }
    const close = api.realtime.connect({
      onEvent: (event) => listeners.current.forEach((listener) => listener(event)),
      onStatus: setStatus,
      onUnauthorized: () => {
        handleError(new ApiError('unauthenticated'));
      },
    });
    return close;
  }, [api, userId, handleError]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo(() => ({ status, subscribe }), [status, subscribe]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}
