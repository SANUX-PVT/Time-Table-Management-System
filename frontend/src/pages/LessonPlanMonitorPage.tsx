import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, BookMarked, CheckCircle2, ClipboardList, NotebookPen } from 'lucide-react';
import { LessonPlans, Syllabus } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { EmptyState } from '../components/EmptyState';
import { StatTile } from '../components/StatTile';
import type { LessonPlan, LessonPlanStatus, LessonPlanSummaryRow } from '../types';

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

export default function LessonPlanMonitorPage() {
  const rd = useRefData();
  const [teacherId, setTeacherId] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<LessonPlanStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [summary, setSummary] = useState<LessonPlanSummaryRow[]>([]);
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [coverage, setCoverage] = useState<{ className: string; subjectName: string; total: number; completed: number; coveragePercent: number; behindTarget: boolean }[]>([]);

  useEffect(() => {
    LessonPlans.summary({ from: from || undefined, to: to || undefined }).then(setSummary);
  }, [from, to]);

  useEffect(() => {
    const pairs = rd.classes.flatMap((c) => rd.gradeSubjects.filter((g) => g.gradeId === c.gradeId).map((g) => ({ c, g })));
    Promise.all(
      pairs.map(({ c, g }) =>
        Syllabus.coverage(c.id, g.subjectId).then((cov) => ({
          className: c.name,
          subjectName: rd.subjectName(g.subjectId),
          ...cov,
        })),
      ),
    ).then((rows) => setCoverage(rows.filter((r) => r.total > 0)));
  }, [rd.classes, rd.gradeSubjects]);

  useEffect(() => {
    LessonPlans.list({
      teacherId: teacherId || undefined,
      classId: classId || undefined,
      status: status || undefined,
      from: from || undefined,
      to: to || undefined,
    }).then(setPlans);
  }, [teacherId, classId, status, from, to]);

  const totalPlans = summary.reduce((s, r) => s + r.total, 0);
  const totalCompleted = summary.reduce((s, r) => s + r.completed, 0);
  const totalOverdue = summary.reduce((s, r) => s + r.overdue, 0);
  const avgCompletion = totalPlans ? Math.round((totalCompleted / totalPlans) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Lesson Plan Monitor</h1>
          <p>Track every teacher's lesson plans and how their teaching progress compares against the schedule.</p>
        </div>
      </div>

      <div className="stat-row">
        <StatTile icon={NotebookPen} tone="blue" label="Total Lesson Plans" value={totalPlans} />
        <StatTile icon={CheckCircle2} tone="green" label="Completed" value={totalCompleted} />
        <StatTile icon={AlertTriangle} tone="red" label="Overdue" value={totalOverdue} valueColor={totalOverdue > 0 ? 'var(--red)' : undefined} />
        <StatTile icon={BarChart3} tone="blue" label="School-wide Completion Rate" value={`${avgCompletion}%`} />
      </div>

      {coverage.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}><BookMarked size={16} strokeWidth={2.25} /> Curriculum Coverage</h3>
          <table>
            <thead><tr><th>Class</th><th>Subject</th><th>Covered</th><th>Progress</th><th></th></tr></thead>
            <tbody>
              {coverage.map((c, i) => (
                <tr key={i}>
                  <td>{c.className}</td>
                  <td>{c.subjectName}</td>
                  <td>{c.completed}/{c.total}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--surface-soft)', overflow: 'hidden', minWidth: 60 }}>
                        <div style={{ width: `${c.coveragePercent}%`, height: '100%', background: 'var(--green)', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{c.coveragePercent}%</span>
                    </div>
                  </td>
                  <td>{c.behindTarget && <span className="badge yellow">Behind pace</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>By Teacher</h3>
        {summary.length === 0 ? (
          <EmptyState>No lesson plans recorded yet.</EmptyState>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Total</th>
                <th>Planned</th>
                <th>In Progress</th>
                <th>Completed</th>
                <th>Delayed</th>
                <th>Overdue</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((r) => (
                <tr key={r.teacherId}>
                  <td>{r.teacherName}</td>
                  <td>{r.total}</td>
                  <td>{r.planned}</td>
                  <td>{r.inProgress}</td>
                  <td>{r.completed}</td>
                  <td>{r.delayed}</td>
                  <td>{r.overdue > 0 ? <span className="badge red">{r.overdue}</span> : 0}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--surface-soft)', overflow: 'hidden', minWidth: 60 }}>
                        <div style={{ width: `${r.completionRate}%`, height: '100%', background: 'var(--green)', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{r.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ margin: 0 }}>All Lesson Plans</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">All teachers</option>
              {rd.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">All classes</option>
              {rd.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as LessonPlanStatus | '')}>
              <option value="">All statuses</option>
              {(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED'] as LessonPlanStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
          </div>
        </div>

        {plans.length === 0 ? (
          <EmptyState icon={ClipboardList}>No lesson plans match these filters.</EmptyState>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Teacher</th>
                <th>Class</th>
                <th>Subject</th>
                <th>Topic</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{rd.teacherName(p.teacherId)}</td>
                  <td>{rd.className(p.classId)}</td>
                  <td>{rd.subjectName(p.subjectId)}</td>
                  <td>{p.topic}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className={`badge ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                    {p.overdue && <span className="badge red">Overdue</span>}
                  </td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>{p.progressNotes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
