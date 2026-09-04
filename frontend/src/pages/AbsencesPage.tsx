import { useEffect, useState } from 'react';
import { Check, MailX, X } from 'lucide-react';
import { Daily } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { EmptyState } from '../components/EmptyState';
import type { Absence } from '../types';

export default function AbsencesPage() {
  const rd = useRefData();
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const canDecide = hasPermission('DECIDE_ABSENCES');

  const load = () => Daily.absences().then(setAbsences);
  useEffect(() => { load(); }, []);

  const decide = async (id: string, approve: boolean) => {
    if (!currentUser) return;
    await Daily.decideAbsence(id, { approve, decidedBy: currentUser.name });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Absences</h1>
          <p>All teacher absence requests across the school.</p>
        </div>
      </div>

      <div className="card">
        {absences.length === 0 ? (
          <EmptyState icon={MailX}>No absence requests yet.</EmptyState>
        ) : (
          <table>
            <thead>
              <tr><th>Teacher</th><th>Date</th><th>Scope</th><th>Reason</th><th>Remarks</th><th>Status</th>{canDecide && <th></th>}</tr>
            </thead>
            <tbody>
              {absences.map((a) => (
                <tr key={a.id}>
                  <td>{rd.teacherName(a.teacherId)}</td>
                  <td>{a.date}</td>
                  <td>{a.wholeDay ? 'Whole Day' : `${a.periodIds.length} period(s)`}</td>
                  <td>{a.reason}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{a.remarks || '—'}</td>
                  <td>
                    <span className={`badge ${a.status === 'APPROVED' ? 'green' : a.status === 'REJECTED' ? 'red' : 'yellow'}`}>
                      {a.status}
                    </span>
                  </td>
                  {canDecide && (
                    <td>
                      {a.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="primary" onClick={() => decide(a.id, true)}><Check size={13} strokeWidth={2.5} /> Approve</button>
                          <button className="danger" onClick={() => decide(a.id, false)}><X size={13} strokeWidth={2.5} /> Reject</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
