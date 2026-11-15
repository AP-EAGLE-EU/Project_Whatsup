import { useCallback, useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Notice from '../../components/Notice';
import uiStyles from '../../components/ui.module.css';
import { useApi } from '../../hooks/useApi';
import type { Conversation, DirectoryUser, Member } from '../../types/api';
import { useAuth } from '../auth/AuthContext';
import { useRealtime } from '../realtime/RealtimeContext';
import styles from './chat.module.css';

interface MembersPanelProps {
  conversation: Conversation;
  currentUserId: number;
}

type Feedback = { tone: 'success' | 'error'; text: string } | null;

/**
 * FE-06: everyone sees who is in the conversation; group managers (can_manage, computed by
 * the server) also get add/remove controls. The API re-checks every change (BE-08).
 */
export default function MembersPanel({ conversation, currentUserId }: MembersPanelProps) {
  const api = useApi();
  const { handleError } = useAuth();
  const { subscribe } = useRealtime();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const selectId = useId();

  const loadMembers = useCallback(async () => {
    try {
      setMembers(await api.conversations.members(conversation.id));
    } catch (error) {
      setFeedback({ tone: 'error', text: handleError(error) });
    }
  }, [api, conversation.id, handleError]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(
    () =>
      subscribe((event) => {
        if (event.type === 'conversation.updated' && event.conversation_id === conversation.id) {
          void loadMembers();
        }
      }),
    [subscribe, conversation.id, loadMembers],
  );

  useEffect(() => {
    if (!conversation.can_manage) return;
    let active = true;
    api.users
      .directory()
      .then((users) => {
        if (active) setDirectory(users);
      })
      .catch((error: unknown) => {
        if (active) setFeedback({ tone: 'error', text: handleError(error) });
      });
    return () => {
      active = false;
    };
  }, [api, conversation.can_manage, handleError]);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (selected === '') return;
    setFeedback(null);
    try {
      const updated = await api.conversations.addMember(conversation.id, Number(selected));
      setMembers(updated);
      const added = updated.find((member) => member.id === Number(selected));
      setFeedback({ tone: 'success', text: `${added?.display_name ?? 'The user'} was added.` });
      setSelected('');
    } catch (error) {
      setFeedback({ tone: 'error', text: handleError(error) });
    }
  }

  async function remove(member: Member) {
    setFeedback(null);
    try {
      await api.conversations.removeMember(conversation.id, member.id);
      setMembers((current) => current?.filter((entry) => entry.id !== member.id) ?? null);
      setFeedback({ tone: 'success', text: `${member.display_name} was removed.` });
    } catch (error) {
      setFeedback({ tone: 'error', text: handleError(error) });
    }
  }

  const memberIds = new Set(members?.map((member) => member.id) ?? []);
  const candidates = directory.filter((user) => !memberIds.has(user.id));

  return (
    <Card title={`Members (${members?.length ?? conversation.member_count})`} className={styles.members}>
      {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
      {members === null ? (
        <p aria-busy="true">Loading members…</p>
      ) : (
        <ul className={styles.memberList}>
          {members.map((member) => (
            <li key={member.id} className={styles.memberRow} data-testid="member">
              <Avatar name={member.display_name} src={member.avatar_url} />
              <span className={styles.memberName}>
                {member.display_name}
                {member.id === currentUserId && ' (you)'}
              </span>
              {member.is_manager && <Badge>Manager</Badge>}
              {conversation.can_manage && member.id !== currentUserId && (
                <Button variant="ghost" onClick={() => void remove(member)} aria-label={`Remove ${member.display_name}`}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {conversation.can_manage && (
        <form className={styles.addMember} onSubmit={(event) => void add(event)}>
          <label className={uiStyles.label} htmlFor={selectId}>
            Add a member
          </label>
          <select
            id={selectId}
            className={uiStyles.input}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Choose a colleague…</option>
            {candidates.map((user) => (
              <option key={user.id} value={user.id}>
                {user.display_name} ({user.username})
              </option>
            ))}
          </select>
          <Button type="submit" disabled={selected === ''}>
            Add
          </Button>
          {candidates.length === 0 && directory.length > 0 && (
            <span className={uiStyles.hint}>Everyone in your organisation is already a member.</span>
          )}
        </form>
      )}
    </Card>
  );
}
