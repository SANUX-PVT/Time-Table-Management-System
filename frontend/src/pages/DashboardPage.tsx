import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, BookOpenCheck, CheckCircle2, ClipboardList, PartyPopper, Search, Sparkles, UserCheck, UserX } from 'lucide-react';
import { Dashboard } from '../api/client';
import type { DashboardSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatTile } from '../components/StatTile';
import { listItemMotion } from '../utils/motion';

const ALERT_ICON = { red: AlertCircle, yellow: AlertTriangle, green: CheckCircle2 };

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const { currentUser } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Dashboard.summary(today).then(setSummary);
  }, [today]);

  if (!summary) return <div className="empty-state">Loading dashboard…</div>;

  return (
    <div>
      <motion.div
        className="hero-banner"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          Welcome back, {currentUser?.name}
          <motion.span
            animate={{ rotate: [0, 14, -8, 14, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
            style={{ display: 'inline-flex' }}
          >
            <Sparkles size={20} strokeWidth={2} />
          </motion.span>
        </h1>
        <p>{new Date(today).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · Here's what's happening across the school today.</p>
      </motion.div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div>
          <div className="stat-row">
            <StatTile icon={UserCheck} tone="green" label="Teachers Present" value={summary.teachers.present} sub={`of ${summary.teachers.total} total`} />
            <StatTile icon={UserX} tone="red" label="Teachers Absent" value={summary.teachers.absent} valueColor="var(--red)" sub={`${summary.teachers.pending} pending approval`} />
            <StatTile icon={BookOpenCheck} tone="blue" label="Lessons Scheduled" value={summary.lessons.scheduled} sub={`${summary.lessons.completed} completed · ${summary.lessons.inProgress} in progress`} />
          </div>

          <div className="stat-row">
            <StatTile icon={Search} tone="yellow" label="Relief Required" value={summary.relief.required} />
            <StatTile icon={CheckCircle2} tone="green" label="Relief Assigned" value={summary.relief.assigned} valueColor="var(--green)" />
            <StatTile
              icon={ClipboardList}
              tone="red"
              label="Pending Assignments"
              value={summary.relief.pending}
              valueColor={summary.relief.pending > 0 ? 'var(--red)' : undefined}
            />
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Alerts</h3>
          {summary.alerts.length === 0 ? (
            <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <PartyPopper size={22} strokeWidth={1.75} />
              No alerts — everything looks good.
            </div>
          ) : (
            <div className="alert-list">
              {summary.alerts.map((a, i) => {
                const Icon = ALERT_ICON[a.level];
                return (
                  <motion.div key={i} className={`alert-item ${a.level}`} {...listItemMotion(i)}>
                    <Icon size={16} strokeWidth={2.25} style={{ flexShrink: 0 }} />
                    {a.message}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
