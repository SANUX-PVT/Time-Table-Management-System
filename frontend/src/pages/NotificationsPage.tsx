import { useEffect, useState } from 'react';
import { BellOff, Check } from 'lucide-react';
import { Notifications } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { EmptyState } from '../components/EmptyState';
import type { NotificationItem } from '../types';

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const [list, setList] = useState<NotificationItem[]>([]);

  const load = () => Notifications.list(currentUser?.role).then(setList);
  useEffect(() => { load(); }, [currentUser?.role]);

  const markRead = async (id: string) => {
    await Notifications.markRead(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Alerts relevant to your role — absences, relief assignments, and timetable changes.</p>
        </div>
      </div>

      <div className="card">
        {list.length === 0 ? (
          <EmptyState icon={BellOff}>No notifications.</EmptyState>
        ) : (
          <div className="alert-list">
            {list.map((n) => (
              <div key={n.id} className="candidate-row" style={{ opacity: n.read ? 0.55 : 1 }}>
                <div>
                  <div className="name">{n.message}</div>
                  <div className="tags">
                    <span className="badge gray">{n.category}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                {!n.read && <button onClick={() => markRead(n.id)}><Check size={13} strokeWidth={2.5} /> Mark read</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
