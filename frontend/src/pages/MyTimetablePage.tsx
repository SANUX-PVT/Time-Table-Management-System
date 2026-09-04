import { useEffect, useState } from 'react';
import { AlarmClock, BookOpenCheck, CalendarClock, CalendarOff, CheckCircle2, LogIn, LogOut, PartyPopper, UserCheck } from 'lucide-react';
import { Daily, Teachers } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { useAuth } from '../context/AuthContext';
import type { DailyTimetableEntry, MasterTimetableEntry } from '../types';
import { colorFor } from '../utils/colors';
import { durationMinutes, formatTime, LATE_THRESHOLD_MIN, minutesLate } from '../utils/attendance';
import { MarkAbsentModal } from '../components/MarkAbsentModal';
import { StatTile } from '../components/StatTile';
import { EmptyState } from '../components/EmptyState';
import { WeekGrid } from '../components/WeekGrid';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function MyTimetablePage() {
  const rd = useRefData();
  const { currentUser } = useAuth();
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState<DailyTimetableEntry[]>([]);
  const [showAbsent, setShowAbsent] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [weeklyEntries, setWeeklyEntries] = useState<MasterTimetableEntry[]>([]);
  const [workload, setWorkload] = useState<any>(null);

  const teacherId = currentUser?.teacherId;

  useEffect(() => {
    if (!teacherId) return;
    Teachers.masterTimetable(teacherId).then(setWeeklyEntries);
    Teachers.workload(teacherId).then(setWorkload);
  }, [teacherId]);

  const load = () => {
    if (!teacherId) return;
    Daily.timetable({ date, teacherId }).then((list) =>
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
  useEffect(load, [date, teacherId, rd.timeSlots.length]);

  if (!teacherId) {
    return (
      <EmptyState>
        This account isn't linked to a teacher profile, so there's no personal timetable to show.
      </EmptyState>
    );
  }

  const doCheckIn = async (id: string) => {
    setBusyId(id);
    await Daily.checkIn(id);
    load();
    setBusyId(null);
  };
  const doCheckOut = async (id: string) => {
    setBusyId(id);
    await Daily.checkOut(id);
    load();
    setBusyId(null);
  };

  const myLessons = entries.filter((e) => e.teacherId === teacherId);
  const coveredByOthers = entries.filter((e) => e.originalTeacherId === teacherId && e.teacherId !== teacherId);

  const checkedInCount = myLessons.filter((e) => e.checkIn).length;
  const completedCount = myLessons.filter((e) => e.status === 'COMPLETED').length;
  const lateCount = myLessons.filter((e) => {
    const slot = rd.timeSlots.find((s) => s.id === e.periodId);
    return e.checkIn && slot && minutesLate(slot.start, e.checkIn) > LATE_THRESHOLD_MIN;
  }).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Timetable</h1>
          <p>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — check in and out of each lesson as you teach it.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="primary" onClick={() => setShowAbsent(true)}><CalendarOff size={14} strokeWidth={2.25} /> Mark Myself Absent</button>
        </div>
      </div>

      <div className="stat-row">
        <StatTile icon={BookOpenCheck} tone="blue" label="Lessons Today" value={myLessons.length} />
        <StatTile icon={UserCheck} tone="green" label="Checked In" value={checkedInCount} />
        <StatTile icon={CheckCircle2} tone="green" label="Completed" value={completedCount} />
        <StatTile icon={AlarmClock} tone="red" label="Late Arrivals" value={lateCount} valueColor={lateCount > 0 ? 'var(--red)' : undefined} />
      </div>

      {myLessons.length === 0 ? (
        <div className="card"><EmptyState icon={PartyPopper}>No lessons scheduled for you on this date.</EmptyState></div>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {myLessons.map((e) => {
            const slot = rd.timeSlots.find((s) => s.id === e.periodId);
            const tone = colorFor(e.subjectId);
            const late = slot && e.checkIn ? minutesLate(slot.start, e.checkIn) : null;
            return (
              <div key={e.id} className="card" style={{ borderLeft: `4px solid ${tone.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                    {slot?.label} · {slot?.start}–{slot?.end}
                    {e.isRelief && <span className="badge green" style={{ marginLeft: 8 }}>Relief</span>}
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 3 }}>
                    {rd.className(e.classId)} · {rd.subjectName(e.subjectId)} · {rd.roomName(e.roomId)}
                  </div>
                  {e.checkIn && (
                    <div style={{ fontSize: 12.5, marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>Checked in {formatTime(e.checkIn)}</span>
                      {late !== null && (late > LATE_THRESHOLD_MIN
                        ? <span className="badge red">{late}m late</span>
                        : <span className="badge green">On time</span>)}
                      {e.checkOut && <span style={{ color: 'var(--text-dim)' }}>· Checked out {formatTime(e.checkOut)} · {durationMinutes(e.checkIn, e.checkOut)}m lesson</span>}
                    </div>
                  )}
                </div>
                <div>
                  {(e.status === 'SCHEDULED' || e.status === 'RELIEF_ASSIGNED') && (
                    <button className="primary" disabled={busyId === e.id} onClick={() => doCheckIn(e.id)}>
                      <LogIn size={14} strokeWidth={2.25} /> {busyId === e.id ? '…' : 'Check In'}
                    </button>
                  )}
                  {e.status === 'CHECKED_IN' && (
                    <button className="primary" disabled={busyId === e.id} onClick={() => doCheckOut(e.id)}>
                      <LogOut size={14} strokeWidth={2.25} /> {busyId === e.id ? '…' : 'Check Out'}
                    </button>
                  )}
                  {e.status === 'COMPLETED' && <span className="badge green">Completed</span>}
                  {e.status === 'TEACHER_ABSENT' && <span className="badge red">You're marked absent</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {coveredByOthers.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Covered by relief teachers today</h3>
          {coveredByOthers.map((e) => {
            const slot = rd.timeSlots.find((s) => s.id === e.periodId);
            return (
              <div key={e.id} className="candidate-row">
                <div>
                  <div className="name">{rd.className(e.classId)} · {rd.subjectName(e.subjectId)}</div>
                  <div className="tags">
                    <span className="badge gray">{slot?.label}</span>
                    <span className="badge green">{rd.teacherName(e.teacherId)} covering</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarClock size={16} strokeWidth={2.25} /> My Weekly Timetable
          </h3>
          {workload && (
            <span className={`badge ${workload.overWeeklyLimit ? 'red' : 'green'}`}>
              {workload.totalPeriodsPerWeek}/{workload.maxPeriodsPerWeek} periods/week
            </span>
          )}
        </div>
        <p style={{ marginTop: 2, marginBottom: 14, color: 'var(--text-dim)', fontSize: 12.5 }}>
          Your recurring master schedule — only the lessons allocated to you.
        </p>
        <WeekGrid entries={weeklyEntries} showClass />
      </div>

      {showAbsent && currentUser && (
        <MarkAbsentModal
          teacherId={teacherId}
          date={date}
          actorName={currentUser.name}
          onClose={() => setShowAbsent(false)}
          onSubmitted={() => { setShowAbsent(false); load(); }}
        />
      )}
    </div>
  );
}
