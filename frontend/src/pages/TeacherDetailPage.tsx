import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarOff, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { Daily, TeacherPreferences, Teachers } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import type { Absence, Day, MasterTimetableEntry, PreferenceLevel, TeacherPreference } from '../types';
import { WeekGrid } from '../components/WeekGrid';
import { TeacherModal } from '../components/TeacherModal';
import { EmptyState } from '../components/EmptyState';

export default function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const rd = useRefData();
  const [entries, setEntries] = useState<MasterTimetableEntry[]>([]);
  const [workload, setWorkload] = useState<any>(null);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState<TeacherPreference[]>([]);

  const load = () => {
    if (!id) return;
    Teachers.masterTimetable(id).then(setEntries);
    Teachers.workload(id).then(setWorkload);
    Daily.absences({ teacherId: id }).then(setAbsences);
    TeacherPreferences.get(id).then(setPreferences);
  };
  useEffect(load, [id]);

  const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const nextLevel = (current: PreferenceLevel | null): PreferenceLevel | null =>
    current === null ? 'PREFERRED' : current === 'PREFERRED' ? 'AVOID' : null;

  const togglePreference = async (day: Day, periodId: string) => {
    if (!id) return;
    const existing = preferences.find((p) => p.day === day && p.periodId === periodId);
    const next = nextLevel(existing?.preference ?? null);
    const withoutThis = preferences.filter((p) => !(p.day === day && p.periodId === periodId));
    const updatedList = next ? [...withoutThis, { day, periodId, preference: next }] : withoutThis;
    setPreferences(updatedList.map((p, i) => ({ id: `local-${i}`, teacherId: id, ...p })));
    await TeacherPreferences.set(id, updatedList.map((p) => ({ day: p.day, periodId: p.periodId, preference: p.preference })));
  };

  const teacher = rd.teachers.find((t) => t.id === id);
  if (!teacher) return <EmptyState>Loading teacher profile…</EmptyState>;

  const toggleActive = async () => {
    setBusy(true);
    await Teachers.update(teacher.id, { active: !teacher.active });
    rd.refresh();
    setBusy(false);
  };

  const remove = async () => {
    if (!confirm(`Delete ${teacher.name}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await Teachers.remove(teacher.id);
      rd.refresh();
      navigate('/teachers');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to delete teacher');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <p><Link to="/teachers" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ArrowLeft size={13} strokeWidth={2.25} /> Teachers</Link></p>
          <h1>
            {teacher.name}{' '}
            {teacher.active ? <span className="badge green">Active</span> : <span className="badge gray">Inactive</span>}
          </h1>
          <p>{teacher.employeeNo} · {teacher.email} · {teacher.phone}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowEdit(true)}><Pencil size={13} strokeWidth={2.25} /> Edit Profile</button>
          <button onClick={toggleActive} disabled={busy}>
            {teacher.active ? <PowerOff size={13} strokeWidth={2.25} /> : <Power size={13} strokeWidth={2.25} />}
            {teacher.active ? 'Deactivate' : 'Activate'}
          </button>
          <button className="danger" onClick={remove} disabled={busy}><Trash2 size={13} strokeWidth={2.25} /> Delete</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Allocation</h3>
          <p><strong>Subjects:</strong> {teacher.subjectIds.map((s) => rd.subjectName(s)).join(', ') || '—'}</p>
          <p><strong>Grades:</strong> {teacher.gradeIds.map((g) => rd.gradeName(g)).join(', ') || '—'}</p>
          <p><strong>Classes:</strong> {teacher.classIds.length ? teacher.classIds.map((c) => rd.className(c)).join(', ') : 'Grade-wide (all classes in assigned grades)'}</p>
          <p><strong>Availability limits:</strong> max {teacher.maxPeriodsPerDay}/day, {teacher.maxPeriodsPerWeek}/week, {teacher.maxConsecutivePeriods} consecutive periods.</p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Workload</h3>
          {workload && (
            <>
              <p style={{ fontSize: 24, fontWeight: 700 }}>
                {workload.totalPeriodsPerWeek} <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 400 }}>/ {workload.maxPeriodsPerWeek} periods/week</span>
              </p>
              {workload.overWeeklyLimit && <span className="badge red">Over weekly limit</span>}
              {!workload.overWeeklyLimit && <span className="badge green">Within limit</span>}
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Weekly Master Timetable</h3>
        <WeekGrid entries={entries} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Scheduling Preferences</h3>
        <p style={{ marginTop: -6, marginBottom: 12, fontSize: 12.5, color: 'var(--text-dim)' }}>
          Click a period to cycle Neutral → Preferred → Avoid. Used as a soft bias by Generate Timetable.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th></th>
                {DAYS.map((d) => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...new Set(rd.timeSlots.filter((s) => s.day === 'MON').map((s) => s.label))].map((label) => (
                <tr key={label}>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{label}</td>
                  {DAYS.map((day) => {
                    const slot = rd.timeSlots.find((s) => s.day === day && s.label === label);
                    if (!slot) return <td key={day}></td>;
                    const pref = preferences.find((p) => p.day === day && p.periodId === slot.id)?.preference ?? null;
                    return (
                      <td key={day}>
                        <button
                          onClick={() => togglePreference(day, slot.id)}
                          className={pref === 'PREFERRED' ? 'badge green' : pref === 'AVOID' ? 'badge red' : 'badge gray'}
                          style={{ width: '100%', border: 'none', cursor: 'pointer' }}
                        >
                          {pref === 'PREFERRED' ? 'Preferred' : pref === 'AVOID' ? 'Avoid' : '—'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Absence History</h3>
        {absences.length === 0 ? (
          <EmptyState icon={CalendarOff}>No absences recorded.</EmptyState>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>
              {absences.map((a) => (
                <tr key={a.id}>
                  <td>{a.date}</td>
                  <td>{a.wholeDay ? 'Whole Day' : `${a.periodIds.length} period(s)`}</td>
                  <td>{a.reason}</td>
                  <td>
                    <span className={`badge ${a.status === 'APPROVED' ? 'green' : a.status === 'REJECTED' ? 'red' : 'yellow'}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEdit && (
        <TeacherModal
          teacher={teacher}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); rd.refresh(); load(); }}
        />
      )}
    </div>
  );
}
