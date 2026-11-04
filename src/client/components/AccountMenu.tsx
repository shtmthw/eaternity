import { Link } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSignOut } from '../lib/session.ts';
import type { CurrentUser } from '../lib/types.ts';

const itemClass = 'block w-full rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100';

export function AccountMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const signOut = useSignOut();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className="btn btn-ghost btn-sm gap-1"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {user.name.split(' ')[0]}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-40 mt-2 w-60 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-900/5"
          onClick={() => setOpen(false)}
        >
          <div className="px-3 pt-2 pb-2.5">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-[13px] text-stone-500">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-stone-100" />
          <Link to="/orders" role="menuitem" className={itemClass}>
            Your orders
          </Link>
          {user.role === 'admin' && (
            <Link to="/admin" role="menuitem" className={itemClass}>
              Admin
            </Link>
          )}
          <button type="button" role="menuitem" className={itemClass} onClick={() => signOut.mutate()}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
