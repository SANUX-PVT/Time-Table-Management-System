import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, CalendarClock, CalendarOff, FileDown, LogIn, LogOut, RefreshCcw, SlidersHorizontal, Timer } from 'lucide-react';
import { Daily, Holidays } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import type { DailyTimetableEntry, Holiday } from '../types';
import { MarkAbsentModal } from '../components/MarkAbsentModal';
import { ReliefModal } from '../components/ReliefModal';
import { DailyOverrideModal } from '../components/DailyOverrideModal';
import { EmptyState } from '../components/EmptyState';
import { colorFor } from '../utils/colors';
import { durationMinutes, formatTime, LATE_THRESHOLD_MIN, minutesLate } from '../utils/attendance';
import { exportTableToExcel, exportTableToPdf } from '../utils/export';

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: 'gray',
  TEACHER_ABSENT: 'red',
  RELIEF_ASSIGNED: 'green',
  CHECKED_IN: 'blue',
  IN_PROGRESS: 'blue',
  CHECKED_OUT: 'gray',
  COMPLETED: 'green',
  CANCELLED: 'red',
  RESCHEDULED: 'yellow',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyTimetablePage() {
  const rd = useRefData();
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const [date, setDate] = useState(todayStr());
  const [classId, setClassId] = useState('');
  const [entries, setEntries] = useState<DailyTimetableEntry[]>([]);
  const [markAbsentFor, setMarkAbsentFor] = useState<string | null>(null);
  const [reliefFor, setReliefFor] = useState<string | null>(null);
  const [overrideEntry, setOverrideEntry] = useState<DailyTimetableEntry | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const canManage = hasPermission('MANAGE_DAILY_OPERATIONS');
  useEffect(() => { Holidays.list().then(setHolidays); }, []);
  const holiday = holidays.find((h) => h.date === date);

  const load = () => {
    Daily.timetable({ date, classId: classId || undefined }).then((list) =>
      setEntries(
        list
          .filter((e) => e.type === 'LESSON' || e.type === 'ACTIVITY')
          .sort((a, b) => {
            const sa = rd.timeSlots.find((s) => s.id === a.periodId);
            const sb = rd.timeSlots.find((s) => s.id === b.periodId);
            return (sa?.order ?? 0) - (sb?.order ?? 0);
          }),
      ),
    );
  };

  useEffect(load, [date, classId, rd.timeSlots.length]);

  const doCheckIn = async (id: string) => { await Daily.checkIn(id); load(); };
  const doCheckOut = async (id: string) => { await Daily.checkOut(id); load(); };

  const cancelLesson = async (e: DailyTimetableEntry) => {
    const reason = prompt(`Reason for cancelling ${rd.className(e.classId)}'s ${rd.subjectName(e.subjectId)} lesson?`);
    if (!reason) return;
    await Daily.override(e.id, { status: 'CANCELLED', reason });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Daily Timetable</h1>
          <p>What is actually happening on this specific date — overrides, absences, relief and check-in/out live here.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {currentUser?.teacherId && (
            <Link to="/my-timetable"><button><Timer size={14} strokeWidth={2.25} /> My Timetable</button></Link>
          )}
          {currentUser?.teacherId && (
            <button className="primary" onClick={() => setMarkAbsentFor(currentUser.teacherId!)}>
              <CalendarOff size={14} strokeWidth={2.25} /> Mark Myself Absent
            </button>
          )}
        </div>
      </div>

      {holiday && !holiday.halfDay && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--yellow)' }}>
          <strong>{holiday.label}</strong> — this is a full school holiday, no lessons are scheduled.
        </div>
      )}
      {holiday?.halfDay && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--yellow)' }}>
          <strong>{holiday.label}</strong> — half day.
        </div>
      )}

      <div className="toolbar">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All Classes</option>
          {rd.grades.map((g) => (
            <optgroup key={g.id} label={g.name}>
              {rd.classes.filter((c) => c.gradeId === g.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          onClick={() => exportTableToPdf(`Daily Timetable — ${date}`, ['Period', 'Class', 'Subject', 'Teacher', 'Status'], entries.map((e) => [rd.timeSlots.find((s) => s.id === e.periodId)?.label ?? '', rd.className(e.classId), rd.subjectName(e.subjectId), rd.teacherName(e.teacherId), e.status]), `daily-timetable-${date}`)}
        >
          <FileDown size={13} strokeWidth={2.25} /> PDF
        </button>
        <button
          onClick={() => exportTableToExcel('Daily', ['Period', 'Class', 'Subject', 'Teacher', 'Status'], entries.map((e) => [rd.timeSlots.find((s) => s.id === e.periodId)?.label ?? '', rd.className(e.classId), rd.subjectName(e.subjectId), rd.teacherName(e.teacherId), e.status]), `daily-timetable-${date}`)}
        >
          <FileDown size={13} strokeWidth={2.25} /> Excel
        </button>
      </div>

      <div className="card">
        {entries.length === 0 ? (
          <EmptyState icon={CalendarClock}>No lessons for this date (weekend or not yet generated).</EmptyState>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Period</th><th>Class</th><th>Subject</th><th>Teacher</th><th>Room</th><th>Status</th><th>Check In / Out</th><th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const slot = rd.timeSlots.find((s) => s.id === e.periodId);
                const isMine = currentUser?.teacherId === e.teacherId;
                const late = slot && e.checkIn ? minutesLate(slot.start, e.checkIn) : null;
                return (
                  <tr key={e.id}>
                    <td>{slot?.label}<br /><span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{slot?.start}–{slot?.end}</span></td>
                    <td>{rd.className(e.classId)}</td>
                    <td>
                      <span className="subject-dot" style={{ background: colorFor(e.subjectId).ring }} />
                      {rd.subjectName(e.subjectId)}
                    </td>
                    <td>
                      {rd.teacherName(e.teacherId)}
                      {e.isRelief && <span className="badge green" style={{ marginLeft: 6 }}>Relief</span>}
                    </td>
                    <td>{rd.roomName(e.roomId)}</td>
                    <td><span className={`badge ${STATUS_BADGE[e.status] ?? 'gray'}`}>{e.status.replace(/_/g, ' ')}</span></td>
                    <td style={{ fontSize: 12 }}>
                      {!e.checkIn && <span style={{ color: 'var(--text-faint)' }}>Not checked in</span>}
                      {e.checkIn && (
                        <div>
                          <div>In: {formatTime(e.checkIn)}{' '}
                            {late !== null && (late > LATE_THRESHOLD_MIN
                              ? <span className="badge red" style={{ marginLeft: 4 }}>{late}m late</span>
                              : <span className="badge green" style={{ marginLeft: 4 }}>On time</span>)}
                          </div>
                          {e.checkOut && (
                            <div style={{ marginTop: 2, color: 'var(--text-dim)' }}>
                              Out: {formatTime(e.checkOut)} · {durationMinutes(e.checkIn, e.checkOut)}m
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {e.status === 'SCHEDULED' && (canManage || currentUser?.teacherId === e.originalTeacherId) && (
                          <button onClick={() => setMarkAbsentFor(e.originalTeacherId!)}><CalendarOff size={13} strokeWidth={2.25} /> Mark Absent</button>
                        )}
                        {e.status === 'SCHEDULED' && canManage && (
                          <button onClick={() => setOverrideEntry(e)}><SlidersHorizontal size={13} strokeWidth={2.25} /> Change</button>
                        )}
                        {e.status === 'SCHEDULED' && canManage && (
                          <button className="danger" onClick={() => cancelLesson(e)}><Ban size={13} strokeWidth={2.25} /> Cancel</button>
                        )}
                        {e.status === 'TEACHER_ABSENT' && canManage && (
                          <button className="primary" onClick={() => setReliefFor(e.id)}><RefreshCcw size={13} strokeWidth={2.25} /> Find Relief</button>
                        )}
                        {(e.status === 'RELIEF_ASSIGNED' || e.status === 'SCHEDULED') && isMine && (
                          <button onClick={() => doCheckIn(e.id)}><LogIn size={13} strokeWidth={2.25} /> Check In</button>
                        )}
                        {e.status === 'CHECKED_IN' && isMine && (
                          <button onClick={() => doCheckOut(e.id)}><LogOut size={13} strokeWidth={2.25} /> Check Out</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {markAbsentFor && currentUser && (
        <MarkAbsentModal
          teacherId={markAbsentFor}
          date={date}
          actorName={currentUser.name}
          onClose={() => setMarkAbsentFor(null)}
          onSubmitted={() => { setMarkAbsentFor(null); load(); }}
        />
      )}
      {reliefFor && currentUser && (
        <ReliefModal
          dailyEntryId={reliefFor}
          actorName={currentUser.name}
          onClose={() => setReliefFor(null)}
          onAssigned={() => { setReliefFor(null); load(); }}
        />
      )}
      {overrideEntry && (
        <DailyOverrideModal
          entry={overrideEntry}
          onClose={() => setOverrideEntry(null)}
          onSaved={() => { setOverrideEntry(null); load(); }}
        />
      )}
    </div>
  );
}
