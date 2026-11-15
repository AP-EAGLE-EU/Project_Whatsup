import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigate } from '../hooks/useRoute';

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
}

/** Internal link: client-side navigation, but still a real <a href> for keyboard and new tabs. */
export default function Link({ to, onClick, ...rest }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (event.defaultPrevented || event.button !== 0 || modified) {
      return;
    }
    event.preventDefault();
    navigate(to);
  }

  return <a href={to} onClick={handleClick} {...rest} />;
}
