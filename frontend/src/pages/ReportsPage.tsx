import { useEffect, useState } from 'react';
import { AlarmClock, BarChart3, CalendarX2, RefreshCcw, TrendingUp, Users } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Reports } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { StatTile } from '../components/StatTile';

type Tab = 'workload' | 'absences' | 'relief' | 'attendance' | 'operational' | 'trends';

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('workload');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Teacher workload, absence history, relief utilization, lesson attendance and operational summaries.</p>
        </div>
      </div>

      <div className="tabs">
        {([
          ['workload', 'Teacher Workload', Users],
          ['absences', 'Absences', CalendarX2],
          ['relief', 'Relief', RefreshCcw],
          ['attendance', 'Lesson Attendance', AlarmClock],
          ['operational', 'Operational', BarChart3],
          ['trends', 'Trends', TrendingUp],
        ] as [Tab, string, any][]).map(([key, label, Icon]) => (
          <div key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon size={14} strokeWidth={2.25} /> {label}
          </div>
        ))}
      </div>

      {tab === 'workload' && <WorkloadReport />}
      {tab === 'absences' && <AbsenceReport />}
      {tab === 'relief' && <ReliefReport />}
      {tab === 'attendance' && <AttendanceReport />}
      {tab === 'operational' && <OperationalReport />}
      {tab === 'trends' && <TrendsReport />}
    </div>
  );
}

function TrendsReport() {
  const [bucket, setBucket] = useState<'week' | 'month'>('week');
  const [absences, setAbsences] = useState<any[]>([]);
  const [relief, setRelief] = useState<any[]>([]);
  const [completion, setCompletion] = useState<any[]>([]);

  useEffect(() => {
    Reports.trends('absences', bucket).then(setAbsences);
    Reports.trends('relief', bucket).then(setRelief);
    Reports.trends('lessonPlanCompletion', bucket).then(setCompletion);
  }, [bucket]);

  return (
    <div>
      <div className="toolbar">
        <select value={bucket} onChange={(e) => setBucket(e.target.value as 'week' | 'month')}>
          <option value="week">By Week</option>
          <option value="month">By Month</option>
        </select>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Absences Over Time</h3>
        {absences.length === 0 ? <EmptyState>No absence history yet.</EmptyState> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={absences}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Relief Assignments Over Time</h3>
        {relief.length === 0 ? <EmptyState>No relief history yet.</EmptyState> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={relief}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Lesson Plan Completion Rate Over Time</h3>
        {completion.length === 0 ? <EmptyState>No lesson plan history yet.</EmptyState> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={completion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" fontSize={11} />
              <YAxis fontSize={11} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#818cf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function WorkloadReport() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { Reports.teacherWorkload().then(setRows); }, []);
  if (!rows) return <EmptyState>Loading…</EmptyState>;
  return (
    <div className="card">
      <table>
        <thead><tr><th>Teacher</th><th>Periods/Week</th><th>Free Periods</th><th>Classes</th><th>Subjects</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.teacherId}>
              <td>{r.name}</td>
              <td>{r.periodsPerWeek}/{r.maxPeriodsPerWeek}</td>
              <td>{r.freePeriods}</td>
              <td>{r.classCount}</td>
              <td className="pill-list">{r.subjects.map((s: string) => <span key={s} className="badge blue">{s}</span>)}</td>
              <td>{r.overLimit ? <span className="badge red">Over limit</span> : <span className="badge green">Within limit</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AbsenceReport() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { Reports.absences().then(setRows); }, []);
  if (!rows) return <EmptyState>Loading…</EmptyState>;
  if (rows.length === 0) return <div className="card"><EmptyState icon={CalendarX2}>No absences recorded yet.</EmptyState></div>;
  return (
    <div className="card">
      <table>
        <thead><tr><th>Teacher</th><th>Total</th><th>Approved</th><th>Pending</th><th>Rejected</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.teacherId}>
              <td>{r.name}</td>
              <td>{r.total}</td>
              <td><span className="badge green">{r.approved}</span></td>
              <td><span className="badge yellow">{r.pending}</span></td>
              <td><span className="badge red">{r.rejected}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReliefReport() {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => { Reports.relief().then(setData); }, []);
  if (!data) return <EmptyState>Loading…</EmptyState>;
  return (
    <div>
      <div className="stat-row">
        <StatTile icon={RefreshCcw} tone="green" label="Relief Assignments Made" value={data.totalReliefAssigned} />
        <StatTile icon={CalendarX2} tone="yellow" label="Lessons Still Needing Relief" value={data.totalPendingRelief} />
        <StatTile icon={BarChart3} tone="blue" label="Relief Utilization Rate" value={`${data.utilizationRate}%`} />
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Relief Provided (by teacher)</h3>
        {data.providedByTeacher.length === 0 ? (
          <EmptyState>No relief assignments recorded yet.</EmptyState>
        ) : (
          <table>
            <thead><tr><th>Teacher</th><th>Relief Lessons Covered</th></tr></thead>
            <tbody>
              {data.providedByTeacher.map((r: any) => (
                <tr key={r.teacherId}><td>{r.name}</td><td>{r.reliefCount}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AttendanceReport() {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => { Reports.attendance().then(setData); }, []);
  if (!data) return <EmptyState>Loading…</EmptyState>;
  return (
    <div>
      <div className="stat-row">
        <StatTile icon={AlarmClock} tone="red" label="Late Check-Ins" value={data.lateCount} />
        <StatTile icon={Users} tone="green" label="Lessons Completed" value={data.completedCount} />
      </div>
      <div className="card">
        {data.rows.length === 0 ? (
          <EmptyState>No check-in records yet.</EmptyState>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Teacher</th><th>Class</th><th>Subject</th><th>Period</th><th>Check In</th><th>Check Out</th><th>Late</th></tr></thead>
            <tbody>
              {data.rows.map((r: any) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.teacherName}</td>
                  <td>{r.className}</td>
                  <td>{r.subjectName}</td>
                  <td>{r.periodLabel}</td>
                  <td>{new Date(r.checkIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</td>
                  <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}</td>
                  <td>{r.isLate ? <span className="badge red">{r.minutesLate}m</span> : <span className="badge green">On time</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function OperationalReport() {
  const [data, setData] = useState<any | null>(null);
  useEffect(() => { Reports.operational().then(setData); }, []);
  if (!data) return <EmptyState>Loading…</EmptyState>;
  return (
    <div className="stat-row">
      <StatTile icon={CalendarX2} tone="blue" label="Total Absences Recorded" value={data.totalAbsences} />
      <StatTile icon={CalendarX2} tone="yellow" label="Pending Approvals" value={data.pendingAbsences} />
      <StatTile icon={BarChart3} tone="red" label="Cancelled Lessons" value={data.cancelledLessons} />
      <StatTile icon={BarChart3} tone="yellow" label="Rescheduled Lessons" value={data.rescheduledLessons} />
      <StatTile icon={BarChart3} tone="blue" label="Daily Timetable Changes" value={data.timetableChangeEvents} />
    </div>
  );
}
