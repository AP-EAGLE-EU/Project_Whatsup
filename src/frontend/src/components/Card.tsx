import type { ReactNode } from 'react';
import styles from './ui.module.css';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className }: CardProps) {
  return (
    <section className={[styles.card, className].filter(Boolean).join(' ')}>
      {title && <h2 className={styles.cardTitle}>{title}</h2>}
      {children}
    </section>
  );
}
