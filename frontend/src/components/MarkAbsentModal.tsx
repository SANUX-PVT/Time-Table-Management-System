import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarOff, Send } from 'lucide-react';
import { Config, Daily } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { backdropMotion, modalMotion } from '../utils/motion';
import type { DailyTimetableEntry } from '../types';

export function MarkAbsentModal({
  teacherId,
  date,
  actorName,
  onClose,
  onSubmitted,
}: {
  teacherId: string;
  date: string;
  actorName: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const rd = useRefData();
  const [entries, setEntries] = useState<DailyTimetableEntry[]>([]);
  const [wholeDay, setWholeDay] = useState(true);
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('Sick Leave');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);

  useEffect(() => {
    Daily.timetable({ date, teacherId }).then((all) =>
      setEntries(all.filter((e) => e.originalTeacherId === teacherId && e.status !== 'TEACHER_ABSENT')),
    );
    Config.get().then((c) => setRequireApproval(c.requireAbsenceApproval));
  }, [date, teacherId]);

  const togglePeriod = (periodId: string) => {
    setSelectedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(periodId)) next.delete(periodId);
      else next.add(periodId);
      return next;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await Daily.markAbsent({
        teacherId,
        date,
        wholeDay,
        periodIds: wholeDay ? undefined : Array.from(selectedPeriods),
        reason,
        remarks,
        requiresApproval: requireApproval,
      });
      onSubmitted();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to submit absence');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...backdropMotion}>
      <motion.div className="modal" onClick={(e) => e.stopPropagation()} {...modalMotion}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CalendarOff size={18} strokeWidth={2.25} /> Mark Absent — {date}</h2>

        <div className="form-row">
          <label>Scope</label>
          <div style={{ display: 'flex', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400 }}>
              <input type="radio" checked={wholeDay} onChange={() => setWholeDay(true)} /> Whole Day
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400 }}>
              <input type="radio" checked={!wholeDay} onChange={() => setWholeDay(false)} /> Selected Periods
            </label>
          </div>
        </div>

        {!wholeDay && (
          <div className="form-row">
            <label>Periods</label>
            {entries.length === 0 && <p style={{ color: 'var(--text-dim)', margin: 0 }}>No scheduled lessons this day.</p>}
            {entries.map((e) => {
              const slot = rd.timeSlots.find((s) => s.id === e.periodId);
              return (
                <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400, marginBottom: 4 }}>
                  <input type="checkbox" checked={selectedPeriods.has(e.periodId)} onChange={() => togglePeriod(e.periodId)} />
                  {slot?.label} ({slot?.start}–{slot?.end}) — {rd.className(e.classId)} · {rd.subjectName(e.subjectId)}
                </label>
              );
            })}
          </div>
        )}

        <div className="form-row">
          <label>Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option>Sick Leave</option>
            <option>Personal Leave</option>
            <option>Official Duty</option>
            <option>Training / Workshop</option>
            <option>Other</option>
          </select>
        </div>

        <div className="form-row">
          <label>Remarks (optional)</label>
          <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={submit} disabled={submitting || (!wholeDay && selectedPeriods.size === 0)}>
            <Send size={14} strokeWidth={2.25} /> {submitting ? 'Submitting…' : 'Submit Absence'}
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10 }}>
          Submitted by {actorName}. {requireApproval ? 'This absence will need officer approval before relief can be assigned.' : 'This school does not require approval — it takes effect immediately.'}
        </p>
      </motion.div>
    </motion.div>
  );
}
