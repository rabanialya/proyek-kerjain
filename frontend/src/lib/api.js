const API_BASE_URL = 'http://127.0.0.1:8000'

export function getAuthToken() {
  return sessionStorage.getItem('kerjain_token')
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : 'Terjadi kesalahan saat menghubungi server.'

    throw new Error(message)
  }

  return data
}

// Wrapper yang otomatis menyertakan Bearer token dari sessionStorage.
// Melempar Error jika token tidak ada.
export async function apiRequestAuth(path, options = {}) {
  const token = getAuthToken()

  if (!token) {
    throw new Error('Tidak ada sesi aktif. Silakan login kembali.')
  }

  return apiRequest(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
}

// Mengambil status profil pengguna dari /profiles/status.
// Mengembalikan { has_worker_profile, has_employer_profile } atau melempar Error.
export async function fetchProfileStatus() {
  return apiRequestAuth('/profiles/status')
}

// ─── Worker Profile ────────────────────────────────────────────────────────

// GET /profiles/worker — profil worker milik user yang sedang login.
export async function fetchMyWorkerProfile() {
  return apiRequestAuth('/profiles/worker')
}

// ─── Employer Profile ──────────────────────────────────────────────────────

// GET /profiles/employer — profil employer milik user yang sedang login.
export async function fetchMyEmployerProfile() {
  return apiRequestAuth('/profiles/employer')
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

// GET /tasks — semua task berstatus published (endpoint publik, tidak butuh token).
// Digunakan Worker untuk melihat tugas yang tersedia.
export async function fetchPublishedTasks() {
  return apiRequest('/tasks')
}

// POST /tasks — buat task baru (butuh Employer Profile).
// body: { category_id, title, description, location, worker_needed, wage_amount, payment_method }
export async function createTask(body) {
  return apiRequestAuth('/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// GET /tasks/:id — detail satu task published (endpoint publik).
// Melempar Error jika task tidak ditemukan atau bukan published.
export async function fetchTaskById(taskId) {
  return apiRequest(`/tasks/${taskId}`)
}

// POST /tasks/:id/publish — publish task dari status draft.
export async function publishTask(taskId) {
  return apiRequestAuth(`/tasks/${taskId}/publish`, { method: 'POST' })
}

// ─── Applications ──────────────────────────────────────────────────────────

// GET /applications/my — semua lamaran milik worker yang sedang login.
export async function fetchMyApplications() {
  return apiRequestAuth('/applications/my')
}

// POST /applications — lamar task.
// body: { task_id }
// Melempar Error jika sudah melamar, task tidak published, atau tidak punya Worker Profile.
export async function applyToTask(taskId) {
  return apiRequestAuth('/applications', {
    method: 'POST',
    body: JSON.stringify({ task_id: taskId }),
  })
}

// DELETE /applications/:id — batalkan lamaran yang masih pending.
// Hanya Worker pemilik lamaran yang boleh membatalkan.
// Melempar Error jika lamaran sudah diproses (accepted/rejected).
export async function cancelApplication(applicationId) {
  return apiRequestAuth(`/applications/${applicationId}`, {
    method: 'DELETE',
  })
}

// GET /tasks/my — semua task milik employer yang login (semua status: draft, published, closed).
export async function fetchMyTasks() {
  return apiRequestAuth('/tasks/my')
}

// GET /applications/task/:taskId — daftar lamaran untuk task tertentu, beserta data worker.
// Hanya bisa diakses oleh Employer pemilik task.
// Response: ApplicationWithWorkerResponse[] = { id, task_id, worker_id, status, applied_at, worker: WorkerSummary }
export async function fetchApplicationsByTask(taskId) {
  return apiRequestAuth(`/applications/task/${taskId}`)
}

// PUT /applications/:id/status — terima atau tolak lamaran (status: "accepted" | "rejected").
// Hanya Employer pemilik task yang boleh. Hanya bisa dari status "pending".
export async function updateApplicationStatus(applicationId, status) {
  return apiRequestAuth(`/applications/${applicationId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

// ─── Assignments ───────────────────────────────────────────────────────────

// GET /assignments/my — semua assignment yang melibatkan user (sebagai worker maupun employer).
export async function fetchMyAssignments() {
  return apiRequestAuth('/assignments/my')
}

// GET /assignments/worker/my-jobs — pekerjaan Worker yang sedang login, diperkaya
// dengan detail task, kategori, dan employer. Hanya assignment dari application accepted.
// Response: WorkerJobResponse[]
export async function fetchMyWorkerJobs() {
  return apiRequestAuth('/assignments/worker/my-jobs')
}

// GET /assignments/:id — detail satu assignment (worker atau employer pemilik).
export async function fetchAssignmentById(assignmentId) {
  return apiRequestAuth(`/assignments/${assignmentId}`)
}

// PUT /assignments/:id/status — ubah status assignment.
// Worker: in_progress | submitted. Employer: approved | disputed.
export async function updateAssignmentStatus(assignmentId, status) {
  return apiRequestAuth(`/assignments/${assignmentId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

// ─── Work Evidence ─────────────────────────────────────────────────────────

// POST /work-evidences/:assignmentId — upload satu atau beberapa file bukti.
// files: FileList atau array of File
// Mengembalikan array WorkEvidenceResponse: { id, assignment_id, file_url, uploaded_at }
export async function uploadWorkEvidence(assignmentId, files) {
  const token = getAuthToken()
  if (!token) {
    throw new Error('Tidak ada sesi aktif. Silakan login kembali.')
  }

  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }

  const response = await fetch(`${API_BASE_URL}/work-evidences/${assignmentId}`, {
    method: 'POST',
    headers: {
      // Jangan set Content-Type manual — browser akan set boundary multipart otomatis.
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : 'Gagal mengunggah bukti pekerjaan.'
    throw new Error(message)
  }

  return data
}

// GET /work-evidences/:assignmentId — ambil semua bukti milik assignment.
// Hanya bisa diakses oleh Worker pemilik atau Employer pemilik task.
export async function fetchWorkEvidences(assignmentId) {
  return apiRequestAuth(`/work-evidences/${assignmentId}`)
}

// ─── Categories ────────────────────────────────────────────────────────────

// GET /categories — semua kategori (digunakan saat membuat task).
export async function fetchCategories() {
  return apiRequest('/categories')
}

// ─── Update Profile ─────────────────────────────────────────────────────────

// PUT /profiles/worker — partial update profil Worker.
// Hanya field yang disertakan dalam body yang akan diperbarui.
// body: Partial<WorkerProfileFields>
export async function updateWorkerProfile(body) {
  return apiRequestAuth('/profiles/worker', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// PUT /profiles/employer — partial update profil Employer.
// Hanya field yang disertakan dalam body yang akan diperbarui.
// body: Partial<EmployerProfileFields>
export async function updateEmployerProfile(body) {
  return apiRequestAuth('/profiles/employer', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// GET /tasks/:id/owner — detail task milik employer yang login (semua status: draft, published, closed).
// Digunakan halaman Edit Task agar form bisa diisi data existing.
// Melempar Error jika task tidak ditemukan atau bukan milik user yang login.
export async function fetchMyTaskById(taskId) {
  return apiRequestAuth(`/tasks/${taskId}/owner`)
}

// PUT /tasks/:id — partial update task (hanya field yang dikirim yang diperbarui).
// body: Partial<{ category_id, title, description, location, worker_needed, wage_amount, payment_method }>
// Melempar Error jika task tidak ditemukan, bukan milik user, atau task sudah closed.
export async function updateTask(taskId, body) {
  return apiRequestAuth(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}
