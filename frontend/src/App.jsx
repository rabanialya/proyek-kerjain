import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

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
 *
 * /                   → redirect ke /dashboard
 * *                   → redirect ke /dashboard (fallback)
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
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
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
