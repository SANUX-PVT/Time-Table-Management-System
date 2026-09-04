import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlarmClockOff, CalendarX2, CheckCheck, ClipboardList, RefreshCcw, Search, UserX } from 'lucide-react';
import { Daily, Dashboard } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { useAuth } from '../context/AuthContext';
import type { DailyTimetableEntry, DashboardSummary } from '../types';
import { ReliefModal } from '../components/ReliefModal';
import { StatTile } from '../components/StatTile';
import { listItemMotion } from '../utils/motion';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReliefDashboardPage() {
  const rd = useRefData();
  const { currentUser } = useAuth();
  const [date] = useState(todayStr());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pending, setPending] = useState<DailyTimetableEntry[]>([]);
  const [assigned, setAssigned] = useState<DailyTimetableEntry[]>([]);
  const [reliefFor, setReliefFor] = useState<string | null>(null);

  const load = () => {
    Dashboard.summary(date).then(setSummary);
    Daily.timetable({ date }).then((all) => {
      setPending(all.filter((e) => e.status === 'TEACHER_ABSENT'));
      setAssigned(all.filter((e) => e.isRelief));
    });
  };
  useEffect(load, [date]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Relief Dashboard</h1>
          <p>Live view of today's absences and relief coverage.</p>
        </div>
      </div>

      {summary && (
        <div className="stat-row">
          <StatTile icon={UserX} tone="red" label="Teachers Absent" value={summary.teachers.absent} />
          <StatTile icon={CalendarX2} tone="blue" label="Affected Lessons" value={summary.relief.required + summary.relief.assigned} />
          <StatTile icon={Search} tone="yellow" label="Relief Required" value={summary.relief.required} />
          <StatTile icon={CheckCheck} tone="green" label="Relief Assigned" value={summary.relief.assigned} valueColor="var(--green)" />
          <StatTile icon={ClipboardList} tone="red" label="Pending" value={summary.relief.pending} valueColor={summary.relief.pending > 0 ? 'var(--red)' : undefined} />
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlarmClockOff size={17} strokeWidth={2.25} color="var(--red)" /> Pending Relief Assignments
          </h3>
          {pending.length === 0 ? (
            <div className="empty-state">No pending relief needs right now.</div>
          ) : (
            <AnimatePresence initial={false}>
              {pending.map((e, i) => {
                const slot = rd.timeSlots.find((s) => s.id === e.periodId);
                return (
                  <motion.div
                    key={e.id}
                    className="candidate-row"
                    layout
                    {...listItemMotion(i)}
                    exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                  >
                    <div>
                      <div className="name">{rd.className(e.classId)} · {rd.subjectName(e.subjectId)}</div>
                      <div className="tags">
                        <span className="badge gray">{slot?.label}</span>
                        <span className="badge red">{rd.teacherName(e.originalTeacherId)} absent</span>
                      </div>
                    </div>
                    <button className="primary" onClick={() => setReliefFor(e.id)}><RefreshCcw size={13} strokeWidth={2.25} /> Assign Relief</button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCheck size={17} strokeWidth={2.25} color="var(--green)" /> Relief Assignments Completed
          </h3>
          {assigned.length === 0 ? (
            <div className="empty-state">No relief assignments completed yet.</div>
          ) : (
            <AnimatePresence initial={false}>
              {assigned.map((e, i) => {
                const slot = rd.timeSlots.find((s) => s.id === e.periodId);
                return (
                  <motion.div key={e.id} className="candidate-row" layout {...listItemMotion(i)}>
                    <div>
                      <div className="name">{rd.className(e.classId)} · {rd.subjectName(e.subjectId)}</div>
                      <div className="tags">
                        <span className="badge gray">{slot?.label}</span>
                        <span className="badge green">{rd.teacherName(e.teacherId)} covering</span>
                      </div>
                    </div>
                    <span className={`badge ${e.status === 'COMPLETED' ? 'gray' : 'blue'}`}>{e.status.replace(/_/g, ' ')}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {reliefFor && currentUser && (
        <ReliefModal
          dailyEntryId={reliefFor}
          actorName={currentUser.name}
          onClose={() => setReliefFor(null)}
          onAssigned={() => { setReliefFor(null); load(); }}
        />
      )}
    </div>
  );
}
