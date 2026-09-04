import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, SlidersHorizontal } from 'lucide-react';
import { Daily } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { backdropMotion, modalMotion } from '../utils/motion';
import type { DailyTimetableEntry } from '../types';

export function DailyOverrideModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: DailyTimetableEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const rd = useRefData();
  const [teacherId, setTeacherId] = useState(entry.teacherId ?? '');
  const [subjectId, setSubjectId] = useState(entry.subjectId ?? '');
  const [roomId, setRoomId] = useState(entry.roomId ?? '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const slot = rd.timeSlots.find((s) => s.id === entry.periodId);
  const cls = rd.classes.find((c) => c.id === entry.classId);

  const save = async () => {
    if (!reason.trim()) {
      alert('A reason is required for daily timetable changes.');
      return;
    }
    setSaving(true);
    try {
      await Daily.override(entry.id, { teacherId, subjectId, roomId, reason });
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to apply change');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...backdropMotion}>
      <motion.div className="modal" onClick={(e) => e.stopPropagation()} {...modalMotion}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SlidersHorizontal size={18} strokeWidth={2.25} /> Change {cls?.name} · {slot?.label} ({entry.date})
        </h2>
        <p style={{ marginTop: -10, marginBottom: 16, color: 'var(--text-dim)', fontSize: 12.5 }}>
          This changes only today's Daily Timetable — the Master Timetable is unaffected.
        </p>

        <div className="form-row">
          <label>Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {rd.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="form-row">
          <label>Teacher</label>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            {rd.teachers.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="form-row">
          <label>Room</label>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">— none —</option>
            {rd.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        <div className="form-row">
          <label>Reason</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Room maintenance, special activity" />
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save} disabled={saving}>
            <Save size={14} strokeWidth={2.25} /> {saving ? 'Saving…' : 'Apply Change'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
