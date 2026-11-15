import type { ReactNode } from 'react';
import styles from './ui.module.css';

type Tone = 'info' | 'success' | 'warning' | 'error';

interface NoticeProps {
  tone?: Tone;
  children: ReactNode;
}

/** Inline status message. Errors are announced immediately to screen readers. */
export default function Notice({ tone = 'info', children }: NoticeProps) {
  return (
    <div
      className={`${styles.notice} ${styles[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
      data-tone={tone}
    >
      <p>{children}</p>
    </div>
  );
}
