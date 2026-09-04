import { useEffect, useState } from 'react';
import { BookOpenCheck, CalendarClock } from 'lucide-react';
import { LessonPlans, Timetable } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRefData } from '../context/RefDataContext';
import { WeekGrid } from '../components/WeekGrid';
import { EmptyState } from '../components/EmptyState';
import type { LessonPlan, MasterTimetableEntry } from '../types';

export default function ParentTimetablePage() {
  const { currentUser } = useAuth();
  const rd = useRefData();
  const classId = currentUser?.classId;

  const [entries, setEntries] = useState<MasterTimetableEntry[]>([]);
  const [plans, setPlans] = useState<LessonPlan[]>([]);

  useEffect(() => {
    if (!classId) return;
    Timetable.master({ classId }).then(setEntries);
    LessonPlans.list({ classId }).then(setPlans);
  }, [classId]);

  if (!classId) {
    return <EmptyState>This account isn't linked to a class.</EmptyState>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{rd.className(classId)} — Timetable</h1>
          <p>Your child's weekly timetable and recent lesson topics.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><CalendarClock size={16} strokeWidth={2.25} /> Weekly Timetable</h3>
        <WeekGrid entries={entries} />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><BookOpenCheck size={16} strokeWidth={2.25} /> Recent Lesson Topics</h3>
        {plans.length === 0 ? (
          <EmptyState>No lesson topics recorded yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plans.map((p) => (
              <div key={p.id} className="candidate-row" style={{ marginBottom: 0 }}>
                <div>
                  <div className="name">{p.topic}</div>
                  <div className="tags">
                    <span className="badge gray">{p.date}</span>
                    <span className="badge blue">{rd.subjectName(p.subjectId)}</span>
                    {p.homework && <span className="badge yellow">Homework: {p.homework}</span>}
                  </div>
                </div>
                <span className={`badge ${p.status === 'COMPLETED' ? 'green' : 'gray'}`}>{p.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
