import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  ListTodo,
  NotebookPen,
  Pencil,
  PlayCircle,
  Plus,
} from 'lucide-react';
import { Assignments, LessonPlans, Teachers } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRefData } from '../context/RefDataContext';
import { colorFor } from '../utils/colors';
import { EmptyState } from '../components/EmptyState';
import { StatTile } from '../components/StatTile';
import { LessonPlanModal } from '../components/LessonPlanModal';
import type { Assignment, LessonPlan, LessonPlanStatus, MasterTimetableEntry } from '../types';

const STATUS_LABEL: Record<LessonPlanStatus, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  DELAYED: 'Delayed',
};
const STATUS_BADGE: Record<LessonPlanStatus, string> = {
  PLANNED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  DELAYED: 'red',
};
const FILTERS: { key: LessonPlanStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PLANNED', label: 'Planned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'DELAYED', label: 'Delayed' },
];

export default function LessonPlansPage() {
  const { currentUser } = useAuth();
  const rd = useRefData();
  const teacherId = currentUser?.teacherId;

  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<MasterTimetableEntry[]>([]);
  const [filter, setFilter] = useState<LessonPlanStatus | 'ALL'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LessonPlan | null>(null);

  const load = () => {
    if (!teacherId) return;
    LessonPlans.list({ teacherId }).then((list) => {
      setPlans(list);
      Promise.all(list.map((p) => Assignments.list({ lessonPlanId: p.id }))).then((lists) => setAssignments(lists.flat()));
    });
  };
  useEffect(load, [teacherId]);

  const addAssignment = async (planId: string) => {
    const description = prompt('Assignment description?');
    if (!description) return;
    const dueDate = prompt('Due date (YYYY-MM-DD)?', new Date().toISOString().slice(0, 10));
    if (!dueDate) return;
    await Assignments.create({ lessonPlanId: planId, description, dueDate });
    load();
  };
  const cycleAssignmentStatus = async (a: Assignment) => {
    const next = a.status === 'ASSIGNED' ? 'DUE' : a.status === 'DUE' ? 'DONE' : 'ASSIGNED';
    await Assignments.updateStatus(a.id, next);
    load();
  };
  useEffect(() => {
    if (!teacherId) return;
    Teachers.masterTimetable(teacherId).then(setWeeklyEntries);
  }, [teacherId]);

  if (!teacherId) {
    return (
      <EmptyState>
        This account isn't linked to a teacher profile, so there are no lesson plans to build here.
      </EmptyState>
    );
  }

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p: LessonPlan) => { setEditing(p); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);
  const saved = () => { setModalOpen(false); load(); };

  const setStatus = async (p: LessonPlan, status: LessonPlanStatus) => {
    await LessonPlans.updateStatus(p.id, { status, progressNotes: p.progressNotes });
    load();
  };

  const total = plans.length;
  const planned = plans.filter((p) => p.status === 'PLANNED').length;
  const inProgress = plans.filter((p) => p.status === 'IN_PROGRESS').length;
  const completed = plans.filter((p) => p.status === 'COMPLETED').length;
  const overdue = plans.filter((p) => p.overdue).length;

  const shown = filter === 'ALL' ? plans : plans.filter((p) => p.status === filter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Lesson Plans</h1>
          <p>Build lesson plans and allocate them to dates on your timetable so your progress can be monitored.</p>
        </div>
        <button className="primary" onClick={openNew}>
          <Plus size={14} strokeWidth={2.25} /> New Lesson Plan
        </button>
      </div>

      <div className="stat-row">
        <StatTile icon={NotebookPen} tone="blue" label="Total Plans" value={total} />
        <StatTile icon={Clock3} tone="blue" label="Planned" value={planned} />
        <StatTile icon={PlayCircle} tone="yellow" label="In Progress" value={inProgress} />
        <StatTile icon={CheckCircle2} tone="green" label="Completed" value={completed} />
        <StatTile icon={AlertTriangle} tone="red" label="Overdue" value={overdue} valueColor={overdue > 0 ? 'var(--red)' : undefined} />
      </div>

      <div className="tabs">
        {FILTERS.map((f) => (
          <div key={f.key} className={`tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </div>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card"><EmptyState icon={BookOpenCheck}>No lesson plans in this view yet.</EmptyState></div>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {shown.map((p) => {
            const tone = colorFor(p.subjectId);
            return (
              <div key={p.id} className="card" style={{ borderLeft: `4px solid ${tone.ring}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {p.topic}
                      <span className={`badge ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                      {p.overdue && <span className="badge red">Overdue</span>}
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 3 }}>
                      {p.date} · {rd.className(p.classId)} · {rd.subjectName(p.subjectId)}
                      {p.periodIds.length > 0 && (
                        <> · {p.periodIds.map((id) => rd.timeSlots.find((s) => s.id === id)?.label).filter(Boolean).join(', ')}</>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, marginTop: 8, color: 'var(--text)' }}>{p.objectives}</div>
                    {(p.resources || p.homework) && (
                      <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-dim)' }}>
                        {p.resources && <div>Resources: {p.resources}</div>}
                        {p.homework && <div>Homework: {p.homework}</div>}
                      </div>
                    )}
                    {p.progressNotes && (
                      <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        "{p.progressNotes}"
                      </div>
                    )}
                    {assignments.filter((a) => a.lessonPlanId === p.id).length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {assignments.filter((a) => a.lessonPlanId === p.id).map((a) => (
                          <div key={a.id} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => cycleAssignmentStatus(a)}
                              className={`badge ${a.status === 'DONE' ? 'green' : a.status === 'DUE' ? 'yellow' : 'gray'}`}
                              style={{ border: 'none', cursor: 'pointer' }}
                            >
                              {a.status}
                            </button>
                            {a.description} — due {a.dueDate}
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => addAssignment(p.id)} style={{ marginTop: 6, fontSize: 12 }}>
                      <ListTodo size={12} strokeWidth={2.25} /> Add Assignment
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                    <button onClick={() => openEdit(p)}><Pencil size={13} strokeWidth={2.25} /> Edit</button>
                    {p.status === 'PLANNED' && (
                      <button className="primary" onClick={() => setStatus(p, 'IN_PROGRESS')}>
                        <PlayCircle size={13} strokeWidth={2.25} /> Start
                      </button>
                    )}
                    {p.status === 'IN_PROGRESS' && (
                      <button className="primary" onClick={() => setStatus(p, 'COMPLETED')}>
                        <CheckCircle2 size={13} strokeWidth={2.25} /> Mark Complete
                      </button>
                    )}
                    {(p.status === 'PLANNED' || p.status === 'IN_PROGRESS') && (
                      <button onClick={() => setStatus(p, 'DELAYED')}>Mark Delayed</button>
                    )}
                    {p.status === 'DELAYED' && (
                      <button className="primary" onClick={() => setStatus(p, 'PLANNED')}>Re-plan</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <LessonPlanModal
          teacherId={teacherId}
          weeklyEntries={weeklyEntries}
          plan={editing}
          onClose={closeModal}
          onSaved={saved}
        />
      )}
    </div>
  );
}
