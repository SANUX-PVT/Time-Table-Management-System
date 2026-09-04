import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Save, Trash2 } from 'lucide-react';
import { Timetable } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { backdropMotion, modalMotion } from '../utils/motion';
import type { Day, MasterTimetableEntry, SlotType, TimeSlot } from '../types';

const TYPE_OPTIONS: { value: SlotType; label: string }[] = [
  { value: 'LESSON', label: 'Lesson' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'BREAK', label: 'Break' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'ASSEMBLY', label: 'Assembly' },
];

export function MasterEntryModal({
  classId,
  day,
  slot,
  entry,
  onClose,
  onSaved,
}: {
  classId: string;
  day: Day;
  slot: TimeSlot;
  entry: MasterTimetableEntry | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const rd = useRefData();
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const canPublishDirectly = hasPermission('PUBLISH_MASTER_TIMETABLE');
  const cls = rd.classes.find((c) => c.id === classId)!;

  const [type, setType] = useState<SlotType>(entry?.type ?? 'LESSON');
  const [subjectId, setSubjectId] = useState(entry?.subjectId ?? '');
  const [teacherId, setTeacherId] = useState(entry?.teacherId ?? '');
  const [roomId, setRoomId] = useState(entry?.roomId ?? cls.roomId ?? '');
  const [locked, setLocked] = useState(entry?.locked ?? false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const needsSubjectTeacher = type === 'LESSON' || type === 'ACTIVITY';

  const qualifiedTeachers = rd.teachers.filter(
    (t) =>
      t.active &&
      (!subjectId || t.subjectIds.includes(subjectId)) &&
      (t.classIds.length === 0 ? t.gradeIds.includes(cls.gradeId) : t.classIds.includes(classId)),
  );
  const otherTeachers = rd.teachers.filter((t) => t.active && !qualifiedTeachers.includes(t));

  const save = async () => {
    if (needsSubjectTeacher && (!subjectId || !teacherId)) {
      alert('Subject and teacher are required for lesson/activity periods.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        day,
        periodId: slot.id,
        classId,
        type,
        subjectId: needsSubjectTeacher ? subjectId : undefined,
        teacherId: needsSubjectTeacher ? teacherId : undefined,
        roomId: roomId || undefined,
        locked,
        directPublish: canPublishDirectly,
        proposedBy: currentUser?.name ?? 'Unknown',
      };
      const result = entry ? await Timetable.update(entry.id, body) : await Timetable.create(body);
      if ('pending' in result && result.pending) {
        alert('Submitted for approval — a publisher needs to approve this change before it appears on the live timetable.');
      }
      onSaved();
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.clashes) {
        const clash = data.clashes[0];
        alert(
          `Conflict: ${clash.classId === classId ? 'this class' : clash.teacherId === teacherId ? rd.teacherName(clash.teacherId) : 'this room'} is already booked for ${slot.label} on ${day}.`,
        );
      } else {
        alert(data?.message ?? 'Failed to save timetable entry');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!entry) return;
    const what = needsSubjectTeacher ? rd.subjectName(entry.subjectId) : entry.type;
    if (!confirm(`Remove ${what} from ${cls.name}, ${slot.label} (${day})?`)) return;
    setDeleting(true);
    try {
      await Timetable.remove(entry.id);
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to remove entry');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...backdropMotion}>
      <motion.div className="modal" onClick={(e) => e.stopPropagation()} {...modalMotion}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarClock size={18} strokeWidth={2.25} /> {cls.name} · {slot.label} ({day})
        </h2>
        <p style={{ marginTop: -10, marginBottom: 16, color: 'var(--text-dim)', fontSize: 12.5 }}>
          {slot.start}–{slot.end}
        </p>

        <div className="form-row">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as SlotType)}>
            {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {needsSubjectTeacher && (
          <>
            <div className="form-row">
              <label>Subject</label>
              <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTeacherId(''); }}>
                <option value="">Select subject…</option>
                {rd.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-row">
              <label>Teacher</label>
              <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">Select teacher…</option>
                {qualifiedTeachers.length > 0 && (
                  <optgroup label="Qualified for this subject/class">
                    {qualifiedTeachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </optgroup>
                )}
                <optgroup label="Other teachers">
                  {otherTeachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
              </select>
            </div>
          </>
        )}

        <div className="form-row">
          <label>Room {needsSubjectTeacher ? '' : '(optional)'}</label>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">— none —</option>
            {rd.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="form-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} id="lock-entry" />
          <label htmlFor="lock-entry" style={{ fontWeight: 500, color: 'var(--text)' }}>Lock this period (prevent accidental edits)</label>
        </div>

        <div className="modal-actions">
          {entry && (
            <button className="danger" onClick={remove} disabled={deleting} style={{ marginRight: 'auto' }}>
              <Trash2 size={13} strokeWidth={2.25} /> {deleting ? 'Removing…' : 'Remove'}
            </button>
          )}
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save} disabled={saving}>
            <Save size={14} strokeWidth={2.25} /> {saving ? 'Saving…' : entry ? 'Save Changes' : 'Add to Timetable'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
