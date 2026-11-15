import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Notice from '../../../components/Notice';
import { useAuth, useCurrentUser } from '../../../features/auth/AuthContext';
import { useApi } from '../../../hooks/useApi';
import { ROLES } from '../../../types/api';
import type { AuditEvent, Role, User } from '../../../types/api';
import { ROLE_LABELS } from '../../../utils/roles';
import styles from '../screens.module.css';

type Load<T> = { status: 'loading' } | { status: 'ready'; items: T[] } | { status: 'error'; message: string };

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function UserRow({ user, self, onSave }: { user: User; self: boolean; onSave(id: number, role: Role): void }) {
  const [role, setRole] = useState<Role>(user.role);
  return (
    <tr data-testid="admin-user">
      <td>{user.username}</td>
      <td>{user.display_name}</td>
      <td>
        <label className="visually-hidden" htmlFor={`role-${user.id}`}>
          Role of {user.username}
        </label>
        <select
          id={`role-${user.id}`}
          value={role}
          disabled={self}
          onChange={(event) => setRole(event.target.value as Role)}
        >
          {ROLES.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <Button variant="ghost" disabled={self || role === user.role} onClick={() => onSave(user.id, role)}>
          Save
        </Button>
      </td>
    </tr>
  );
}

/** Visible to org admins only — and every call is re-checked by the back-office (SR-AC-04). */
export default function AdminScreen() {
  const api = useApi();
  const currentUser = useCurrentUser();
  const { handleError } = useAuth();
  const [users, setUsers] = useState<Load<User>>({ status: 'loading' });
  const [events, setEvents] = useState<Load<AuditEvent>>({ status: 'loading' });
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setUsers({ status: 'ready', items: await api.admin.listUsers() });
    } catch (error) {
      setUsers({ status: 'error', message: handleError(error) });
    }
  }, [api, handleError]);

  const loadEvents = useCallback(async () => {
    try {
      setEvents({ status: 'ready', items: await api.admin.listAuditEvents() });
    } catch (error) {
      setEvents({ status: 'error', message: handleError(error) });
    }
  }, [api, handleError]);

  const isAdmin = currentUser.role === 'org_admin';

  useEffect(() => {
    if (!isAdmin) return;
    void loadUsers();
    void loadEvents();
  }, [isAdmin, loadUsers, loadEvents]);

  async function saveRole(userId: number, role: Role) {
    setFeedback(null);
    try {
      const updated = await api.admin.setRole(userId, role);
      setFeedback({ tone: 'success', text: `${updated.username} is now ${ROLE_LABELS[updated.role]}.` });
      await Promise.all([loadUsers(), loadEvents()]);
    } catch (error) {
      setFeedback({ tone: 'error', text: handleError(error) });
    }
  }

  if (!isAdmin) {
    return <Notice tone="error">This page is reserved for organisation IT admins.</Notice>;
  }

  return (
    <>
      <h1>Administration</h1>
      {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
      <Card title="Users and roles">
        {users.status === 'loading' && <p aria-busy="true">Loading users…</p>}
        {users.status === 'error' && <Notice tone="error">{users.message}</Notice>}
        {users.status === 'ready' && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Username</th>
                  <th scope="col">Display name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.items.map((user) => (
                  <UserRow
                    key={`${user.id}-${user.role}`}
                    user={user}
                    self={user.id === currentUser.id}
                    onSave={(id, role) => void saveRole(id, role)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title="Security audit events">
        <p>
          <Button variant="ghost" onClick={() => void loadEvents()}>
            Refresh
          </Button>
        </p>
        {events.status === 'loading' && <p aria-busy="true">Loading events…</p>}
        {events.status === 'error' && <Notice tone="error">{events.message}</Notice>}
        {events.status === 'ready' && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Event</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Source IP</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.items.map((event) => (
                  <tr key={event.id} data-testid="audit-event">
                    <td>{formatDateTime(event.timestamp)}</td>
                    <td>{event.event_type}</td>
                    <td>{event.actor_username ?? '—'}</td>
                    <td>{event.source_ip}</td>
                    <td>{event.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
