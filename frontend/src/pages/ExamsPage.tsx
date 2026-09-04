import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardCheck, Plus, Sparkles } from 'lucide-react';
import { Exams } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { EmptyState } from '../components/EmptyState';
import { StatTile } from '../components/StatTile';
import type { ExamSession, ExamTimetableEntry } from '../types';

export default function ExamsPage() {
  const rd = useRefData();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [entries, setEntries] = useState<ExamTimetableEntry[]>([]);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ created: number; unresolved: string[] } | null>(null);

  const loadSessions = () => {
    Exams.sessions().then((s) => { setSessions(s); if (!activeSessionId && s.length) setActiveSessionId(s[s.length - 1].id); });
  };
  useEffect(loadSessions, []);
  useEffect(() => { if (activeSessionId) Exams.entries({ examSessionId: activeSessionId }).then(setEntries); }, [activeSessionId]);

  const createSession = async () => {
    if (!name || !startDate || !endDate) { alert('Name, start date and end date are required.'); return; }
    const s = await Exams.createSession({ name, startDate, endDate });
    setName(''); setStartDate(''); setEndDate('');
    loadSessions();
    setActiveSessionId(s.id);
  };

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const generate = async () => {
    if (!activeSessionId || !classIds.length || !subjectIds.length) {
      alert('Select at least one class and one subject.');
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const r = await Exams.generate(activeSessionId, { classIds, subjectIds });
      setResult(r);
      Exams.entries({ examSessionId: activeSessionId }).then(setEntries);
    } finally {
      setRunning(false);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Exam Timetable</h1>
          <p>Create an exam session, then auto-generate a conflict-free schedule with room and invigilator assignment.</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>New Exam Session</h3>
          <div className="form-row"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Term 3 End-of-Term Exams" /></div>
          <div className="form-row"><label>Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="form-row"><label>End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="primary" onClick={createSession}><Plus size={14} strokeWidth={2.25} /> Create Session</button>
          </div>

          {sessions.length > 0 && (
            <div className="form-row" style={{ marginTop: 16 }}>
              <label>Active Session</label>
              <select value={activeSessionId} onChange={(e) => setActiveSessionId(e.target.value)}>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startDate} – {s.endDate})</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Generate</h3>
          {!activeSession ? (
            <EmptyState>Create a session first.</EmptyState>
          ) : (
            <>
              <div className="form-row">
                <label>Classes</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {rd.classes.map((c) => (
                    <label key={c.id} className={`badge ${classIds.includes(c.id) ? 'blue' : 'gray'}`} style={{ cursor: 'pointer' }}>
                      <input type="checkbox" checked={classIds.includes(c.id)} onChange={() => toggle(classIds, setClassIds, c.id)} style={{ marginRight: 4 }} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label>Subjects</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {rd.subjects.map((s) => (
                    <label key={s.id} className={`badge ${subjectIds.includes(s.id) ? 'blue' : 'gray'}`} style={{ cursor: 'pointer' }}>
                      <input type="checkbox" checked={subjectIds.includes(s.id)} onChange={() => toggle(subjectIds, setSubjectIds, s.id)} style={{ marginRight: 4 }} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
                <button className="primary" onClick={generate} disabled={running}>
                  <Sparkles size={14} strokeWidth={2.25} /> {running ? 'Generating…' : 'Generate Exam Timetable'}
                </button>
              </div>
              {result && (
                <div className="stat-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 12 }}>
                  <StatTile icon={ClipboardCheck} tone="green" label="Exams Scheduled" value={result.created} />
                  <StatTile icon={AlertTriangle} tone={result.unresolved.length ? 'red' : 'green'} label="Unresolved" value={result.unresolved.length} />
                </div>
              )}
              {result && result.unresolved.length > 0 && (
                <p style={{ fontSize: 12, color: 'var(--yellow)' }}>Could not schedule: {result.unresolved.join(', ')}</p>
              )}
            </>
          )}
        </div>
      </div>

      {activeSession && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>{activeSession.name} — Schedule</h3>
          {entries.length === 0 ? (
            <EmptyState>No exams generated yet for this session.</EmptyState>
          ) : (
            <table>
              <thead><tr><th>Date</th><th>Period</th><th>Class</th><th>Subject</th><th>Room</th><th>Invigilator</th></tr></thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>{rd.timeSlots.find((s) => s.id === e.periodId)?.label}</td>
                    <td>{rd.className(e.classId)}</td>
                    <td>{rd.subjectName(e.subjectId)}</td>
                    <td>{rd.roomName(e.roomId)}</td>
                    <td>{rd.teacherName(e.invigilatorTeacherId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
