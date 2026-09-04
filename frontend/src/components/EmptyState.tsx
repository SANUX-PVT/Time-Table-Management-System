import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

export function EmptyState({ icon: Icon = Inbox, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <Icon size={22} strokeWidth={1.6} style={{ opacity: 0.55 }} />
      <span>{children}</span>
    </div>
  );
}
