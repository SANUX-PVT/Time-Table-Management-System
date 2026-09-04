import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Copy, Eye, FileDown, ShieldCheck, Users, XCircle } from 'lucide-react';
import { Timetable } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { usePermissions } from '../context/PermissionsContext';
import type { Day, MasterTimetableEntry, PendingTimetableChange, TimeSlot, TimetableVersion } from '../types';
import { useAuth } from '../context/AuthContext';
import { WeekGrid } from '../components/WeekGrid';
import { MasterEntryModal } from '../components/MasterEntryModal';
import { exportTableToExcel, exportTableToPdf } from '../utils/export';

export default function MasterTimetablePage() {
  const rd = useRefData();
  const { hasPermission } = usePermissions();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState<PendingTimetableChange[]>([]);
  const canPublishDirectly = hasPermission('PUBLISH_MASTER_TIMETABLE');
  const [classId, setClassId] = useState(searchParams.get('classId') ?? '');
  const [entries, setEntries] = useState<MasterTimetableEntry[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [versions, setVersions] = useState<TimetableVersion[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [editCell, setEditCell] = useState<{ day: Day; slot: TimeSlot; entry: MasterTimetableEntry | null } | null>(null);
  const [copyFrom, setCopyFrom] = useState<Day>('MON');
  const [copyTo, setCopyTo] = useState<Day>('TUE');
  const [copying, setCopying] = useState(false);

  const canEdit = hasPermission('EDIT_MASTER_TIMETABLE');

  const effectiveClassId = classId || rd.classes[0]?.id;

  const loadEntries = () => {
    if (!effectiveClassId) return;
    Timetable.master({ classId: effectiveClassId }).then(setEntries);
  };
  useEffect(loadEntries, [effectiveClassId]);

  const loadMeta = () => {
    Timetable.validate().then(setValidation);
    Timetable.versions().then(setVersions);
    if (canPublishDirectly) Timetable.pending().then(setPending);
  };
  useEffect(loadMeta, []);

  const decidePending = async (id: string, approve: boolean) => {
    await Timetable.decidePending(id, { approve, decidedBy: currentUser?.name ?? 'Unknown' });
    loadMeta();
    loadEntries();
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await Timetable.publish('Manual re-publish from Master Timetable screen.');
      loadMeta();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const currentVersion = versions[versions.length - 1];

  const exportRows = () => {
    const days: Day[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const rows: (string | number)[][] = [];
    for (const day of days) {
      const dayEntries = entries.filter((e) => e.day === day).sort((a, b) => {
        const sa = rd.timeSlots.find((s) => s.id === a.periodId)?.order ?? 0;
        const sb = rd.timeSlots.find((s) => s.id === b.periodId)?.order ?? 0;
        return sa - sb;
      });
      for (const e of dayEntries) {
        const slot = rd.timeSlots.find((s) => s.id === e.periodId);
        rows.push([day, slot?.label ?? '', slot?.start ?? '', e.type, rd.subjectName(e.subjectId), rd.teacherName(e.teacherId), rd.roomName(e.roomId)]);
      }
    }
    return rows;
  };
  const exportColumns = ['Day', 'Period', 'Start', 'Type', 'Subject', 'Teacher', 'Room'];
  const exportPdf = () => exportTableToPdf(`Master Timetable — ${rd.className(effectiveClassId)}`, exportColumns, exportRows(), `master-timetable-${rd.className(effectiveClassId)}`);
  const exportExcel = () => exportTableToExcel(rd.className(effectiveClassId), exportColumns, exportRows(), `master-timetable-${rd.className(effectiveClassId)}`);

  const copyDay = async () => {
    if (!effectiveClassId || copyFrom === copyTo) return;
    if (!confirm(`Copy ${copyFrom}'s schedule to ${copyTo} for ${rd.className(effectiveClassId)}? Existing unlocked periods on ${copyTo} will be overwritten.`)) return;
    setCopying(true);
    try {
      const result = await Timetable.copyDay({ classId: effectiveClassId, fromDay: copyFrom, toDay: copyTo });
      alert(`Copied ${result.copied} period(s).${result.skipped.length ? `\nSkipped: ${result.skipped.join(', ')}` : ''}`);
      loadEntries();
      loadMeta();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Copy failed');
    } finally {
      setCopying(false);
    }
  };

  // Teachers currently teaching the selected class, with their workload for it.
  const classTeachers = Object.values(
    entries
      .filter((e) => (e.type === 'LESSON' || e.type === 'ACTIVITY') && e.teacherId)
      .reduce((acc: Record<string, { teacherId: string; subjects: Set<string>; periods: number }>, e) => {
        const key = e.teacherId!;
        if (!acc[key]) acc[key] = { teacherId: key, subjects: new Set(), periods: 0 };
        if (e.subjectId) acc[key].subjects.add(e.subjectId);
        acc[key].periods += 1;
        return acc;
      }, {}),
  ).sort((a, b) => b.periods - a.periods);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Master Timetable</h1>
          <p>
            {canEdit
              ? "The recurring weekly schedule. Click any period to change it — click a free slot to add one."
              : 'The recurring weekly schedule (view only — only Admins and the Principal can make changes here).'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {currentVersion && <span className="badge blue">v{currentVersion.version} · {currentVersion.status}</span>}
          {canEdit ? (
            <button className="primary" onClick={publish} disabled={publishing}>
              <ShieldCheck size={14} strokeWidth={2.25} /> {publishing ? 'Publishing…' : 'Validate & Publish'}
            </button>
          ) : (
            <span className="badge gray"><Eye size={12} strokeWidth={2.25} /> View only</span>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2.4fr 1fr' }}>
        <div>
          <div className="toolbar">
            <select value={effectiveClassId} onChange={(e) => setClassId(e.target.value)}>
              {rd.grades.map((g) => (
                <optgroup key={g.id} label={g.name}>
                  {rd.classes.filter((c) => c.gradeId === g.id).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {canEdit && (
              <>
                <span style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>Copy</span>
                <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value as Day)}>
                  {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as Day[]).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <span style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>to</span>
                <select value={copyTo} onChange={(e) => setCopyTo(e.target.value as Day)}>
                  {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as Day[]).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <button onClick={copyDay} disabled={copying || copyFrom === copyTo}>
                  <Copy size={13} strokeWidth={2.25} /> {copying ? 'Copying…' : 'Copy Day'}
                </button>
              </>
            )}
            <button onClick={exportPdf} title="Export as PDF"><FileDown size={13} strokeWidth={2.25} /> PDF</button>
            <button onClick={exportExcel} title="Export as Excel"><FileDown size={13} strokeWidth={2.25} /> Excel</button>
          </div>
          <div className="card">
            <WeekGrid
              entries={entries}
              onCellClick={canEdit ? (day, slot, entry) => setEditCell({ day, slot, entry }) : undefined}
            />
          </div>
        </div>

        <div>
          {canPublishDirectly && pending.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>Pending Changes ({pending.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pending.map((p) => (
                  <div key={p.id} className="candidate-row" style={{ marginBottom: 0, flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                    <div className="name" style={{ fontSize: 13 }}>
                      {rd.className(p.proposedChange.classId)} · {p.proposedChange.day} — proposed by {p.proposedBy}
                    </div>
                    <div className="tags">
                      {p.proposedChange.subjectId && <span className="badge blue">{rd.subjectName(p.proposedChange.subjectId)}</span>}
                      {p.proposedChange.teacherId && <span className="badge gray">{rd.teacherName(p.proposedChange.teacherId)}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="primary" onClick={() => decidePending(p.id, true)}>Approve</button>
                      <button onClick={() => decidePending(p.id, false)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} strokeWidth={2.25} /> Teachers in {rd.className(effectiveClassId)}
            </h3>
            {classTeachers.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No lessons assigned yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {classTeachers.map((t) => (
                  <Link key={t.teacherId} to={`/teachers/${t.teacherId}`} style={{ textDecoration: 'none' }}>
                    <div className="candidate-row" style={{ marginBottom: 0 }}>
                      <div>
                        <div className="name" style={{ color: 'var(--text)' }}>{rd.teacherName(t.teacherId)}</div>
                        <div className="tags">
                          {Array.from(t.subjects).map((sid) => (
                            <span key={sid} className="badge blue">{rd.subjectName(sid)}</span>
                          ))}
                        </div>
                      </div>
                      <span className="badge gray">{t.periods}/wk in this class</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Validation</h3>
            {validation && (
              <>
                <p>
                  <span className={`badge ${validation.valid ? 'green' : 'red'}`}>
                    {validation.valid ? 'No conflicts' : `${validation.errorCount} error(s)`}
                  </span>{' '}
                  {validation.warningCount > 0 && <span className="badge yellow">{validation.warningCount} warning(s)</span>}
                </p>
                {validation.issues.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-dim)', fontSize: 13 }}>
                    {['No teacher conflicts', 'No class conflicts', 'No room conflicts', 'Required periods satisfied'].map((t) => (
                      <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <CheckCircle2 size={15} strokeWidth={2.25} color="var(--green)" /> {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {validation.issues.map((i: any, idx: number) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, color: i.level === 'error' ? 'var(--red)' : 'var(--yellow)', fontSize: 13 }}>
                        {i.level === 'error' ? <XCircle size={15} strokeWidth={2.25} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertTriangle size={15} strokeWidth={2.25} style={{ flexShrink: 0, marginTop: 1 }} />}
                        {i.message}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <h3>Version History</h3>
            <table>
              <thead><tr><th>Ver.</th><th>Status</th><th>Published</th></tr></thead>
              <tbody>
                {[...versions].reverse().map((v) => (
                  <tr key={v.id}>
                    <td>v{v.version}</td>
                    <td><span className="badge blue">{v.status}</span></td>
                    <td>{v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editCell && effectiveClassId && canEdit && (
        <MasterEntryModal
          classId={effectiveClassId}
          day={editCell.day}
          slot={editCell.slot}
          entry={editCell.entry}
          onClose={() => setEditCell(null)}
          onSaved={() => { setEditCell(null); loadEntries(); loadMeta(); }}
        />
      )}
    </div>
  );
}
