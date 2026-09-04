import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { RefDataProvider } from './context/RefDataContext';
import { PermissionsProvider } from './context/PermissionsContext';
import DashboardPage from './pages/DashboardPage';
import ConfigPage from './pages/ConfigPage';
import AcademicPage from './pages/AcademicPage';
import TeachersPage from './pages/TeachersPage';
import TeacherDetailPage from './pages/TeacherDetailPage';
import MasterTimetablePage from './pages/MasterTimetablePage';
import DailyTimetablePage from './pages/DailyTimetablePage';
import MyTimetablePage from './pages/MyTimetablePage';
import AbsencesPage from './pages/AbsencesPage';
import ReliefDashboardPage from './pages/ReliefDashboardPage';
import AuditPage from './pages/AuditPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import GenerateTimetablePage from './pages/GenerateTimetablePage';
import LessonPlansPage from './pages/LessonPlansPage';
import LessonPlanMonitorPage from './pages/LessonPlanMonitorPage';
import TermsPage from './pages/TermsPage';
import GroupsPage from './pages/GroupsPage';
import ExamsPage from './pages/ExamsPage';
import RoomBookingsPage from './pages/RoomBookingsPage';
import SwapRequestsPage from './pages/SwapRequestsPage';
import ParentTimetablePage from './pages/ParentTimetablePage';

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <RefDataProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/config" element={<ConfigPage />} />
                <Route path="/academic" element={<AcademicPage />} />
                <Route path="/teachers" element={<TeachersPage />} />
                <Route path="/teachers/:id" element={<TeacherDetailPage />} />
                <Route path="/master-timetable" element={<MasterTimetablePage />} />
                <Route path="/generate-timetable" element={<GenerateTimetablePage />} />
                <Route path="/daily-timetable" element={<DailyTimetablePage />} />
                <Route path="/my-timetable" element={<MyTimetablePage />} />
                <Route path="/lesson-plans" element={<LessonPlansPage />} />
                <Route path="/lesson-plan-monitor" element={<LessonPlanMonitorPage />} />
                <Route path="/absences" element={<AbsencesPage />} />
                <Route path="/relief" element={<ReliefDashboardPage />} />
                <Route path="/swap-requests" element={<SwapRequestsPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/exams" element={<ExamsPage />} />
                <Route path="/room-bookings" element={<RoomBookingsPage />} />
                <Route path="/parent-timetable" element={<ParentTimetablePage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </RefDataProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}
