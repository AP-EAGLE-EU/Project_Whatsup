import { isSafeImageSrc } from '../utils/guards';
import styles from './ui.module.css';

interface AvatarProps {
  name: string;
  src: string | null;
  size?: 'small' | 'large';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join('') || '?';
}

export default function Avatar({ name, src, size = 'small' }: AvatarProps) {
  const sizeClass = size === 'large' ? styles.avatarLarge : styles.avatarSmall;
  return (
    <span className={`${styles.avatar} ${sizeClass}`} aria-hidden="true">
      {isSafeImageSrc(src) ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}
