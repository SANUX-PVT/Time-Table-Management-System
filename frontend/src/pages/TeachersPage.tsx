import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Plus, Search } from 'lucide-react';
import { useRefData } from '../context/RefDataContext';
import { colorFor } from '../utils/colors';
import { TeacherModal } from '../components/TeacherModal';

export default function TeachersPage() {
  const rd = useRefData();
  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);

  const filtered = rd.teachers.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Teachers</h1>
          <p>{rd.teachers.length} teachers on staff.</p>
        </div>
        <button className="primary" onClick={() => setShowNew(true)}><Plus size={15} strokeWidth={2.5} /> New Teacher</button>
      </div>

      <div className="toolbar">
        <div className="input-icon-wrap" style={{ width: 260 }}>
          <Search size={14} strokeWidth={2} className="input-icon" />
          <input placeholder="Search teacher…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: '100%' }} />
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Employee No.</th><th>Subjects</th><th>Grades</th><th>Classes</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td><Link to={`/teachers/${t.id}`}>{t.name}</Link></td>
                <td>{t.employeeNo}</td>
                <td className="pill-list">
                  {t.subjectIds.map((sid) => {
                    const c = colorFor(sid);
                    return (
                      <span key={sid} className="badge" style={{ background: c.bg, color: c.fg }}>
                        {rd.subjectName(sid)}
                      </span>
                    );
                  })}
                </td>
                <td>{t.gradeIds.map((g) => rd.gradeName(g)).join(', ')}</td>
                <td>{t.classIds.length ? t.classIds.map((c) => rd.className(c)).join(', ') : 'All (grade-wide)'}</td>
                <td>{t.active ? <span className="badge green">Active</span> : <span className="badge gray">Inactive</span>}</td>
                <td><Link to={`/teachers/${t.id}`}><button><Eye size={14} strokeWidth={2} /> View</button></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <TeacherModal
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); rd.refresh(); }}
        />
      )}
    </div>
  );
}
