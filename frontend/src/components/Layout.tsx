import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  BookOpen,
  CalendarClock,
  CalendarRange,
  ClipboardCheck,
  ArrowLeftRight,
  DoorOpen,
  History,
  Layers,
  LayoutGrid,
  Mail,
  BarChart3,
  ClipboardList,
  NotebookPen,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import logo from '../assets/earrow-logo-white.png';
import type { PermissionKey, Role } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permission?: PermissionKey;
  requiresTeacher?: boolean;
  requiresParent?: boolean;
  hideForRoles?: Role[];
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutGrid, hideForRoles: ['PARENT'] },
      { to: '/parent-timetable', label: "My Child's Timetable", icon: CalendarClock, requiresParent: true },
    ],
  },
  {
    section: 'Timetable',
    items: [
      { to: '/my-timetable', label: 'My Timetable', icon: Timer, requiresTeacher: true },
      { to: '/master-timetable', label: 'Master Timetable', icon: CalendarClock, hideForRoles: ['PARENT'] },
      { to: '/generate-timetable', label: 'Generate Timetable', icon: Sparkles, permission: 'GENERATE_TIMETABLE' },
      { to: '/daily-timetable', label: 'Daily Timetable', icon: SlidersHorizontal, hideForRoles: ['PARENT'] },
      { to: '/relief', label: 'Relief Dashboard', icon: RefreshCcw, permission: 'VIEW_RELIEF_DASHBOARD' },
      { to: '/absences', label: 'Absences', icon: Mail, hideForRoles: ['PARENT'] },
      { to: '/swap-requests', label: 'Swap Requests', icon: ArrowLeftRight, hideForRoles: ['PARENT'] },
      { to: '/lesson-plans', label: 'My Lesson Plans', icon: NotebookPen, requiresTeacher: true },
      { to: '/exams', label: 'Exam Timetable', icon: ClipboardCheck, permission: 'MANAGE_EXAMS' },
      { to: '/room-bookings', label: 'Room & Resource Bookings', icon: DoorOpen, permission: 'MANAGE_ROOM_BOOKINGS' },
    ],
  },
  {
    section: 'Administration',
    items: [
      { to: '/config', label: 'School Configuration', icon: Settings2, permission: 'VIEW_SCHOOL_CONFIG' },
      { to: '/academic', label: 'Academic Structure', icon: BookOpen, permission: 'VIEW_ACADEMIC_STRUCTURE' },
      { to: '/groups', label: 'Student Groups', icon: Layers, permission: 'VIEW_ACADEMIC_STRUCTURE' },
      { to: '/terms', label: 'Academic Terms', icon: CalendarRange, permission: 'MANAGE_TERMS' },
      { to: '/teachers', label: 'Teachers', icon: Users, hideForRoles: ['PARENT'] },
      { to: '/lesson-plan-monitor', label: 'Lesson Plan Monitor', icon: ClipboardList, permission: 'MONITOR_LESSON_PLANS' },
      { to: '/reports', label: 'Reports & Analytics', icon: BarChart3, permission: 'VIEW_REPORTS' },
      { to: '/audit', label: 'Audit Log', icon: History, permission: 'VIEW_AUDIT_LOG' },
      { to: '/users', label: 'Users & Roles', icon: ShieldCheck, permission: 'MANAGE_USERS' },
      { to: '/notifications', label: 'Notifications', icon: Bell, hideForRoles: ['PARENT'] },
    ],
  },
];

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  PRINCIPAL: 'Principal',
  VICE_PRINCIPAL: 'Vice Principal',
  SECTIONAL_HEAD: 'Sectional Head',
  GRADE_HEAD: 'Grade Head',
  CLASS_TEACHER: 'Class Teacher',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
};

function initials(name: string) {
  const parts = name.replace(/\(.*\)/, '').trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

export default function Layout() {
  const { users, currentUser, setCurrentUser, loading, backendUnreachable } = useAuth();
  const { hasPermission, loading: permsLoading } = usePermissions();
  const location = useLocation();

  if (backendUnreachable) {
    return (
      <div className="empty-state" style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>This is a static front-end preview.</p>
        <p>
          It couldn't reach a live backend API, so there's no data to show. Clone the repository and run both the
          backend and frontend locally to use the full app.
        </p>
      </div>
    );
  }

  if (loading || permsLoading || !currentUser) {
    return <div className="empty-state">Loading…</div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" title="eArrow">
          <img src={logo} alt="eArrow" className="brand-logo" />
        </div>
        <nav>
          {NAV.map((sec) => {
            const items = sec.items.filter(
              (i) =>
                (!i.permission || hasPermission(i.permission)) &&
                (!i.requiresTeacher || !!currentUser.teacherId) &&
                (!i.requiresParent || currentUser.role === 'PARENT') &&
                !(i.hideForRoles ?? []).includes(currentUser.role),
            );
            if (!items.length) return null;
            return (
              <div key={sec.section}>
                <div className="section-label">{sec.section}</div>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="nav-active-pill"
                            className="nav-active-pill"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          />
                        )}
                        <span className="nav-item-content">
                          <span className="icon"><item.icon size={16} strokeWidth={2} /></span>
                          {item.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="title">eArrow TTMS</div>
          <div className="user-switch">
            <span className="badge blue">{ROLE_LABEL[currentUser.role]}</span>
            <div className="avatar">{initials(currentUser.name)}</div>
            <select
              value={currentUser.id}
              onChange={(e) => {
                const u = users.find((x) => x.id === e.target.value);
                if (u) setCurrentUser(u);
              }}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </header>
        <div className="content">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export { ROLE_LABEL };
