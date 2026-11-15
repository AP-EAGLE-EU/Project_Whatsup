import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useApi } from '../../hooks/useApi';
import { navigate } from '../../hooks/useRoute';
import { errorMessage, isApiError } from '../../services/apiError';
import type { User } from '../../types/api';

// The session itself lives in an HttpOnly cookie owned by the back-office.
// The front only remembers *who* is signed in, never a token (SR-SESS, SR-FE-01).
export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous'; authAvailable: boolean }
  | { status: 'authenticated'; user: User };

interface AuthContextValue {
  state: AuthState;
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  replaceUser(user: User): void;
  /** Turns an API error into a message; an expired session sends the user to sign in. */
  handleError(error: unknown): string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    api.auth
      .me()
      .then((user) => {
        if (active) setState({ status: 'authenticated', user });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'anonymous', authAvailable: !isApiError(error, 'not_available') });
      });
    return () => {
      active = false;
    };
  }, [api]);

  const login = useCallback(
    async (username: string, password: string) => {
      const user = await api.auth.login(username, password);
      setState({ status: 'authenticated', user });
    },
    [api],
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      // Forget the user locally even if the server call failed.
      setState({ status: 'anonymous', authAvailable: true });
      navigate('/login', { replace: true });
    }
  }, [api]);

  const replaceUser = useCallback((user: User) => {
    setState({ status: 'authenticated', user });
  }, []);

  const handleError = useCallback((error: unknown) => {
    if (isApiError(error, 'unauthenticated')) {
      setState({ status: 'anonymous', authAvailable: true });
      navigate('/login?expired=1', { replace: true });
    }
    return errorMessage(error);
  }, []);

  const value = useMemo(
    () => ({ state, login, logout, replaceUser, handleError }),
    [state, login, logout, replaceUser, handleError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}

/** For screens that only render once signed in (the router guarantees it). */
export function useCurrentUser(): User {
  const { state } = useAuth();
  if (state.status !== 'authenticated') {
    throw new Error('useCurrentUser requires an authenticated session.');
  }
  return state.user;
}
