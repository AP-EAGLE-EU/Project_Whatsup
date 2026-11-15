import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import Notice from '../../../components/Notice';
import { useAuth, useCurrentUser } from '../../../features/auth/AuthContext';
import { useApi } from '../../../hooks/useApi';
import { ROLES } from '../../../types/api';
import type { AuditEvent, MessageReport, Role, User } from '../../../types/api';
import { formatDateTime } from '../../../utils/format';
import { ROLE_LABELS } from '../../../utils/roles';
import styles from '../screens.module.css';

type Load<T> = { status: 'loading' } | { status: 'ready'; items: T[] } | { status: 'error'; message: string };

/** Loading / error / empty / table — the same four states for every admin list (FE-06). */
function ListState<T>({
  load,
  noun,
  emptyText,
  children,
}: {
  load: Load<T>;
  noun: string;
  emptyText: string;
  children(items: T[]): ReactNode;
}) {
  if (load.status === 'loading') return <p aria-busy="true">Loading {noun}…</p>;
  if (load.status === 'error') return <Notice tone="error">{load.message}</Notice>;
  if (load.items.length === 0) {
    return (
      <p className={styles.muted} data-testid={`empty-${noun}`}>
        {emptyText}
      </p>
    );
  }
  return <div className={styles.tableWrap}>{children(load.items)}</div>;
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

/** Visible to org admins only — and every call is re-checked by the back-office (SR-AC-04, FE-06/FE-07). */
export default function AdminScreen() {
  const api = useApi();
  const currentUser = useCurrentUser();
  const { handleError } = useAuth();
  const [users, setUsers] = useState<Load<User>>({ status: 'loading' });
  const [events, setEvents] = useState<Load<AuditEvent>>({ status: 'loading' });
  const [reports, setReports] = useState<Load<MessageReport>>({ status: 'loading' });
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const isAdmin = currentUser.role === 'org_admin';

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

  const loadReports = useCallback(async () => {
    try {
      setReports({ status: 'ready', items: await api.admin.listReports() });
    } catch (error) {
      setReports({ status: 'error', message: handleError(error) });
    }
  }, [api, handleError]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadUsers();
    void loadReports();
    void loadEvents();
  }, [isAdmin, loadUsers, loadReports, loadEvents]);

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
        <ListState load={users} noun="users" emptyText="No user in this organisation.">
          {(items) => (
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
                {items.map((user) => (
                  <UserRow
                    key={`${user.id}-${user.role}`}
                    user={user}
                    self={user.id === currentUser.id}
                    onSave={(id, role) => void saveRole(id, role)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </ListState>
      </Card>
      <Card title="Reported messages">
        <p>
          <Button variant="ghost" onClick={() => void loadReports()}>
            Refresh reports
          </Button>
        </p>
        <ListState load={reports} noun="reports" emptyText="No reported message. Good news.">
          {(items) => (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Reported</th>
                  <th scope="col">Conversation</th>
                  <th scope="col">Reporter</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Message</th>
                </tr>
              </thead>
              <tbody>
                {items.map((report) => (
                  <tr key={report.id} data-testid="report">
                    <td>{formatDateTime(report.created_at)}</td>
                    <td>{report.conversation_name}</td>
                    <td>{report.reporter_username}</td>
                    <td>{report.reason}</td>
                    <td>{report.message_body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ListState>
      </Card>
      <Card title="Security audit events">
        <p>
          <Button variant="ghost" onClick={() => void loadEvents()}>
            Refresh events
          </Button>
        </p>
        <ListState load={events} noun="events" emptyText="No audit event yet.">
          {(items) => (
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
                {items.map((event) => (
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
          )}
        </ListState>
      </Card>
    </>
  );
}
