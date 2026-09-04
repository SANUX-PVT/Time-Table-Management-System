import { useEffect, useState } from 'react';
import { Layers, Plus, Trash2, Sparkles } from 'lucide-react';
import { Groups, Timetable } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { EmptyState } from '../components/EmptyState';
import type { Day, StudentGroup } from '../types';

const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

export default function GroupsPage() {
  const rd = useRefData();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [memberClassIds, setMemberClassIds] = useState<string[]>([]);

  const [schedulingGroup, setSchedulingGroup] = useState<StudentGroup | null>(null);
  const [day, setDay] = useState<Day>('MON');
  const [periodId, setPeriodId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const load = () => { Groups.list().then(setGroups); };
  useEffect(load, []);

  const toggleClass = (id: string) => setMemberClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const create = async () => {
    if (!name || !subjectId || memberClassIds.length < 2) {
      alert('Name, subject and at least two member classes are required.');
      return;
    }
    await Groups.create({ name, subjectId, memberClassIds });
    setName(''); setSubjectId(''); setMemberClassIds([]);
    load();
  };

  const remove = async (id: string) => {
    try {
      await Groups.remove(id);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to delete');
    }
  };

  const dayPeriods = rd.timeSlots.filter((s) => s.day === day).sort((a, b) => a.order - b.order);

  const scheduleLesson = async () => {
    if (!schedulingGroup || !periodId || !teacherId) return;
    try {
      await Timetable.createGroupLesson({ day, periodId, groupId: schedulingGroup.id, teacherId });
      alert(`Group lesson scheduled for ${schedulingGroup.name} on ${day}.`);
      setSchedulingGroup(null);
      setPeriodId(''); setTeacherId('');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to schedule group lesson');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Student Groups</h1>
          <p>Cross-class cohorts (e.g. students from two classes combined for one subject) that can be scheduled as a single shared lesson.</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>New Group</h3>
          <div className="form-row"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Combined Additional Maths" /></div>
          <div className="form-row">
            <label>Subject</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Select subject…</option>
              {rd.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Member Classes (pick 2 or more)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rd.classes.map((c) => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500 }}>
                  <input type="checkbox" checked={memberClassIds.includes(c.id)} onChange={() => toggleClass(c.id)} /> {c.name}
                </label>
              ))}
            </div>
          </div>
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="primary" onClick={create}><Plus size={14} strokeWidth={2.25} /> Create Group</button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>All Groups</h3>
          {groups.length === 0 ? (
            <EmptyState icon={Layers}>No student groups yet.</EmptyState>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groups.map((g) => (
                <div key={g.id} className="candidate-row" style={{ marginBottom: 0 }}>
                  <div>
                    <div className="name">{g.name}</div>
                    <div className="tags">
                      <span className="badge blue">{rd.subjectName(g.subjectId)}</span>
                      {g.memberClassIds.map((cid) => <span key={cid} className="badge gray">{rd.className(cid)}</span>)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setSchedulingGroup(g)}><Sparkles size={13} strokeWidth={2.25} /> Schedule</button>
                    <button className="danger" onClick={() => remove(g.id)}><Trash2 size={13} strokeWidth={2.25} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {schedulingGroup && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <h3 style={{ marginTop: 0 }}>Schedule "{schedulingGroup.name}"</h3>
              <div className="form-row" style={{ flexDirection: 'row', gap: 10 }}>
                <select value={day} onChange={(e) => { setDay(e.target.value as Day); setPeriodId(''); }}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
                  <option value="">Period…</option>
                  {dayPeriods.map((s) => <option key={s.id} value={s.id}>{s.label} ({s.start}–{s.end})</option>)}
                </select>
                <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                  <option value="">Teacher…</option>
                  {rd.teachers.filter((t) => t.active && t.subjectIds.includes(schedulingGroup.subjectId)).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
                <button onClick={() => setSchedulingGroup(null)}>Cancel</button>
                <button className="primary" onClick={scheduleLesson} disabled={!periodId || !teacherId}>Schedule Lesson</button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                Every member class must be free at this period — if any already has a lesson scheduled, choose a different slot or free it up first in Master Timetable.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
