import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Link from '../components/Link';
import { useAuth } from '../features/auth/AuthContext';
import { useApi } from '../hooks/useApi';
import type { Route } from '../hooks/useRoute';
import styles from './AppShell.module.css';

interface AppShellProps {
  route: Route;
  children: ReactNode;
}

const ROUTE_TITLES: Record<Route['name'], string> = {
  home: 'WhatsUp',
  login: 'Sign in',
  register: 'Create an account',
  channels: 'Channels',
  chat: 'Chat',
  profile: 'Profile',
  admin: 'Administration',
  status: 'System status',
  not_found: 'Page not found',
};

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link to={to} className={styles.navLink} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  );
}

/** Page frame: header + navigation. Hiding a link is UX only — the API enforces roles. */
export default function AppShell({ route, children }: AppShellProps) {
  const api = useApi();
  const { state, logout } = useAuth();
  const mainRef = useRef<HTMLElement>(null);
  const user = state.status === 'authenticated' ? state.user : null;
  const section = route.name === 'chat' ? 'channels' : route.name;

  useEffect(() => {
    document.title = `${ROUTE_TITLES[route.name]} · WhatsUp`;
    mainRef.current?.focus();
  }, [route.name]);

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link to={user ? '/channels' : '/login'} className={styles.brand}>
          WhatsUp
        </Link>
        {api.mode === 'mock' && <Badge tone="brand">Mock mode</Badge>}
        <nav aria-label="Main" className={styles.nav}>
          {user && (
            <>
              <NavLink to="/channels" active={section === 'channels'}>
                Channels
              </NavLink>
              <NavLink to="/profile" active={section === 'profile'}>
                Profile
              </NavLink>
              {user.role === 'org_admin' && (
                <NavLink to="/admin" active={section === 'admin'}>
                  Admin
                </NavLink>
              )}
            </>
          )}
          <NavLink to="/status" active={section === 'status'}>
            Status
          </NavLink>
        </nav>
        {user && (
          <div className={styles.user}>
            <Avatar name={user.display_name} src={user.avatar_url} />
            <span className={styles.userName} data-testid="current-user">
              {user.display_name}
            </span>
            <Button variant="ghost" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        )}
      </header>
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
  );
}
