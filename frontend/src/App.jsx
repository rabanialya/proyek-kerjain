import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminProtectedRoute from './components/AdminProtectedRoute'

import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardRole from './pages/DashboardRole'
import WorkerDashboard from './pages/WorkerDashboard'
import EmployerDashboard from './pages/EmployerDashboard'
import WorkerProfileForm from './pages/WorkerProfileForm'
import EmployerProfileForm from './pages/EmployerProfileForm'
import WorkerProfilePage from './pages/WorkerProfilePage'
import EmployerProfilePage from './pages/EmployerProfilePage'
import WorkerProfileEditPage from './pages/WorkerProfileEditPage'
import EmployerProfileEditPage from './pages/EmployerProfileEditPage'
import TaskListPage from './pages/TaskListPage'
import TaskDetailPage from './pages/TaskDetailPage'
import ApplicationManagement from './pages/ApplicationManagement'
import TaskApplications from './pages/TaskApplications'
import CreateTaskPage from './pages/CreateTaskPage'
import EditTaskPage from './pages/EditTaskPage'
import MyJobsPage from './pages/MyJobsPage'
import JobDetailPage from './pages/JobDetailPage'
import EmployerJobsPage from './pages/EmployerJobsPage'
import EmployerJobDetailPage from './pages/EmployerJobDetailPage'
import NotificationsPage from './pages/NotificationsPage'
import PublicWorkerProfilePage from './pages/PublicWorkerProfilePage'
import PublicEmployerProfilePage from './pages/PublicEmployerProfilePage'

// Admin
import AdminLayout from './layouts/AdminLayout'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage'
import AdminPaymentDetailPage from './pages/admin/AdminPaymentDetailPage'
import AdminDisputesPage from './pages/admin/AdminDisputesPage'
import AdminDisputeDetailPage from './pages/admin/AdminDisputeDetailPage'
import AdminActivityLogsPage from './pages/admin/AdminActivityLogsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage'
import AdminTaskSettingsPage from './pages/admin/AdminTaskSettingsPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminReportDetailPage from './pages/admin/AdminReportDetailPage'
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage'

/**
 * Routing struktur:
 *
 * /login              → Login
 * /register           → Register
 *
 * (protected — butuh login)
 * /dashboard          → DashboardRole (pilih peran)
 * /worker/setup       → WorkerProfileForm
 * /employer/setup     → EmployerProfileForm
 * /worker             → WorkerDashboard
 * /employer           → EmployerDashboard
 * /employer/applications          → ApplicationManagement (daftar task employer)
 * /employer/applications/:taskId  → TaskApplications (lamaran per task)
 * /tasks              → TaskListPage  (daftar tugas untuk Worker)
 * /tasks/create       → CreateTaskPage (Employer membuat task baru)
 * /tasks/:taskId/edit → EditTaskPage   (Employer mengedit task miliknya)
 * /tasks/:taskId      → TaskDetailPage (detail satu tugas)
 * /worker/jobs        → MyJobsPage     (pekerjaan yang diterima, worker only)
 * /worker/jobs/:assignmentId → JobDetailPage (detail satu pekerjaan)
 * /employer/jobs       → EmployerJobsPage     (pekerjaan aktif employer)
 * /employer/jobs/:assignmentId → EmployerJobDetailPage (review bukti & approve)
 * /profiles/worker/:profileId  → PublicWorkerProfilePage (profil publik worker)
 * /profiles/employer/:profileId → PublicEmployerProfilePage (profil publik employer)
 *
 * (admin only — butuh is_admin = true)
 * /admin              → AdminDashboardPage
 * /admin/payments     → AdminPaymentsPage
 * /admin/payments/:paymentId  → AdminPaymentDetailPage
 * /admin/disputes     → AdminDisputesPage
 * /admin/disputes/:disputeId  → AdminDisputeDetailPage
 * /admin/activity-logs → AdminActivityLogsPage
 * /admin/users        → AdminUsersPage
 * /admin/users/:userId → AdminUserDetailPage
 * /admin/task-settings → AdminTaskSettingsPage
 * /admin/reports      → AdminReportsPage
 * /admin/reports/:reportId → AdminReportDetailPage
 *
 * /                   → redirect ke /dashboard
 * *                   → redirect ke /dashboard (fallback)
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Landing page — publik, redirect otomatis jika sudah login */}
          <Route path="/" element={<LandingPage />} />

          {/* Halaman publik */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Halaman yang membutuhkan autentikasi */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardRole />} />
            <Route path="/worker/setup" element={<WorkerProfileForm />} />
            <Route path="/employer/setup" element={<EmployerProfileForm />} />
            <Route path="/worker" element={<WorkerDashboard />} />
            <Route path="/employer" element={<EmployerDashboard />} />
            <Route path="/worker/profile" element={<WorkerProfilePage />} />
            <Route path="/worker/profile/edit" element={<WorkerProfileEditPage />} />
            <Route path="/employer/profile" element={<EmployerProfilePage />} />
            <Route path="/employer/profile/edit" element={<EmployerProfileEditPage />} />
            <Route path="/employer/applications" element={<ApplicationManagement />} />
            <Route path="/employer/applications/:taskId" element={<TaskApplications />} />
            <Route path="/tasks" element={<TaskListPage />} />
            <Route path="/tasks/create" element={<CreateTaskPage />} />
            <Route path="/tasks/:taskId/edit" element={<EditTaskPage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/worker/jobs" element={<MyJobsPage />} />
            <Route path="/worker/jobs/:assignmentId" element={<JobDetailPage />} />
            <Route path="/employer/jobs" element={<EmployerJobsPage />} />
            <Route path="/employer/jobs/:assignmentId" element={<EmployerJobDetailPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profiles/worker/:profileId" element={<PublicWorkerProfilePage />} />
            <Route path="/profiles/employer/:profileId" element={<PublicEmployerProfilePage />} />
          </Route>

          {/* Halaman Admin — hanya user dengan is_admin = true */}
          <Route element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/payments" element={<AdminPaymentsPage />} />
              <Route path="/admin/payments/:paymentId" element={<AdminPaymentDetailPage />} />
              <Route path="/admin/disputes" element={<AdminDisputesPage />} />
              <Route path="/admin/disputes/:disputeId" element={<AdminDisputeDetailPage />} />
              <Route path="/admin/activity-logs" element={<AdminActivityLogsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
              <Route path="/admin/task-settings" element={<AdminTaskSettingsPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/reports/:reportId" element={<AdminReportDetailPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
            </Route>
          </Route>

          {/* Fallback — URL tidak dikenal */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
