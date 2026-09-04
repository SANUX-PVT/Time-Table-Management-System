import { useEffect, useState } from 'react';
import { BookMarked, DoorOpen, Layers, ListChecks, Plus, Power, PowerOff, Save, Trash2 } from 'lucide-react';
import { Academic, Syllabus } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { colorFor } from '../utils/colors';
import { EmptyState } from '../components/EmptyState';
import type { Room, SchoolClass, Subject, SyllabusItem } from '../types';

type Tab = 'grades' | 'classes' | 'subjects' | 'gradeSubjects' | 'rooms' | 'syllabus';

const TAB_ICON: Record<Tab, any> = {
  grades: Layers,
  classes: Layers,
  subjects: ListChecks,
  gradeSubjects: ListChecks,
  rooms: DoorOpen,
  syllabus: BookMarked,
};

export default function AcademicPage() {
  const [tab, setTab] = useState<Tab>('grades');
  const rd = useRefData();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Academic Structure</h1>
          <p>Grades, classes, subjects, subject allocation and rooms.</p>
        </div>
      </div>

      <div className="tabs">
        {(['grades', 'classes', 'subjects', 'gradeSubjects', 'rooms', 'syllabus'] as Tab[]).map((t) => {
          const Icon = TAB_ICON[t];
          return (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon size={14} strokeWidth={2.25} />
              {{ grades: 'Grades', classes: 'Classes', subjects: 'Subjects', gradeSubjects: 'Subject Allocation', rooms: 'Rooms', syllabus: 'Syllabus / Pacing Guide' }[t]}
            </div>
          );
        })}
      </div>

      {tab === 'grades' && <GradesTab />}
      {tab === 'classes' && <ClassesTab />}
      {tab === 'subjects' && <SubjectsTab />}
      {tab === 'gradeSubjects' && <GradeSubjectsTab />}
      {tab === 'rooms' && <RoomsTab />}
      {tab === 'syllabus' && <SyllabusTab />}
      {rd.loading && <EmptyState>Loading…</EmptyState>}
    </div>
  );
}

function GradesTab() {
  const rd = useRefData();
  const [name, setName] = useState('');

  const add = async () => {
    if (!name.trim()) return;
    await Academic.createGrade({ name, order: rd.grades.length + 1, active: true });
    setName('');
    rd.refresh();
  };

  const toggle = async (id: string, active: boolean) => {
    await Academic.updateGrade(id, { active: !active });
    rd.refresh();
  };

  const rename = async (id: string, name: string) => {
    await Academic.updateGrade(id, { name });
    rd.refresh();
  };

  const setHead = async (id: string, headTeacherId: string) => {
    await Academic.updateGrade(id, { headTeacherId: headTeacherId || undefined });
    rd.refresh();
  };

  const remove = async (id: string, name: string) => {
    if (rd.classes.some((c) => c.gradeId === id)) {
      alert('Cannot delete: this grade still has classes. Remove or reassign its classes first.');
      return;
    }
    if (!confirm(`Delete grade "${name}"?`)) return;
    await Academic.deleteGrade(id);
    rd.refresh();
  };

  return (
    <div className="card">
      <div className="toolbar">
        <input placeholder="New grade name (e.g. Grade 12)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary" onClick={add}><Plus size={14} strokeWidth={2.5} /> Add Grade</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Classes</th><th>Grade Head</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rd.grades.sort((a, b) => a.order - b.order).map((g) => (
            <tr key={g.id}>
              <td><input value={g.name} onChange={(e) => rename(g.id, e.target.value)} style={{ width: 140 }} /></td>
              <td>{rd.classes.filter((c) => c.gradeId === g.id).length}</td>
              <td>
                <select value={g.headTeacherId ?? ''} onChange={(e) => setHead(g.id, e.target.value)}>
                  <option value="">— none —</option>
                  {rd.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </td>
              <td>{g.active ? <span className="badge green">Active</span> : <span className="badge gray">Inactive</span>}</td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => toggle(g.id, g.active)}>
                    {g.active ? <PowerOff size={13} strokeWidth={2.25} /> : <Power size={13} strokeWidth={2.25} />}
                    {g.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="danger" onClick={() => remove(g.id, g.name)}><Trash2 size={13} strokeWidth={2.25} /> Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClassesTab() {
  const rd = useRefData();
  const [name, setName] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [drafts, setDrafts] = useState<SchoolClass[]>(rd.classes);

  useEffect(() => { setDrafts(rd.classes); }, [rd.classes]);

  const add = async () => {
    if (!name.trim() || !gradeId) return;
    await Academic.createClass({ name, gradeId, studentCount: 0 });
    setName('');
    rd.refresh();
  };

  const patch = (id: string, p: Partial<SchoolClass>) => {
    setDrafts((prev) => prev.map((c) => (c.id === id ? { ...c, ...p } : c)));
  };

  const save = async (c: SchoolClass) => {
    await Academic.updateClass(c.id, {
      classTeacherId: c.classTeacherId || undefined,
      roomId: c.roomId || undefined,
      studentCount: c.studentCount,
    });
    rd.refresh();
  };

  const remove = async (c: SchoolClass) => {
    if (!confirm(`Delete class "${c.name}"?`)) return;
    await Academic.deleteClass(c.id);
    rd.refresh();
  };

  return (
    <div className="card">
      <div className="toolbar">
        <select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
          <option value="">Select grade…</option>
          {rd.grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input placeholder="Class name (e.g. 12-A)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary" onClick={add}><Plus size={14} strokeWidth={2.5} /> Add Class</button>
      </div>
      <table>
        <thead><tr><th>Class</th><th>Grade</th><th>Class Teacher</th><th>Room</th><th>Students</th><th></th></tr></thead>
        <tbody>
          {drafts.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{rd.gradeName(c.gradeId)}</td>
              <td>
                <select value={c.classTeacherId ?? ''} onChange={(e) => patch(c.id, { classTeacherId: e.target.value })}>
                  <option value="">— none —</option>
                  {rd.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </td>
              <td>
                <select value={c.roomId ?? ''} onChange={(e) => patch(c.id, { roomId: e.target.value })}>
                  <option value="">— none —</option>
                  {rd.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  style={{ width: 60 }}
                  value={c.studentCount}
                  onChange={(e) => patch(c.id, { studentCount: Number(e.target.value) })}
                />
              </td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="primary" onClick={() => save(c)}><Save size={13} strokeWidth={2.25} /> Save</button>
                  <button className="danger" onClick={() => remove(c)}><Trash2 size={13} strokeWidth={2.25} /> Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubjectsTab() {
  const rd = useRefData();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [requiresSpecialRoom, setRequiresSpecialRoom] = useState(false);
  const [allowConsecutive, setAllowConsecutive] = useState(false);
  const [drafts, setDrafts] = useState<Subject[]>(rd.subjects);

  useEffect(() => { setDrafts(rd.subjects); }, [rd.subjects]);

  const add = async () => {
    if (!name.trim() || !code.trim()) return;
    await Academic.createSubject({ name, code: code.toUpperCase(), requiresSpecialRoom, allowConsecutive });
    setName(''); setCode(''); setRequiresSpecialRoom(false); setAllowConsecutive(false);
    rd.refresh();
  };

  const patch = (id: string, p: Partial<Subject>) => {
    setDrafts((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));
  };

  const save = async (s: Subject) => {
    await Academic.updateSubject(s.id, { name: s.name, requiresSpecialRoom: s.requiresSpecialRoom, allowConsecutive: s.allowConsecutive });
    rd.refresh();
  };

  const remove = async (s: Subject) => {
    if (rd.gradeSubjects.some((g) => g.subjectId === s.id)) {
      alert('Cannot delete: this subject is still allocated to a grade. Remove it from Subject Allocation first.');
      return;
    }
    if (!confirm(`Delete subject "${s.name}"?`)) return;
    await Academic.deleteSubject(s.id);
    rd.refresh();
  };

  return (
    <div className="card">
      <div className="toolbar">
        <input placeholder="Subject name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Code" style={{ width: 90 }} value={code} onChange={(e) => setCode(e.target.value)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
          <input type="checkbox" checked={requiresSpecialRoom} onChange={(e) => setRequiresSpecialRoom(e.target.checked)} /> Special room
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
          <input type="checkbox" checked={allowConsecutive} onChange={(e) => setAllowConsecutive(e.target.checked)} /> Consecutive OK
        </label>
        <button className="primary" onClick={add}><Plus size={14} strokeWidth={2.5} /> Add Subject</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Code</th><th>Special Room</th><th>Consecutive Allowed</th><th></th></tr></thead>
        <tbody>
          {drafts.map((s) => {
            const c = colorFor(s.id);
            return (
              <tr key={s.id}>
                <td><input value={s.name} onChange={(e) => patch(s.id, { name: e.target.value })} style={{ width: 140 }} /></td>
                <td><span className="badge" style={{ background: c.bg, color: c.fg }}>{s.code}</span></td>
                <td>
                  <input type="checkbox" checked={s.requiresSpecialRoom} onChange={(e) => patch(s.id, { requiresSpecialRoom: e.target.checked })} />
                </td>
                <td>
                  <input type="checkbox" checked={s.allowConsecutive} onChange={(e) => patch(s.id, { allowConsecutive: e.target.checked })} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="primary" onClick={() => save(s)}><Save size={13} strokeWidth={2.25} /> Save</button>
                    <button className="danger" onClick={() => remove(s)}><Trash2 size={13} strokeWidth={2.25} /> Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GradeSubjectsTab() {
  const rd = useRefData();
  const [gradeId, setGradeId] = useState(rd.grades[0]?.id ?? '');
  const effectiveGradeId = gradeId || rd.grades[0]?.id;
  const configs = rd.gradeSubjects.filter((g) => g.gradeId === effectiveGradeId);
  const unassignedSubjects = rd.subjects.filter((s) => !configs.some((c) => c.subjectId === s.id));
  const [newSubjectId, setNewSubjectId] = useState('');

  const update = async (id: string, patch: { periodsPerWeek?: number; maxPeriodsPerDay?: number }) => {
    await Academic.updateGradeSubject(id, patch);
    rd.refresh();
  };

  const remove = async (id: string) => {
    await Academic.deleteGradeSubject(id);
    rd.refresh();
  };

  const addToGrade = async () => {
    if (!newSubjectId) return;
    await Academic.createGradeSubject({ gradeId: effectiveGradeId, subjectId: newSubjectId, periodsPerWeek: 2, maxPeriodsPerDay: 1 });
    setNewSubjectId('');
    rd.refresh();
  };

  return (
    <div className="card">
      <div className="toolbar">
        <select value={effectiveGradeId} onChange={(e) => setGradeId(e.target.value)}>
          {rd.grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <table>
        <thead><tr><th>Subject</th><th>Periods / Week</th><th>Max / Day</th><th></th></tr></thead>
        <tbody>
          {configs.map((c) => (
            <tr key={c.id}>
              <td>{rd.subjectName(c.subjectId)}</td>
              <td>
                <input
                  type="number"
                  style={{ width: 60 }}
                  value={c.periodsPerWeek}
                  onChange={(e) => update(c.id, { periodsPerWeek: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="number"
                  style={{ width: 60 }}
                  value={c.maxPeriodsPerDay}
                  onChange={(e) => update(c.id, { maxPeriodsPerDay: Number(e.target.value) })}
                />
              </td>
              <td><button className="danger" onClick={() => remove(c.id)}><Trash2 size={13} strokeWidth={2.25} /> Remove</button></td>
            </tr>
          ))}
          {unassignedSubjects.length > 0 && (
            <tr>
              <td>
                <select value={newSubjectId} onChange={(e) => setNewSubjectId(e.target.value)}>
                  <option value="">Select subject to add…</option>
                  {unassignedSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </td>
              <td colSpan={2} style={{ color: 'var(--text-dim)' }}>defaults to 2/week, 1/day</td>
              <td><button className="primary" onClick={addToGrade}><Plus size={13} strokeWidth={2.5} /> Add</button></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SyllabusTab() {
  const rd = useRefData();
  const [gradeId, setGradeId] = useState(rd.grades[0]?.id ?? '');
  const effectiveGradeId = gradeId || rd.grades[0]?.id;
  const configs = rd.gradeSubjects.filter((g) => g.gradeId === effectiveGradeId);
  const [subjectConfigId, setSubjectConfigId] = useState('');
  const effectiveConfigId = subjectConfigId || configs[0]?.id || '';

  const [items, setItems] = useState<SyllabusItem[]>([]);
  const [title, setTitle] = useState('');
  const [targetWeek, setTargetWeek] = useState(1);

  useEffect(() => { if (effectiveConfigId) Syllabus.list(effectiveConfigId).then(setItems); else setItems([]); }, [effectiveConfigId]);

  const add = async () => {
    if (!title.trim() || !effectiveConfigId) return;
    await Syllabus.create({ gradeSubjectConfigId: effectiveConfigId, title, targetWeek });
    setTitle('');
    Syllabus.list(effectiveConfigId).then(setItems);
  };

  const remove = async (id: string) => {
    await Syllabus.remove(id);
    Syllabus.list(effectiveConfigId).then(setItems);
  };

  return (
    <div className="card">
      <div className="toolbar">
        <select value={effectiveGradeId} onChange={(e) => { setGradeId(e.target.value); setSubjectConfigId(''); }}>
          {rd.grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={effectiveConfigId} onChange={(e) => setSubjectConfigId(e.target.value)}>
          {configs.map((c) => <option key={c.id} value={c.id}>{rd.subjectName(c.subjectId)}</option>)}
        </select>
      </div>
      {!effectiveConfigId ? (
        <EmptyState>This grade has no subjects allocated yet — add some under Subject Allocation first.</EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <input placeholder="Syllabus item (e.g. Chapter 4 — Fractions)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1 }} />
            <input type="number" style={{ width: 90 }} value={targetWeek} onChange={(e) => setTargetWeek(Number(e.target.value))} title="Target week" />
            <button className="primary" onClick={add}><Plus size={14} strokeWidth={2.5} /> Add</button>
          </div>
          {items.length === 0 ? (
            <EmptyState icon={BookMarked}>No pacing guide items yet for this subject.</EmptyState>
          ) : (
            <table>
              <thead><tr><th>Item</th><th>Target Week</th><th></th></tr></thead>
              <tbody>
                {items.sort((a, b) => a.targetWeek - b.targetWeek).map((i) => (
                  <tr key={i.id}>
                    <td>{i.title}</td>
                    <td>{i.targetWeek}</td>
                    <td><button className="danger" onClick={() => remove(i.id)}><Trash2 size={13} strokeWidth={2.25} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

function RoomsTab() {
  const rd = useRefData();
  const [name, setName] = useState('');
  const [type, setType] = useState<'CLASSROOM' | 'LAB' | 'HALL' | 'SPECIAL'>('CLASSROOM');
  const [capacity, setCapacity] = useState(30);
  const [drafts, setDrafts] = useState<Room[]>(rd.rooms);

  useEffect(() => { setDrafts(rd.rooms); }, [rd.rooms]);

  const add = async () => {
    if (!name.trim()) return;
    await Academic.createRoom({ name, type, capacity });
    setName('');
    rd.refresh();
  };

  const patch = (id: string, p: Partial<Room>) => {
    setDrafts((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
  };

  const save = async (r: Room) => {
    await Academic.updateRoom(r.id, { name: r.name, type: r.type, capacity: r.capacity });
    rd.refresh();
  };

  const remove = async (r: Room) => {
    if (rd.classes.some((c) => c.roomId === r.id)) {
      alert('Cannot delete: this room is still assigned as a homeroom for a class.');
      return;
    }
    if (!confirm(`Delete room "${r.name}"?`)) return;
    await Academic.deleteRoom(r.id);
    rd.refresh();
  };

  return (
    <div className="card">
      <div className="toolbar">
        <input placeholder="Room name" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="CLASSROOM">Classroom</option>
          <option value="LAB">Lab</option>
          <option value="HALL">Hall</option>
          <option value="SPECIAL">Special</option>
        </select>
        <input type="number" style={{ width: 80 }} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        <button className="primary" onClick={add}><Plus size={14} strokeWidth={2.5} /> Add Room</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Capacity</th><th></th></tr></thead>
        <tbody>
          {drafts.map((r) => (
            <tr key={r.id}>
              <td><input value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} style={{ width: 130 }} /></td>
              <td>
                <select value={r.type} onChange={(e) => patch(r.id, { type: e.target.value as Room['type'] })}>
                  <option value="CLASSROOM">Classroom</option>
                  <option value="LAB">Lab</option>
                  <option value="HALL">Hall</option>
                  <option value="SPECIAL">Special</option>
                </select>
              </td>
              <td><input type="number" style={{ width: 70 }} value={r.capacity} onChange={(e) => patch(r.id, { capacity: Number(e.target.value) })} /></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="primary" onClick={() => save(r)}><Save size={13} strokeWidth={2.25} /> Save</button>
                  <button className="danger" onClick={() => remove(r)}><Trash2 size={13} strokeWidth={2.25} /> Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
