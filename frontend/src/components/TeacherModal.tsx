import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, UserPlus2, X } from 'lucide-react';
import { Teachers } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { backdropMotion, modalMotion } from '../utils/motion';
import type { Day, Teacher } from '../types';

const DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const DAY_LABEL: Record<Day, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };

export function TeacherModal({
  teacher,
  onClose,
  onSaved,
}: {
  teacher?: Teacher;
  onClose: () => void;
  onSaved: () => void;
}) {
  const rd = useRefData();
  const isEdit = !!teacher;
  const [name, setName] = useState(teacher?.name ?? '');
  const [email, setEmail] = useState(teacher?.email ?? '');
  const [phone, setPhone] = useState(teacher?.phone ?? '');
  const [employeeNo, setEmployeeNo] = useState(teacher?.employeeNo ?? '');
  const [subjectIds, setSubjectIds] = useState<Set<string>>(new Set(teacher?.subjectIds ?? []));
  const [gradeIds, setGradeIds] = useState<Set<string>>(new Set(teacher?.gradeIds ?? []));
  const [classIds, setClassIds] = useState<Set<string>>(new Set(teacher?.classIds ?? []));
  const [maxPeriodsPerDay, setMaxPeriodsPerDay] = useState(teacher?.maxPeriodsPerDay ?? 6);
  const [maxPeriodsPerWeek, setMaxPeriodsPerWeek] = useState(teacher?.maxPeriodsPerWeek ?? 26);
  const [maxConsecutivePeriods, setMaxConsecutivePeriods] = useState(teacher?.maxConsecutivePeriods ?? 3);
  const [unavailable, setUnavailable] = useState<{ day: Day; periodId: string }[]>(teacher?.unavailable ?? []);
  const [availDay, setAvailDay] = useState<Day>('MON');
  const [saving, setSaving] = useState(false);

  const dayLessonSlots = rd.timeSlots.filter((s) => s.day === availDay).sort((a, b) => a.order - b.order);

  const toggleUnavailable = (day: Day, periodId: string) => {
    setUnavailable((prev) => {
      const exists = prev.some((u) => u.day === day && u.periodId === periodId);
      return exists ? prev.filter((u) => !(u.day === day && u.periodId === periodId)) : [...prev, { day, periodId }];
    });
  };

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  const save = async () => {
    if (!name.trim() || !email.trim()) {
      alert('Name and email are required.');
      return;
    }
    setSaving(true);
    const body = {
      name,
      email,
      phone,
      employeeNo,
      subjectIds: Array.from(subjectIds),
      gradeIds: Array.from(gradeIds),
      classIds: Array.from(classIds),
      maxPeriodsPerDay,
      maxPeriodsPerWeek,
      maxConsecutivePeriods,
      unavailable,
    };
    try {
      if (isEdit) {
        await Teachers.update(teacher!.id, body);
      } else {
        await Teachers.create({ ...body, active: true });
      }
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...backdropMotion}>
      <motion.div className="modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()} {...modalMotion}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus2 size={18} strokeWidth={2.25} /> {isEdit ? `Edit Teacher — ${teacher!.name}` : 'New Teacher'}
        </h2>

        <div className="form-row" style={{ flexDirection: 'row', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)' }}>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)' }}>Employee No.</label>
            <input value={employeeNo} onChange={(e) => setEmployeeNo(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
          </div>
        </div>

        <div className="form-row" style={{ flexDirection: 'row', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)' }}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)' }}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
          </div>
        </div>

        <div className="form-row">
          <label>Subjects</label>
          <div className="pill-list">
            {rd.subjects.map((s) => (
              <span
                key={s.id}
                className={`badge ${subjectIds.has(s.id) ? 'blue' : 'gray'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => toggle(subjectIds, setSubjectIds, s.id)}
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label>Grades</label>
          <div className="pill-list">
            {rd.grades.map((g) => (
              <span
                key={g.id}
                className={`badge ${gradeIds.has(g.id) ? 'blue' : 'gray'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => toggle(gradeIds, setGradeIds, g.id)}
              >
                {g.name}
              </span>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label>Classes (leave empty for grade-wide access)</label>
          <div className="pill-list">
            {rd.classes.map((c) => (
              <span
                key={c.id}
                className={`badge ${classIds.has(c.id) ? 'blue' : 'gray'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => toggle(classIds, setClassIds, c.id)}
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>

        <div className="form-row" style={{ flexDirection: 'row', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)' }}>Max/Day</label>
            <input type="number" value={maxPeriodsPerDay} onChange={(e) => setMaxPeriodsPerDay(Number(e.target.value))} style={{ width: '100%', marginTop: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)' }}>Max/Week</label>
            <input type="number" value={maxPeriodsPerWeek} onChange={(e) => setMaxPeriodsPerWeek(Number(e.target.value))} style={{ width: '100%', marginTop: 4 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)' }}>Max Consecutive</label>
            <input type="number" value={maxConsecutivePeriods} onChange={(e) => setMaxConsecutivePeriods(Number(e.target.value))} style={{ width: '100%', marginTop: 4 }} />
          </div>
        </div>

        <div className="form-row">
          <label>Availability restrictions</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {DAYS.map((d) => (
              <span
                key={d}
                className={`badge ${availDay === d ? 'blue' : 'gray'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setAvailDay(d)}
              >
                {DAY_LABEL[d]}
              </span>
            ))}
          </div>
          <div className="pill-list" style={{ marginBottom: 8 }}>
            {dayLessonSlots.map((s) => {
              const active = unavailable.some((u) => u.day === availDay && u.periodId === s.id);
              return (
                <span
                  key={s.id}
                  className={`badge ${active ? 'red' : 'gray'}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleUnavailable(availDay, s.id)}
                >
                  {s.label}
                </span>
              );
            })}
          </div>
          {unavailable.length > 0 && (
            <div className="pill-list">
              {unavailable.map((u, i) => {
                const slot = rd.timeSlots.find((s) => s.id === u.periodId);
                return (
                  <span key={i} className="badge red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {DAY_LABEL[u.day]} · {slot?.label ?? '—'}
                    <X size={11} strokeWidth={2.5} style={{ cursor: 'pointer' }} onClick={() => toggleUnavailable(u.day, u.periodId)} />
                  </span>
                );
              })}
            </div>
          )}
          <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 6, marginBottom: 0 }}>
            Click a period above to mark it unavailable. This blocks scheduling and excludes them from relief-teacher search during those periods.
          </p>
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save} disabled={saving}>
            <Save size={14} strokeWidth={2.25} /> {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Teacher'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
