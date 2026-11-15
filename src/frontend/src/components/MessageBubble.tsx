import type { ReactNode } from 'react';
import Avatar from './Avatar';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  authorName: string;
  authorAvatar: string | null;
  body: string;
  createdAt: string;
  own: boolean;
  children?: ReactNode;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Design-system MessageBubble: own messages right/primary, others left/white.
 * The body is rendered as a React text node — never as HTML (SR-VAL-02).
 */
export default function MessageBubble({
  authorName,
  authorAvatar,
  body,
  createdAt,
  own,
  children,
}: MessageBubbleProps) {
  return (
    <li className={`${styles.row} ${own ? styles.own : styles.other}`} data-testid="message">
      {!own && <Avatar name={authorName} src={authorAvatar} />}
      <div className={styles.bubble}>
        <p className={styles.meta}>
          <span className={styles.author}>{own ? 'You' : authorName}</span>{' '}
          <time dateTime={createdAt}>{formatTime(createdAt)}</time>
        </p>
        <p className={styles.body} data-testid="message-body">
          {body}
        </p>
        {children}
      </div>
    </li>
  );
}
