import { useEffect, useState } from 'react';
import { CalendarRange, Check, Plus } from 'lucide-react';
import { Terms } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import type { Term } from '../types';

export default function TermsPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => { Terms.list().then(setTerms); };
  useEffect(load, []);

  const create = async () => {
    if (!name || !academicYear || !startDate || !endDate) {
      alert('All fields are required.');
      return;
    }
    setSaving(true);
    try {
      await Terms.create({ name, academicYear, startDate, endDate });
      setName(''); setAcademicYear(''); setStartDate(''); setEndDate('');
      load();
    } finally {
      setSaving(false);
    }
  };

  const activate = async (id: string) => {
    await Terms.activate(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Academic Terms</h1>
          <p>Manage terms and switch which one is currently active — new records (lesson plans, absences, audit entries) are tagged with the active term.</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Add a Term</h3>
          <div className="form-row"><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Term 4" /></div>
          <div className="form-row"><label>Academic Year</label><input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2027" /></div>
          <div className="form-row"><label>Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="form-row"><label>End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="primary" onClick={create} disabled={saving}><Plus size={14} strokeWidth={2.25} /> {saving ? 'Adding…' : 'Add Term'}</button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>All Terms</h3>
          {terms.length === 0 ? (
            <EmptyState icon={CalendarRange}>No terms yet.</EmptyState>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {terms.map((t) => (
                <div key={t.id} className="candidate-row" style={{ marginBottom: 0 }}>
                  <div>
                    <div className="name">{t.name} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({t.academicYear})</span></div>
                    <div className="tags"><span className="badge gray">{t.startDate} → {t.endDate}</span></div>
                  </div>
                  {t.active ? (
                    <span className="badge green"><Check size={12} strokeWidth={2.25} /> Active</span>
                  ) : (
                    <button onClick={() => activate(t.id)}>Set Active</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
