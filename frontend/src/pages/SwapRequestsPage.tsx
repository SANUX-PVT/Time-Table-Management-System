import { useEffect, useState } from 'react';
import { ArrowLeftRight, Check, Plus, ShieldCheck, X } from 'lucide-react';
import { SwapRequests, Teachers } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRefData } from '../context/RefDataContext';
import { usePermissions } from '../context/PermissionsContext';
import { EmptyState } from '../components/EmptyState';
import type { MasterTimetableEntry, SwapRequest } from '../types';

const DECISION_BADGE: Record<string, string> = { PENDING: 'yellow', ACCEPTED: 'green', REJECTED: 'red' };

export default function SwapRequestsPage() {
  const rd = useRefData();
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const teacherId = currentUser?.teacherId;
  const canDecideAsAdmin = hasPermission('DECIDE_ABSENCES');

  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [allRequests, setAllRequests] = useState<SwapRequest[]>([]);
  const [myEntries, setMyEntries] = useState<MasterTimetableEntry[]>([]);
  const [myEntryId, setMyEntryId] = useState('');
  const [targetTeacherId, setTargetTeacherId] = useState('');
  const [targetEntries, setTargetEntries] = useState<MasterTimetableEntry[]>([]);
  const [targetEntryId, setTargetEntryId] = useState('');

  const load = () => {
    if (teacherId) SwapRequests.list(teacherId).then(setRequests);
    if (canDecideAsAdmin) SwapRequests.list().then(setAllRequests);
  };
  useEffect(load, [teacherId, canDecideAsAdmin]);
  useEffect(() => { if (teacherId) Teachers.masterTimetable(teacherId).then((e) => setMyEntries(e.filter((x) => !x.locked))); }, [teacherId]);
  useEffect(() => {
    if (targetTeacherId) Teachers.masterTimetable(targetTeacherId).then((e) => setTargetEntries(e.filter((x) => !x.locked)));
    else setTargetEntries([]);
    setTargetEntryId('');
  }, [targetTeacherId]);

  const entryLabel = (e: MasterTimetableEntry) => {
    const slot = rd.timeSlots.find((s) => s.id === e.periodId);
    return `${e.day} · ${slot?.label} · ${rd.className(e.classId)} · ${rd.subjectName(e.subjectId)}`;
  };

  const submit = async () => {
    if (!teacherId || !myEntryId || !targetTeacherId || !targetEntryId) { alert('Pick your period, a teacher, and their period to swap with.'); return; }
    try {
      await SwapRequests.create({ requestingTeacherId: teacherId, requestingEntryId: myEntryId, targetTeacherId, targetEntryId });
      setMyEntryId(''); setTargetTeacherId(''); setTargetEntryId('');
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to submit swap request');
    }
  };

  const teacherDecide = async (id: string, accept: boolean) => {
    try {
      await SwapRequests.teacherDecide(id, accept);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to record decision');
    }
  };

  const adminDecide = async (id: string, accept: boolean) => {
    try {
      await SwapRequests.adminDecide(id, accept, currentUser?.name ?? 'Unknown');
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to record decision');
    }
  };

  const incoming = requests.filter((r) => r.targetTeacherId === teacherId && r.teacherDecision === 'PENDING' && r.status === 'PENDING');
  const outgoing = requests.filter((r) => r.requestingTeacherId === teacherId);
  const awaitingAdmin = allRequests.filter((r) => r.adminDecision === 'PENDING' && r.status === 'PENDING');

  if (!teacherId && !canDecideAsAdmin) return <EmptyState>This account isn't linked to a teacher profile.</EmptyState>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Teacher Swap Requests</h1>
          <p>Swapping a period needs sign-off from both the other teacher and an administrator before it takes effect.</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
        <div>
          {teacherId && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>Request a Swap</h3>
              <div className="form-row">
                <label>Your period</label>
                <select value={myEntryId} onChange={(e) => setMyEntryId(e.target.value)}>
                  <option value="">Select…</option>
                  {myEntries.map((e) => <option key={e.id} value={e.id}>{entryLabel(e)}</option>)}
                </select>
              </div>
              <div className="form-row">
                <label>Swap with teacher</label>
                <select value={targetTeacherId} onChange={(e) => setTargetTeacherId(e.target.value)}>
                  <option value="">Select…</option>
                  {rd.teachers.filter((t) => t.id !== teacherId && t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {targetTeacherId && (
                <div className="form-row">
                  <label>Their period</label>
                  <select value={targetEntryId} onChange={(e) => setTargetEntryId(e.target.value)}>
                    <option value="">Select…</option>
                    {targetEntries.map((e) => <option key={e.id} value={e.id}>{entryLabel(e)}</option>)}
                  </select>
                </div>
              )}
              <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
                <button className="primary" onClick={submit}><Plus size={14} strokeWidth={2.25} /> Send Request</button>
              </div>
            </div>
          )}

          {canDecideAsAdmin && (
            <div className="card">
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} strokeWidth={2.25} /> Awaiting Admin Approval ({awaitingAdmin.length})
              </h3>
              {awaitingAdmin.length === 0 ? (
                <EmptyState>Nothing needs your approval.</EmptyState>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {awaitingAdmin.map((r) => (
                    <div key={r.id} className="candidate-row" style={{ marginBottom: 0, flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                      <div className="name" style={{ fontSize: 13 }}>
                        {rd.teacherName(r.requestingTeacherId)} ↔ {rd.teacherName(r.targetTeacherId)}
                      </div>
                      <div className="tags">
                        <span className={`badge ${DECISION_BADGE[r.teacherDecision]}`}>Teacher: {r.teacherDecision}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="primary" onClick={() => adminDecide(r.id, true)}><Check size={13} strokeWidth={2.25} /> Approve</button>
                        <button className="danger" onClick={() => adminDecide(r.id, false)}><X size={13} strokeWidth={2.25} /> Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {teacherId && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0 }}>Awaiting Your Decision ({incoming.length})</h3>
              {incoming.length === 0 ? (
                <EmptyState icon={ArrowLeftRight}>Nothing pending.</EmptyState>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {incoming.map((r) => (
                    <div key={r.id} className="candidate-row" style={{ marginBottom: 0 }}>
                      <div className="name" style={{ fontSize: 13 }}>{rd.teacherName(r.requestingTeacherId)} wants to swap periods with you</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="primary" onClick={() => teacherDecide(r.id, true)}><Check size={13} strokeWidth={2.25} /></button>
                        <button className="danger" onClick={() => teacherDecide(r.id, false)}><X size={13} strokeWidth={2.25} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Your Requests</h3>
              {outgoing.length === 0 ? (
                <EmptyState>You haven't requested any swaps.</EmptyState>
              ) : (
                <table>
                  <thead><tr><th>With</th><th>Teacher</th><th>Admin</th><th>Overall</th></tr></thead>
                  <tbody>
                    {outgoing.map((r) => (
                      <tr key={r.id}>
                        <td>{rd.teacherName(r.targetTeacherId)}</td>
                        <td><span className={`badge ${DECISION_BADGE[r.teacherDecision]}`}>{r.teacherDecision}</span></td>
                        <td><span className={`badge ${DECISION_BADGE[r.adminDecision]}`}>{r.adminDecision}</span></td>
                        <td><span className={`badge ${DECISION_BADGE[r.status]}`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
