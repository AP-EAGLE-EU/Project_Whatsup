import type { ReactNode } from 'react';
import styles from './ui.module.css';

type Tone = 'neutral' | 'brand' | 'danger';

const TONE_CLASS: Record<Tone, string | undefined> = {
  neutral: undefined,
  brand: styles.badgeBrand,
  danger: styles.badgeDanger,
};

export default function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={[styles.badge, TONE_CLASS[tone]].filter(Boolean).join(' ')}>{children}</span>;
}
