import type { PublicUser } from '@eaternity/shared';
import { useToast } from '@eaternity/ui';
import { ChevronDown, LogOut, ReceiptText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useStore } from '../store/StoreContext';
import styles from './AccountMenu.module.css';

export function AccountMenu({ user }: { user: PublicUser }) {
  const { signOut } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const firstName = user.name.split(' ')[0] ?? user.name;

  return (
    <div className={styles.root} ref={ref}>
      <button
        type="button"
        className={`btn btn-ghost ${styles.trigger}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className={styles.name}>{firstName}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.identity}>
            <p className={styles.identityName}>{user.name}</p>
            <p className={styles.identityEmail}>{user.email}</p>
          </div>
          <Link to="/myorders" role="menuitem" className={styles.item} onClick={() => setOpen(false)}>
            <ReceiptText size={16} aria-hidden="true" />
            My orders
          </Link>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => {
              setOpen(false);
              signOut();
              toast.success('You have been signed out');
              navigate('/');
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
