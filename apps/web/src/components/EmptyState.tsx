import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface Props {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, children, action }: Props) {
  return (
    <div className={styles.root}>
      <span className={styles.icon}>
        <Icon size={22} aria-hidden="true" />
      </span>
      <h2 className={styles.title}>{title}</h2>
      {children && <p className={styles.text}>{children}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
