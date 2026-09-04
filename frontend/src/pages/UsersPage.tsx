import { useEffect, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { Permissions, Users } from '../api/client';
import { useRefData } from '../context/RefDataContext';
import { usePermissions } from '../context/PermissionsContext';
import { ROLE_LABEL } from '../components/Layout';
import type { PermissionKey, Role, RolePermissions, User } from '../types';

const ALL_ROLES: Role[] = ['ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'SECTIONAL_HEAD', 'GRADE_HEAD', 'CLASS_TEACHER', 'TEACHER'];

export default function UsersPage() {
  const rd = useRefData();
  const { refresh: refreshPermissions } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rolePerms, setRolePerms] = useState<RolePermissions | null>(null);
  const [permLabels, setPermLabels] = useState<Record<PermissionKey, string> | null>(null);
  const [togglingCell, setTogglingCell] = useState<string | null>(null);

  const load = () => Users.list().then(setUsers);
  useEffect(() => { load(); }, []);
  useEffect(() => {
    Permissions.get().then((d) => { setRolePerms(d.permissions); setPermLabels(d.labels); });
  }, []);

  const patch = (id: string, p: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...p } : u)));
  };

  const save = async (u: User) => {
    setSavingId(u.id);
    try {
      await Users.update(u.id, { role: u.role, teacherId: u.teacherId || undefined, gradeIds: u.gradeIds });
      load();
    } finally {
      setSavingId(null);
    }
  };

  const toggleGrade = (u: User, gradeId: string) => {
    const current = new Set(u.gradeIds ?? []);
    if (current.has(gradeId)) current.delete(gradeId); else current.add(gradeId);
    patch(u.id, { gradeIds: Array.from(current) });
  };

  const togglePermission = async (role: Role, key: PermissionKey) => {
    if (!rolePerms) return;
    const current = rolePerms[role] ?? [];
    const updated = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setRolePerms({ ...rolePerms, [role]: updated });
    setTogglingCell(`${role}|${key}`);
    try {
      await Permissions.updateRole(role, updated);
      refreshPermissions();
    } finally {
      setTogglingCell(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Users & Roles</h1>
          <p>Configurable role-based access — assign each account a role, scope Grade Heads / Sectional Heads, and control exactly what each role can access below.</p>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Linked Teacher</th><th>Scoped Grades</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td style={{ color: 'var(--text-dim)' }}>{u.email}</td>
                <td>
                  <select value={u.role} onChange={(e) => patch(u.id, { role: e.target.value as Role })}>
                    {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </td>
                <td>
                  <select value={u.teacherId ?? ''} onChange={(e) => patch(u.id, { teacherId: e.target.value })}>
                    <option value="">— none —</option>
                    {rd.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </td>
                <td className="pill-list">
                  {(u.role === 'GRADE_HEAD' || u.role === 'SECTIONAL_HEAD') ? (
                    rd.grades.map((g) => (
                      <span
                        key={g.id}
                        className={`badge ${(u.gradeIds ?? []).includes(g.id) ? 'blue' : 'gray'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleGrade(u, g.id)}
                      >
                        {g.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>n/a for this role</span>
                  )}
                </td>
                <td>
                  <button className="primary" disabled={savingId === u.id} onClick={() => save(u)}>
                    <Save size={13} strokeWidth={2.25} /> {savingId === u.id ? '…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={16} strokeWidth={2.25} /> Role Permissions
        </h3>
        <p style={{ marginTop: -6, marginBottom: 14, color: 'var(--text-dim)', fontSize: 12.5 }}>
          Click any cell to grant or revoke that capability for the role — changes apply immediately, school-wide, without touching code.
        </p>
        {!rolePerms || !permLabels ? (
          <p style={{ color: 'var(--text-dim)' }}>Loading…</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Permission</th>
                  {ALL_ROLES.map((r) => <th key={r} style={{ textAlign: 'center' }}>{ROLE_LABEL[r]}</th>)}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(permLabels) as PermissionKey[]).map((key) => (
                  <tr key={key}>
                    <td style={{ maxWidth: 260 }}>{permLabels[key]}</td>
                    {ALL_ROLES.map((r) => {
                      const checked = rolePerms[r]?.includes(key) ?? false;
                      const cellId = `${r}|${key}`;
                      return (
                        <td key={r} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={togglingCell === cellId}
                            onChange={() => togglePermission(r, key)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
