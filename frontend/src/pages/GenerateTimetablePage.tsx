import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { Timetable } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { WeekGrid } from '../components/WeekGrid';
import type { MasterTimetableEntry } from '../types';

type Scope = 'ALL' | 'CLASS';
type Mode = 'FILL_GAPS' | 'REGENERATE';

export default function GenerateTimetablePage() {
  const rd = useRefData();
  const [scope, setScope] = useState<Scope>('CLASS');
  const [classId, setClassId] = useState('');
  const [mode, setMode] = useState<Mode>('FILL_GAPS');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ created: number; cleared: number; unresolved: string[] } | null>(null);
  const [validation, setValidation] = useState<any>(null);
  const [previewEntries, setPreviewEntries] = useState<MasterTimetableEntry[]>([]);

  const effectiveClassId = classId || rd.classes[0]?.id;

  const run = async () => {
    if (scope === 'CLASS' && !effectiveClassId) return;
    const confirmMsg =
      mode === 'REGENERATE'
        ? `This will clear all unlocked lesson periods for ${scope === 'ALL' ? 'the entire school' : rd.className(effectiveClassId)} and rebuild them from scratch. Locked periods are untouched. Continue?`
        : `This will fill only currently empty lesson periods for ${scope === 'ALL' ? 'the entire school' : rd.className(effectiveClassId)}, leaving anything already scheduled as-is. Continue?`;
    if (!confirm(confirmMsg)) return;

    setRunning(true);
    setResult(null);
    try {
      const r = await Timetable.generate({ scope, classId: scope === 'CLASS' ? effectiveClassId : undefined, mode });
      setResult(r);
      const v = await Timetable.validate();
      setValidation(v);
      if (scope === 'CLASS') {
        const entries = await Timetable.master({ classId: effectiveClassId });
        setPreviewEntries(entries);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Generation failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Generate Timetable</h1>
          <p>Assisted scheduling — automatically allocate lesson periods from teacher/subject/grade allocation and the Time Slot Engine, conflict-free.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, color: 'var(--text-dim)' }}>
          {['Generate', 'Review', 'Modify', 'Validate', 'Publish'].map((step, i, arr) => (
            <span key={step} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="badge blue">{step}</span>
              {i < arr.length - 1 && <span>→</span>}
            </span>
          ))}
        </div>
        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12.5, color: 'var(--text-dim)' }}>
          Generate proposes a schedule below. Review the result and validation, then use <Link to="/master-timetable">Master Timetable</Link> to
          manually modify any period before running Validate &amp; Publish there.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Scope</h3>
          <div className="form-row" style={{ flexDirection: 'row', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <input type="radio" checked={scope === 'CLASS'} onChange={() => setScope('CLASS')} /> Single Class
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              <input type="radio" checked={scope === 'ALL'} onChange={() => setScope('ALL')} /> Entire School
            </label>
          </div>
          {scope === 'CLASS' && (
            <div className="form-row">
              <select value={effectiveClassId} onChange={(e) => setClassId(e.target.value)}>
                {rd.grades.map((g) => (
                  <optgroup key={g.id} label={g.name}>
                    {rd.classes.filter((c) => c.gradeId === g.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          <h3>Mode</h3>
          <div className="form-row">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 500, marginBottom: 8 }}>
              <input type="radio" checked={mode === 'FILL_GAPS'} onChange={() => setMode('FILL_GAPS')} style={{ marginTop: 3 }} />
              <span>
                <strong>Fill gaps only</strong>
                <div style={{ fontWeight: 400, color: 'var(--text-dim)', fontSize: 12.5 }}>Safe — only schedules currently empty periods. Never touches existing lessons.</div>
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 500 }}>
              <input type="radio" checked={mode === 'REGENERATE'} onChange={() => setMode('REGENERATE')} style={{ marginTop: 3 }} />
              <span>
                <strong>Full regenerate</strong>
                <div style={{ fontWeight: 400, color: 'var(--text-dim)', fontSize: 12.5 }}>Clears unlocked lessons in scope first, then rebuilds. Locked periods are preserved.</div>
              </span>
            </label>
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 18 }}>
            <button className="primary" onClick={run} disabled={running}>
              <Sparkles size={14} strokeWidth={2.25} /> {running ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Result</h3>
          {!result ? (
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Run a generation to see the outcome here.</p>
          ) : (
            <>
              <div className="stat-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="stat-tile tone-green">
                  <div className="label">Periods Created</div>
                  <div className="value" style={{ color: 'var(--green)' }}>{result.created}</div>
                </div>
                <div className="stat-tile tone-yellow">
                  <div className="label">Cleared First</div>
                  <div className="value">{result.cleared}</div>
                </div>
              </div>
              {result.created === 0 && result.cleared === 0 && (
                <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-dim)', background: 'var(--surface-soft)', padding: '10px 12px', borderRadius: 8 }}>
                  Nothing to do — every period in this scope is already scheduled, so <strong>Fill gaps only</strong> made no changes.
                  Switch to <strong>Full regenerate</strong> to clear the unlocked periods and rebuild the schedule from scratch.
                </p>
              )}
              {result.unresolved.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>
                    Could not fully satisfy ({result.unresolved.length}):
                  </p>
                  <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result.unresolved.map((u, i) => (
                      <li key={i} style={{ display: 'flex', gap: 7, fontSize: 12.5, color: 'var(--yellow)' }}>
                        <AlertTriangle size={14} strokeWidth={2.25} style={{ flexShrink: 0, marginTop: 1 }} /> {u}
                      </li>
                    ))}
                  </ul>
                  <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 8 }}>
                    Usually means no qualified teacher was free at any remaining slot — add another qualified teacher, widen their availability, or fill these manually in Master Timetable.
                  </p>
                </div>
              )}

              {validation && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>Validation</p>
                  <span className={`badge ${validation.valid ? 'green' : 'red'}`}>
                    {validation.valid ? 'No conflicts' : `${validation.errorCount} error(s)`}
                  </span>{' '}
                  {validation.warningCount > 0 && <span className="badge yellow">{validation.warningCount} warning(s)</span>}
                </div>
              )}

              <div className="modal-actions" style={{ justifyContent: 'flex-start', marginTop: 16 }}>
                <Link to={scope === 'CLASS' ? `/master-timetable?classId=${effectiveClassId}` : '/master-timetable'}>
                  <button className="primary">Review in Master Timetable</button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {scope === 'CLASS' && previewEntries.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Preview — {rd.className(effectiveClassId)}</h3>
          <WeekGrid entries={previewEntries} />
        </div>
      )}
    </div>
  );
}
