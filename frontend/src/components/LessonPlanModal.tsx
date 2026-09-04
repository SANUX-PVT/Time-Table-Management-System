import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { NotebookPen, Save, Trash2 } from 'lucide-react';
import { LessonPlans, Syllabus } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { backdropMotion, modalMotion } from '../utils/motion';
import type { Day, LessonPlan, MasterTimetableEntry, SyllabusItem } from '../types';

const DAY_MAP: Record<number, Day | null> = { 0: null, 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: null };
function dayOf(date: string): Day | null {
  if (!date) return null;
  const d = new Date(date + 'T00:00:00');
  return DAY_MAP[d.getDay()];
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function LessonPlanModal({
  teacherId,
  weeklyEntries,
  plan,
  onClose,
  onSaved,
}: {
  teacherId: string;
  weeklyEntries: MasterTimetableEntry[];
  plan: LessonPlan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const rd = useRefData();
  const teacher = rd.teachers.find((t) => t.id === teacherId);
  const isEdit = !!plan;

  const [date, setDate] = useState(plan?.date ?? todayStr());
  const [classId, setClassId] = useState(plan?.classId ?? '');
  const [subjectId, setSubjectId] = useState(plan?.subjectId ?? '');
  const [periodIds, setPeriodIds] = useState<string[]>(plan?.periodIds ?? []);
  const [topic, setTopic] = useState(plan?.topic ?? '');
  const [objectives, setObjectives] = useState(plan?.objectives ?? '');
  const [resources, setResources] = useState(plan?.resources ?? '');
  const [homework, setHomework] = useState(plan?.homework ?? '');
  const [syllabusItemId, setSyllabusItemId] = useState(plan?.syllabusItemId ?? '');
  const [syllabusOptions, setSyllabusOptions] = useState<SyllabusItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const cls = rd.classes.find((c) => c.id === classId);
    const config = cls && rd.gradeSubjects.find((g) => g.gradeId === cls.gradeId && g.subjectId === subjectId);
    if (config) Syllabus.list(config.id).then(setSyllabusOptions);
    else setSyllabusOptions([]);
  }, [classId, subjectId, rd.classes, rd.gradeSubjects]);

  const day = dayOf(date);

  // All periods for this class+subject that day (candidates to tick).
  const periodChoices = useMemo(
    () =>
      weeklyEntries
        .filter(
          (e) =>
            e.day === day &&
            (e.type === 'LESSON' || e.type === 'ACTIVITY') &&
            (!classId || e.classId === classId) &&
            (!subjectId || e.subjectId === subjectId),
        )
        .map((e) => ({ entry: e, slot: rd.timeSlots.find((s) => s.id === e.periodId) }))
        .sort((a, b) => (a.slot?.order ?? 0) - (b.slot?.order ?? 0)),
    [weeklyEntries, day, classId, subjectId, rd.timeSlots],
  );
  // In edit mode the plan's own periods might belong to entries no longer resolvable by day/class/subject
  // filtering (e.g. date was changed) — still show any ticked ones that aren't in the computed list.
  const knownPeriodIds = new Set(periodChoices.map((o) => o.entry.periodId));
  const orphanPeriodIds = periodIds.filter((id) => !knownPeriodIds.has(id));

  const classOptions = useMemo(() => {
    const ids = new Set<string>([...(teacher?.classIds ?? []), ...weeklyEntries.map((e) => e.classId)]);
    return rd.classes.filter((c) => ids.has(c.id));
  }, [teacher, weeklyEntries, rd.classes]);

  const subjectOptions = rd.subjects.filter((s) => teacher?.subjectIds.includes(s.id));

  // periodId -> masterEntryId, from whichever source resolves it (fresh weekly entries, or the plan's own record).
  const planPeriodToEntry = new Map((plan?.periodIds ?? []).map((pid, i) => [pid, plan!.masterEntryIds[i]]));
  const resolveMasterEntryIds = () =>
    periodIds
      .map((pid) => periodChoices.find((o) => o.entry.periodId === pid)?.entry.id ?? planPeriodToEntry.get(pid))
      .filter((id): id is string => !!id);

  const togglePeriod = (periodId: string) => {
    setPeriodIds((prev) => (prev.includes(periodId) ? prev.filter((id) => id !== periodId) : [...prev, periodId]));
  };

  const resetPeriods = () => setPeriodIds([]);

  const save = async () => {
    if (!classId || !subjectId || !date || !topic.trim() || !objectives.trim()) {
      alert('Date, class, subject, topic and objectives are required.');
      return;
    }
    setSaving(true);
    try {
      const masterEntryIds = resolveMasterEntryIds();
      if (isEdit && plan) {
        await LessonPlans.update(plan.id, {
          date,
          periodIds,
          masterEntryIds,
          topic: topic.trim(),
          objectives: objectives.trim(),
          resources: resources.trim() || undefined,
          homework: homework.trim() || undefined,
          syllabusItemId: syllabusItemId || undefined,
        });
      } else {
        await LessonPlans.create({
          teacherId,
          classId,
          subjectId,
          date,
          periodIds,
          masterEntryIds,
          topic: topic.trim(),
          objectives: objectives.trim(),
          resources: resources.trim() || undefined,
          homework: homework.trim() || undefined,
          syllabusItemId: syllabusItemId || undefined,
        });
      }
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to save lesson plan');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!plan) return;
    if (!confirm(`Delete lesson plan "${plan.topic}"?`)) return;
    setDeleting(true);
    try {
      await LessonPlans.remove(plan.id);
      onSaved();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to delete lesson plan');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div className="modal-backdrop" onClick={onClose} {...backdropMotion}>
      <motion.div className="modal" onClick={(e) => e.stopPropagation()} {...modalMotion}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NotebookPen size={18} strokeWidth={2.25} /> {isEdit ? 'Edit Lesson Plan' : 'New Lesson Plan'}
        </h2>
        <p style={{ marginTop: -10, marginBottom: 16, color: 'var(--text-dim)', fontSize: 12.5 }}>
          Allocate a lesson plan to a date so it shows up for monitoring. Tick every period it covers — useful for double periods or a topic spread across several slots that day.
        </p>

        <div className="form-row">
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); resetPeriods(); }} />
        </div>

        {isEdit ? (
          <div className="form-row">
            <label>Class &amp; Subject</label>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{rd.className(classId)} · {rd.subjectName(subjectId)}</div>
          </div>
        ) : (
          <>
            <div className="form-row">
              <label>Class</label>
              <select value={classId} onChange={(e) => { setClassId(e.target.value); resetPeriods(); }}>
                <option value="">Select class…</option>
                {classOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Subject</label>
              <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); resetPeriods(); }}>
                <option value="">Select subject…</option>
                {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </>
        )}

        <div className="form-row">
          <label>Periods on this date {periodChoices.length === 0 && orphanPeriodIds.length === 0 && '(none scheduled — you can still save without linking a period)'}</label>
          {periodChoices.length === 0 && orphanPeriodIds.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
              {!classId || !subjectId ? 'Pick a class and subject to see matching periods.' : 'No matching period on this day.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {periodChoices.map(({ entry, slot }) => (
                <label key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: 13 }}>
                  <input type="checkbox" checked={periodIds.includes(entry.periodId)} onChange={() => togglePeriod(entry.periodId)} />
                  {slot?.label} · {slot?.start}–{slot?.end}
                </label>
              ))}
              {orphanPeriodIds.map((pid) => (
                <label key={pid} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: 13, color: 'var(--text-dim)' }}>
                  <input type="checkbox" checked={periodIds.includes(pid)} onChange={() => togglePeriod(pid)} />
                  {rd.timeSlots.find((s) => s.id === pid)?.label ?? 'Period'} (previously linked)
                </label>
              ))}
            </div>
          )}
        </div>

        {syllabusOptions.length > 0 && (
          <div className="form-row">
            <label>Syllabus item (optional — links this plan to the pacing guide)</label>
            <select value={syllabusItemId} onChange={(e) => setSyllabusItemId(e.target.value)}>
              <option value="">— not linked —</option>
              {syllabusOptions.map((s) => <option key={s.id} value={s.id}>Week {s.targetWeek} · {s.title}</option>)}
            </select>
          </div>
        )}

        <div className="form-row">
          <label>Topic</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Fractions — addition of unlike fractions" />
        </div>

        <div className="form-row">
          <label>Learning Objectives</label>
          <textarea rows={3} value={objectives} onChange={(e) => setObjectives(e.target.value)} placeholder="What should students be able to do by the end of the lesson?" />
        </div>

        <div className="form-row">
          <label>Resources (optional)</label>
          <input value={resources} onChange={(e) => setResources(e.target.value)} placeholder="Textbook chapter, materials, links…" />
        </div>

        <div className="form-row">
          <label>Homework / Follow-up (optional)</label>
          <input value={homework} onChange={(e) => setHomework(e.target.value)} placeholder="Exercise reference, task…" />
        </div>

        <div className="modal-actions">
          {isEdit && (
            <button className="danger" onClick={remove} disabled={deleting} style={{ marginRight: 'auto' }}>
              <Trash2 size={13} strokeWidth={2.25} /> {deleting ? 'Removing…' : 'Delete'}
            </button>
          )}
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save} disabled={saving}>
            <Save size={14} strokeWidth={2.25} /> {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Lesson Plan'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
