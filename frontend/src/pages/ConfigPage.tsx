import { useEffect, useState } from 'react';
import { CalendarOff, ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react';
import { Config, Holidays } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { EmptyState } from '../components/EmptyState';
import type { Day, Holiday, SchoolConfig, TimeSlot } from '../types';

const ALL_DAYS: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABEL: Record<Day, string> = {
  MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday',
};

export default function ConfigPage() {
  const rd = useRefData();
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [day, setDay] = useState<Day>('MON');

  useEffect(() => { Config.get().then(setConfig); }, []);

  const daySlots = rd.timeSlots.filter((s) => s.day === day).sort((a, b) => a.order - b.order);

  if (!config) return <EmptyState>Loading configuration…</EmptyState>;

  const saveDetails = async () => {
    setSavingDetails(true);
    await Config.update(config);
    rd.refresh();
    setSavingDetails(false);
    setDetailsSaved(true);
    setTimeout(() => setDetailsSaved(false), 2000);
  };

  const toggleWorkingDay = (d: Day) => {
    const set = new Set(config.workingDays);
    if (set.has(d)) set.delete(d); else set.add(d);
    setConfig({ ...config, workingDays: Array.from(set) });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>School Configuration</h1>
          <p>Set the school's operating hours, working days, and the period/break structure for each day.</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.6fr', alignItems: 'start' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>School Details</h3>
          <div className="form-row">
            <label>School Name</label>
            <input value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Academic Year</label>
            <input value={config.academicYear} onChange={(e) => setConfig({ ...config, academicYear: e.target.value })} />
          </div>
          <div className="form-row" style={{ flexDirection: 'row', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)' }}>School Start</label>
              <input type="text" placeholder="07:30" value={config.startTime} onChange={(e) => setConfig({ ...config, startTime: e.target.value })} style={{ width: '100%', marginTop: 4 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)' }}>School End</label>
              <input type="text" placeholder="12:30" value={config.endTime} onChange={(e) => setConfig({ ...config, endTime: e.target.value })} style={{ width: '100%', marginTop: 4 }} />
            </div>
          </div>
          <div className="form-row">
            <label>Working Days</label>
            <div className="pill-list">
              {ALL_DAYS.map((d) => {
                const active = config.workingDays.includes(d);
                return (
                  <span
                    key={d}
                    onClick={() => toggleWorkingDay(d)}
                    className={`badge ${active ? 'green' : 'gray'}`}
                    style={{ cursor: 'pointer' }}
                  >
                    {DAY_LABEL[d]}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="form-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="require-approval"
              checked={config.requireAbsenceApproval}
              onChange={(e) => setConfig({ ...config, requireAbsenceApproval: e.target.checked })}
            />
            <label htmlFor="require-approval" style={{ fontWeight: 500, color: 'var(--text)' }}>
              Require officer approval for teacher self-declared absences
            </label>
          </div>
          <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 18 }}>
            <button className="primary" onClick={saveDetails} disabled={savingDetails}>
              <Save size={14} strokeWidth={2.25} /> {savingDetails ? 'Saving…' : 'Save Details'}
            </button>
            {detailsSaved && <span className="badge green">Saved</span>}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Time Slot Engine</h3>
          <p style={{ marginTop: -8, marginBottom: 14, color: 'var(--text-dim)', fontSize: 12.5 }}>
            Defines each day's period structure — this is auto-applied as the shared template across every class's timetable.
            Whether a period is a Lesson, Break, Lunch, Assembly or Activity is set per class from the <strong>Master Timetable</strong> screen.
          </p>
          <div className="tabs">
            {ALL_DAYS.filter((d) => ['MON', 'TUE', 'WED', 'THU', 'FRI'].includes(d)).map((d) => (
              <div key={d} className={`tab ${day === d ? 'active' : ''}`} onClick={() => setDay(d)}>
                {DAY_LABEL[d]}
              </div>
            ))}
          </div>
          <DaySlotEditor day={day} slots={daySlots} onChanged={() => rd.refresh()} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Holidays</h3>
        <p style={{ marginTop: -8, marginBottom: 14, color: 'var(--text-dim)', fontSize: 12.5 }}>
          A full-day holiday means no daily timetable is generated for that date at all.
        </p>
        <HolidaysEditor />
      </div>
    </div>
  );
}

function HolidaysEditor() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [label, setLabel] = useState('');
  const [date, setDate] = useState('');
  const [halfDay, setHalfDay] = useState(false);

  const load = () => { Holidays.list().then(setHolidays); };
  useEffect(load, []);

  const add = async () => {
    if (!label.trim() || !date) { alert('Label and date are required.'); return; }
    await Holidays.create({ label, date, halfDay });
    setLabel(''); setDate(''); setHalfDay(false);
    load();
  };
  const remove = async (id: string) => { await Holidays.remove(id); load(); };

  return (
    <div>
      <div className="toolbar">
        <input placeholder="Holiday name" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
          <input type="checkbox" checked={halfDay} onChange={(e) => setHalfDay(e.target.checked)} /> Half day
        </label>
        <button className="primary" onClick={add}><Plus size={14} strokeWidth={2.5} /> Add Holiday</button>
      </div>
      {holidays.length === 0 ? (
        <EmptyState icon={CalendarOff}>No holidays configured.</EmptyState>
      ) : (
        <table>
          <thead><tr><th>Date</th><th>Name</th><th>Type</th><th></th></tr></thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id}>
                <td>{h.date}</td>
                <td>{h.label}</td>
                <td>{h.halfDay ? <span className="badge yellow">Half day</span> : <span className="badge gray">Full day</span>}</td>
                <td><button className="danger" onClick={() => remove(h.id)}><Trash2 size={13} strokeWidth={2.25} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DaySlotEditor({ day, slots, onChanged }: { day: Day; slots: TimeSlot[]; onChanged: () => void }) {
  const [drafts, setDrafts] = useState<TimeSlot[]>(slots);
  const [newSlot, setNewSlot] = useState<{ label: string; start: string; end: string }>({
    label: '', start: '', end: '',
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => { setDrafts(slots); }, [slots]);

  const updateDraft = (id: string, patch: Partial<TimeSlot>) => {
    setDrafts((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const save = async (slot: TimeSlot) => {
    setSavingId(slot.id);
    try {
      await Config.updateTimeSlot(slot.id, { label: slot.label, start: slot.start, end: slot.end });
      onChanged();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to save period');
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (slot: TimeSlot) => {
    if (!confirm(`Delete "${slot.label}" (${slot.start}–${slot.end}) on ${day}? This removes it from every class's timetable.`)) return;
    try {
      await Config.deleteTimeSlot(slot.id);
      onChanged();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to delete period');
    }
  };

  const move = async (slot: TimeSlot, dir: -1 | 1) => {
    const sorted = [...drafts].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === slot.id);
    const swapWith = sorted[idx + dir];
    if (!swapWith) return;
    await Promise.all([
      Config.updateTimeSlot(slot.id, { order: swapWith.order }),
      Config.updateTimeSlot(swapWith.id, { order: slot.order }),
    ]);
    onChanged();
  };

  const addPeriod = async () => {
    if (!newSlot.label.trim() || !newSlot.start || !newSlot.end) {
      alert('Label, start and end time are required.');
      return;
    }
    setAdding(true);
    try {
      await Config.createTimeSlot({ day, ...newSlot });
      setNewSlot({ label: '', start: '', end: '' });
      onChanged();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <table>
        <thead>
          <tr><th style={{ width: 60 }}></th><th>Label</th><th>Start</th><th>End</th><th></th></tr>
        </thead>
        <tbody>
          {drafts.sort((a, b) => a.order - b.order).map((slot, i) => (
            <tr key={slot.id}>
              <td>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button style={{ padding: '4px 6px' }} disabled={i === 0} onClick={() => move(slot, -1)}><ChevronUp size={13} strokeWidth={2.5} /></button>
                  <button style={{ padding: '4px 6px' }} disabled={i === drafts.length - 1} onClick={() => move(slot, 1)}><ChevronDown size={13} strokeWidth={2.5} /></button>
                </div>
              </td>
              <td><input value={slot.label} onChange={(e) => updateDraft(slot.id, { label: e.target.value })} style={{ width: 140 }} /></td>
              <td><input value={slot.start} onChange={(e) => updateDraft(slot.id, { start: e.target.value })} style={{ width: 72 }} /></td>
              <td><input value={slot.end} onChange={(e) => updateDraft(slot.id, { end: e.target.value })} style={{ width: 72 }} /></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="primary" disabled={savingId === slot.id} onClick={() => save(slot)}>
                    <Save size={13} strokeWidth={2.25} /> {savingId === slot.id ? '…' : 'Save'}
                  </button>
                  <button className="danger" onClick={() => remove(slot)}><Trash2 size={13} strokeWidth={2.25} /> Delete</button>
                </div>
              </td>
            </tr>
          ))}
          <tr>
            <td></td>
            <td><input placeholder="e.g. Period 7" value={newSlot.label} onChange={(e) => setNewSlot({ ...newSlot, label: e.target.value })} style={{ width: 140 }} /></td>
            <td><input placeholder="12:30" value={newSlot.start} onChange={(e) => setNewSlot({ ...newSlot, start: e.target.value })} style={{ width: 72 }} /></td>
            <td><input placeholder="13:10" value={newSlot.end} onChange={(e) => setNewSlot({ ...newSlot, end: e.target.value })} style={{ width: 72 }} /></td>
            <td><button className="primary" disabled={adding} onClick={addPeriod}><Plus size={13} strokeWidth={2.5} /> {adding ? 'Adding…' : 'Add Period'}</button></td>
          </tr>
        </tbody>
      </table>
      <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10 }}>
        A new period appears immediately on every class's Master Timetable as an unconfigured slot — open it there to set its type (Lesson, Break, Lunch, Assembly, Activity) per class.
      </p>
    </div>
  );
}
