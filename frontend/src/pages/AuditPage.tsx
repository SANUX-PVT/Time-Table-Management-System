import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { Audit } from '../api/client';
import { exportTableToExcel, exportTableToPdf } from '../utils/export';
import type { AuditLogEntry } from '../types';

export default function AuditPage() {
  const [log, setLog] = useState<AuditLogEntry[]>([]);

  useEffect(() => { Audit.list(200).then(setLog); }, []);

  const columns = ['Time', 'Action', 'Performed By', 'Details'];
  const rows = () => log.map((l) => [new Date(l.timestamp).toLocaleString(), l.action.replace(/_/g, ' '), l.actor, l.details]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <p>Complete history of important operations across the system.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportTableToPdf('Audit Log', columns, rows(), 'audit-log')}><FileDown size={13} strokeWidth={2.25} /> PDF</button>
          <button onClick={() => exportTableToExcel('Audit Log', columns, rows(), 'audit-log')}><FileDown size={13} strokeWidth={2.25} /> Excel</button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Time</th><th>Action</th><th>Performed By</th><th>Details</th></tr></thead>
          <tbody>
            {log.map((l) => (
              <tr key={l.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(l.timestamp).toLocaleString()}</td>
                <td><span className="badge blue">{l.action.replace(/_/g, ' ')}</span></td>
                <td>{l.actor}</td>
                <td>{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
