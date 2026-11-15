import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { ApiContext } from '../hooks/useApi';
import { navigate, useLocation } from '../hooks/useRoute';
import type { Route } from '../hooks/useRoute';
import type { WhatsUpApi } from '../types/api';
import AppShell from './AppShell';
import AdminScreen from './screens/admin/AdminScreen';
import ChannelsScreen from './screens/channels/ChannelsScreen';
import ChatScreen from './screens/chat/ChatScreen';
import LoginScreen from './screens/login/LoginScreen';
import NotFoundScreen from './screens/notfound/NotFoundScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import RegisterScreen from './screens/register/RegisterScreen';
import StatusScreen from './screens/status/StatusScreen';

const PUBLIC_ROUTES: ReadonlySet<Route['name']> = new Set(['login', 'register', 'status', 'not_found']);
const GUEST_ONLY_ROUTES: ReadonlySet<Route['name']> = new Set(['login', 'register', 'home']);

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to]);
  return null;
}

function Screen({ route, search }: { route: Route; search: URLSearchParams }) {
  switch (route.name) {
    case 'login':
      return <LoginScreen search={search} />;
    case 'register':
      return <RegisterScreen />;
    case 'channels':
      return <ChannelsScreen />;
    case 'chat':
      return <ChatScreen key={route.channelId} channelId={route.channelId} />;
    case 'profile':
      return <ProfileScreen />;
    case 'admin':
      return <AdminScreen />;
    case 'status':
      return <StatusScreen />;
    case 'home':
    case 'not_found':
      return <NotFoundScreen />;
  }
}

/** Route guard for the user experience only; the API re-checks every request (SR-AC-04). */
function Router() {
  const { route, search } = useLocation();
  const { state } = useAuth();

  if (state.status === 'loading') {
    return <p aria-busy="true">Loading WhatsUp…</p>;
  }

  const signedIn = state.status === 'authenticated';
  if (signedIn && GUEST_ONLY_ROUTES.has(route.name)) {
    return <Redirect to="/channels" />;
  }
  if (!signedIn && !PUBLIC_ROUTES.has(route.name)) {
    return <Redirect to="/login" />;
  }

  return (
    <AppShell route={route}>
      <Screen route={route} search={search} />
    </AppShell>
  );
}

export default function App({ api }: { api: WhatsUpApi }) {
  return (
    <ApiContext.Provider value={api}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ApiContext.Provider>
  );
}
