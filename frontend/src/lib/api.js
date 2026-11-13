const API_BASE_URL = 'http://127.0.0.1:8000'

export function getAuthToken() {
  return sessionStorage.getItem('kerjain_token')
}

export async function apiRequest(path, options = {}) {
  // Jika body adalah FormData, jangan set Content-Type — browser/fetch mengisi
  // boundary multipart secara otomatis. Set JSON hanya untuk body non-FormData.
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    let message = 'Terjadi kesalahan saat menghubungi server.'

    if (typeof data?.detail === 'string') {
      message = data.detail
    } else if (Array.isArray(data?.detail)) {
      // Pydantic validation error — detail berupa array of { loc, msg, type }
      message = data.detail
        .map((err) => {
          const field = Array.isArray(err.loc)
            ? err.loc.filter((s) => s !== 'body').join(' → ')
            : String(err.loc ?? '')
          return field ? `${field}: ${err.msg}` : err.msg
        })
        .join('; ')
    }

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

// ─── Avatar / Foto Profil ──────────────────────────────────────────────────

/**
 * Upload atau ganti foto profil user yang sedang login.
 * POST /profiles/avatar  (multipart/form-data, field: "file")
 *
 * @param {File} file  File gambar (JPEG / PNG / WEBP, maks 5 MB)
 * @returns {Promise<{ avatar_url: string, message: string }>}
 */
export async function uploadAvatar(file) {
  const token = getAuthToken()
  if (!token) throw new Error('Tidak ada sesi aktif. Silakan login kembali.')

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/profiles/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((e) => e.msg ?? String(e)).join('; ')
          : 'Gagal mengunggah foto profil.'
    throw new Error(message)
  }

  return data
}

/**
 * Ambil foto profil milik user yang sedang login sebagai object URL sementara.
 * GET /files/avatar
 * Revoke object URL setelah tidak diperlukan: URL.revokeObjectURL(url)
 *
 * @returns {Promise<string>}  Object URL sementara
 */
export async function fetchMyAvatarUrl() {
  const token = getAuthToken()
  if (!token) throw new Error('Tidak ada sesi aktif. Silakan login kembali.')

  const response = await fetch(`${API_BASE_URL}/files/avatar`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    // 404 berarti belum ada foto — kembalikan null, bukan throw
    if (response.status === 404) return null
    const data = await response.json().catch(() => null)
    const message =
      typeof data?.detail === 'string' ? data.detail : 'Gagal memuat foto profil.'
    throw new Error(message)
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/**
 * Ambil foto profil user lain berdasarkan user ID sebagai object URL sementara.
 * GET /files/avatar/{userId}
 *
 * @param {string} userId  UUID user
 * @returns {Promise<string|null>}  Object URL sementara, atau null jika belum ada foto
 */
export async function fetchUserAvatarUrl(userId) {
  const token = getAuthToken()
  if (!token) throw new Error('Tidak ada sesi aktif. Silakan login kembali.')

  const response = await fetch(`${API_BASE_URL}/files/avatar/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    if (response.status === 404) return null
    const data = await response.json().catch(() => null)
    const message =
      typeof data?.detail === 'string' ? data.detail : 'Gagal memuat foto profil.'
    throw new Error(message)
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

// GET /tasks — semua task berstatus published (endpoint publik, tidak butuh token).
// Digunakan Worker untuk melihat tugas yang tersedia.
export async function fetchPublishedTasks() {
  return apiRequest('/tasks')
}

// POST /tasks — buat task baru (butuh Employer Profile).
// body: { category_id, title, description?, work_type?, location?,
//         worker_needed, wage_amount, wage_rate?, payment_method,
//         application_deadline?, work_date?, work_time_start?, work_time_end?,
//         work_deadline_days?, required_skills?, requirements_flags?, requirements_note? }
// Field baru semua opsional — task dapat disimpan sebagai draft tanpa mengisinya.
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

// POST /assignments — buat assignment dari application yang sudah accepted.
// body: { application_id }
// Hanya Employer pemilik task yang boleh. Application harus berstatus accepted.
// Melempar Error jika assignment sudah ada untuk application tersebut.
export async function createAssignment(applicationId) {
  return apiRequestAuth('/assignments', {
    method: 'POST',
    body: JSON.stringify({ application_id: applicationId }),
  })
}

// GET /assignments/worker/my-jobs — pekerjaan Worker yang sedang login, diperkaya
// dengan detail task, kategori, dan employer. Hanya assignment dari application accepted.
// Response: WorkerJobResponse[]
export async function fetchMyWorkerJobs() {
  return apiRequestAuth('/assignments/worker/my-jobs')
}

// GET /assignments/employer/my-jobs — semua assignment pada task milik Employer yang login,
// diperkaya dengan detail task, kategori, dan worker.
// Response: EmployerJobResponse[]
export async function fetchEmployerJobs() {
  return apiRequestAuth('/assignments/employer/my-jobs')
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

// POST /payments/settle/:assignmentId — buat WORK_PAYMENT + PLATFORM_FEE sekaligus.
// Hanya bisa dipanggil setelah assignment berstatus 'approved'.
// Employer pemilik task yang boleh memanggil ini.
// method: saat ini hanya 'CASH' yang didukung.
// Response: [PaymentResponse, PaymentResponse] (WORK_PAYMENT dan PLATFORM_FEE)
export async function settleAssignmentPayment(assignmentId, method = 'CASH') {
  return apiRequestAuth(`/payments/settle/${assignmentId}`, {
    method: 'POST',
    body: JSON.stringify({ method }),
  })
}

// ─── Categories ────────────────────────────────────────────────────────────

// GET /categories — semua kategori (digunakan saat membuat task).
export async function fetchCategories() {
  return apiRequest('/categories')
}

// POST /categories — buat kategori baru dengan nama yang diinput employer.
// Jika kategori dengan nama yang sama sudah ada, backend mengembalikan error 400.
// body: { name: string }
// Response: CategoryResponse { id, name, is_active }
export async function createCategory(name) {
  return apiRequestAuth('/categories', {
    method: 'POST',
    body: JSON.stringify({ name: name.trim() }),
  })
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

/**
 * Upload dokumen Worker ke server.
 * POST /profiles/worker/documents/{docType}  (multipart/form-data, field: "file")
 *
 * @param {'cv'|'id'} docType  Jenis dokumen: 'cv' (CV/Resume) atau 'id' (KTP/KTM)
 * @param {File} file          File yang akan diunggah (JPG/PNG/WEBP/PDF, maks 10 MB)
 * @returns {Promise<{ doc_type: string, message: string }>}
 */
export async function uploadWorkerDocument(docType, file) {
  const token = getAuthToken()
  if (!token) throw new Error('Tidak ada sesi aktif. Silakan login kembali.')

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/profiles/worker/documents/${docType}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((e) => e.msg ?? String(e)).join('; ')
          : 'Gagal mengunggah dokumen.'
    throw new Error(message)
  }

  return data
}

/**
 * Ambil file dokumen Worker milik user yang sedang login sebagai object URL sementara.
 * GET /files/worker-docs/{docType}
 * Revoke object URL setelah tidak diperlukan: URL.revokeObjectURL(url)
 *
 * @param {'cv'|'id'} docType  Jenis dokumen: 'cv' atau 'id'
 * @returns {Promise<string|null>}  Object URL sementara, atau null jika belum ada
 */
export async function fetchWorkerDocumentUrl(docType) {
  const token = getAuthToken()
  if (!token) throw new Error('Tidak ada sesi aktif. Silakan login kembali.')

  const response = await fetch(`${API_BASE_URL}/files/worker-docs/${docType}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    if (response.status === 404) return null
    const data = await response.json().catch(() => null)
    const message =
      typeof data?.detail === 'string' ? data.detail : 'Gagal memuat dokumen.'
    throw new Error(message)
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
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
// body: Partial<{ category_id, title, description, work_type, location,
//                 worker_needed, wage_amount, wage_rate, payment_method,
//                 application_deadline, work_date, work_time_start, work_time_end,
//                 work_deadline_days, required_skills, requirements_flags, requirements_note }>
// Melempar Error jika task tidak ditemukan, bukan milik user, atau task sudah closed.
export async function updateTask(taskId, body) {
  return apiRequestAuth(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// ─── Payment (alur baru — transfer bank manual) ─────────────────────────────

// POST /payments/settle/:assignmentId
// Membuat WORK_PAYMENT + PLATFORM_FEE sekaligus.
// Response: PaymentSettlementResponse {
//   work_payment, platform_fee,
//   worker_wage, platform_fee_amount, total_transfer,
//   reference_code, platform_bank_info
// }
export async function settlePayment(assignmentId) {
  return apiRequestAuth(`/payments/settle/${assignmentId}`, {
    method: 'POST',
    body: JSON.stringify({ method: 'BANK_TRANSFER' }),
  })
}

// POST /payments/:paymentId/upload-proof — Employer upload bukti transfer.
// file: File object
// Response: PaymentUploadProofResponse { id, status, transfer_proof_url, message }
export async function uploadTransferProof(paymentId, file) {
  const token = getAuthToken()
  if (!token) throw new Error('Tidak ada sesi aktif. Silakan login kembali.')

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/upload-proof`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : 'Gagal mengunggah bukti transfer.'
    throw new Error(message)
  }

  return data
}

// GET /payments/by-assignment/:assignmentId
// Mengembalikan semua payment record untuk satu assignment.
// Worker hanya mendapat WORK_PAYMENT; Employer mendapat keduanya.
export async function fetchPaymentsByAssignment(assignmentId) {
  return apiRequestAuth(`/payments/by-assignment/${assignmentId}`)
}

// GET /payments/:paymentId — detail satu payment record.
export async function fetchPaymentById(paymentId) {
  return apiRequestAuth(`/payments/${paymentId}`)
}

// ─── Admin API ─────────────────────────────────────────────────────────────
// Semua fungsi di bawah memerlukan token Admin yang valid.
// Backend memvalidasi get_current_admin() pada setiap endpoint.

// GET /admin/stats — statistik ringkasan platform (agregat, bukan semua data).
export async function adminFetchStats() {
  return apiRequestAuth('/admin/stats')
}

// ── Admin: Users ────────────────────────────────────────────────────────────

// GET /admin/users — semua pengguna terdaftar.
export async function adminFetchUsers() {
  return apiRequestAuth('/admin/users')
}

// GET /admin/users/:userId — detail satu pengguna.
export async function adminFetchUserDetail(userId) {
  return apiRequestAuth(`/admin/users/${userId}`)
}

// PUT /admin/users/:userId/status — aktifkan atau nonaktifkan pengguna.
// body: { is_active: boolean }
export async function adminUpdateUserStatus(userId, isActive) {
  return apiRequestAuth(`/admin/users/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ is_active: isActive }),
  })
}

// ── Admin: Payments ─────────────────────────────────────────────────────────

// GET /admin/payments — semua payment, diurutkan terbaru dulu.
export async function adminFetchPayments() {
  return apiRequestAuth('/admin/payments')
}

// GET /admin/payments/awaiting — WORK_PAYMENT berstatus awaiting_verification.
export async function adminFetchPaymentsAwaiting() {
  return apiRequestAuth('/admin/payments/awaiting')
}

// GET /admin/payments/:paymentId — detail satu payment.
export async function adminFetchPaymentDetail(paymentId) {
  return apiRequestAuth(`/admin/payments/${paymentId}`)
}

// PUT /admin/payments/:paymentId/verify — konfirmasi dana masuk ke rekening platform.
// body: { notes?: string }
// Hanya berlaku untuk WORK_PAYMENT berstatus pending atau awaiting_verification.
// Assignment yang masih disputed diblokir.
export async function adminVerifyPayment(paymentId, body = {}) {
  return apiRequestAuth(`/admin/payments/${paymentId}/verify`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// PUT /admin/payments/:paymentId/reject — tolak bukti transfer Employer.
// body: { rejection_reason: string } — wajib, minimal 5 karakter.
// Hanya berlaku untuk WORK_PAYMENT berstatus awaiting_verification.
export async function adminRejectPayment(paymentId, body) {
  return apiRequestAuth(`/admin/payments/${paymentId}/reject`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// PUT /admin/payments/:paymentId/disburse — konfirmasi pencairan ke Worker.
// Menerima multipart/form-data karena bisa disertai file bukti transfer keluar.
// fields:
//   disbursement_reference?: string   — referensi transaksi bank keluar
//   disbursement_notes?: string       — catatan Admin (opsional)
//   proof_file?: File                 — bukti transfer keluar (JPG/PNG/WEBP/PDF, maks 10 MB)
// Hanya berlaku untuk WORK_PAYMENT berstatus verified.
// Assignment harus approved dan tidak ada dispute open.
export async function adminDisbursePayment(paymentId, { disbursementReference, disbursementNotes, proofFile } = {}) {
  const formData = new FormData()
  if (disbursementReference) formData.append('disbursement_reference', disbursementReference)
  if (disbursementNotes) formData.append('disbursement_notes', disbursementNotes)
  if (proofFile) formData.append('proof_file', proofFile)

  return apiRequestAuth(`/admin/payments/${paymentId}/disburse`, {
    method: 'PUT',
    body: formData,
    // Content-Type TIDAK diset manual — browser/fetch mengisi boundary multipart otomatis
  })
}

// ─── Secure File Access ────────────────────────────────────────────────────
// Semua fungsi di bawah mengambil file sensitif melalui endpoint terlindungi.
// Tidak ada URL publik — backend memverifikasi token dan kepemilikan sebelum
// mengirimkan file.

/**
 * Mengambil file bukti kerja Worker sebagai Blob object URL.
 * Endpoint: GET /files/work-evidence/{evidenceId}
 *
 * @param {string} evidenceId  UUID evidence dari WorkEvidenceResponse.id
 * @returns {Promise<string>}  Object URL sementara (revoke setelah digunakan)
 */
export async function fetchWorkEvidenceFile(evidenceId) {
  const token = getAuthToken()
  if (!token) throw new Error('Tidak ada sesi aktif. Silakan login kembali.')

  const response = await fetch(`${API_BASE_URL}/files/work-evidence/${evidenceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : 'Gagal mengakses file bukti kerja.'
    throw new Error(message)
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/**
 * Mengambil file bukti transfer masuk (Employer → Platform) sebagai Blob object URL.
 * Endpoint: GET /files/transfer-proof/{paymentId}
 * Hanya Employer pemilik task dan Admin yang dapat mengakses.
 *
 * @param {string} paymentId  UUID payment dari PaymentResponse.id
 * @returns {Promise<string>}  Object URL sementara (revoke setelah digunakan)
 */
export async function fetchTransferProofFile(paymentId) {
  const token = getAuthToken()
  if (!token) throw new Error('Tidak ada sesi aktif. Silakan login kembali.')

  const response = await fetch(`${API_BASE_URL}/files/transfer-proof/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : 'Gagal mengakses bukti transfer.'
    throw new Error(message)
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/**
 * Mengambil file bukti pencairan (Platform → Worker) sebagai Blob object URL.
 * Endpoint: GET /files/disbursement-proof/{paymentId}
 * Worker, Employer, dan Admin dapat mengakses sesuai kepemilikan.
 *
 * @param {string} paymentId  UUID payment dari PaymentResponse.id
 * @returns {Promise<string>}  Object URL sementara (revoke setelah digunakan)
 */
export async function fetchDisbursementProofFile(paymentId) {
  const token = getAuthToken()
  if (!token) throw new Error('Tidak ada sesi aktif. Silakan login kembali.')

  const response = await fetch(`${API_BASE_URL}/files/disbursement-proof/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message =
      typeof data?.detail === 'string'
        ? data.detail
        : 'Gagal mengakses bukti pencairan.'
    throw new Error(message)
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

// GET /payments/:paymentId/disbursement-proof
// DEPRECATED — endpoint backend sudah tidak aktif (410 Gone).
// Gunakan fetchDisbursementProofFile() sebagai gantinya.
// Fungsi ini dipertahankan hanya untuk referensi; jangan dipanggil dari komponen baru.
/** @deprecated Gunakan fetchDisbursementProofFile() */
export async function fetchDisbursementProof(paymentId) {
  // Langsung arahkan ke endpoint baru agar tidak ada kode yang masih pakai ini
  return fetchDisbursementProofFile(paymentId)
}

// ─── Disputes (Employer) ───────────────────────────────────────────────────

// POST /disputes — Employer mengajukan dispute untuk assignment yang berstatus submitted.
// body: { assignment_id: string, reason: string, description?: string }
// Hanya Employer pemilik task yang bisa memanggil ini.
// Assignment harus berstatus "submitted" — backend memvalidasi.
export async function createDispute(body) {
  return apiRequestAuth('/disputes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// GET /disputes/my — semua dispute yang diajukan oleh user yang login.
export async function fetchMyDisputes() {
  return apiRequestAuth('/disputes/my')
}

// GET /disputes/:disputeId — detail satu dispute (Employer atau Worker terkait).
export async function fetchDisputeById(disputeId) {
  return apiRequestAuth(`/disputes/${disputeId}`)
}

// ── Admin: Disputes ─────────────────────────────────────────────────────────

// GET /admin/disputes — semua dispute, diurutkan terbaru dulu.
export async function adminFetchDisputes() {
  return apiRequestAuth('/admin/disputes')
}

// GET /admin/disputes/:disputeId — detail satu dispute.
export async function adminFetchDisputeDetail(disputeId) {
  return apiRequestAuth(`/admin/disputes/${disputeId}`)
}

// PUT /admin/disputes/:disputeId/resolve — selesaikan dispute.
// body: { decision: string, resolution: string }
// decision harus salah satu dari: approve_work | reject_work | needs_revision
// resolution wajib diisi, minimal 10 karakter.
export async function adminResolveDispute(disputeId, body) {
  return apiRequestAuth(`/admin/disputes/${disputeId}/resolve`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// ── Admin: Activity Logs ────────────────────────────────────────────────────

// GET /admin/activity-logs — semua activity log, diurutkan terbaru dulu.
export async function adminFetchActivityLogs() {
  return apiRequestAuth('/admin/activity-logs')
}

// GET /admin/activity-logs/:logId — detail satu activity log.
export async function adminFetchActivityLogDetail(logId) {
  return apiRequestAuth(`/admin/activity-logs/${logId}`)
}

// ── Admin: Categories ───────────────────────────────────────────────────────

// GET /admin/categories — semua kategori (termasuk yang tidak aktif).
export async function adminFetchCategories() {
  return apiRequestAuth('/admin/categories')
}

// POST /admin/categories — buat kategori baru.
// body: { name: string }
export async function adminCreateCategory(body) {
  return apiRequestAuth('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// PUT /admin/categories/:categoryId — perbarui kategori.
// body: { name?: string, is_active?: boolean }
export async function adminUpdateCategory(categoryId, body) {
  return apiRequestAuth(`/admin/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// DELETE /admin/categories/:categoryId — hapus kategori.
export async function adminDeleteCategory(categoryId) {
  return apiRequestAuth(`/admin/categories/${categoryId}`, {
    method: 'DELETE',
  })
}

// ── Admin: Tasks ────────────────────────────────────────────────────────────

// GET /admin/tasks — semua task (semua status).
export async function adminFetchTasks() {
  return apiRequestAuth('/admin/tasks')
}

// GET /admin/tasks/:taskId — detail satu task.
export async function adminFetchTaskDetail(taskId) {
  return apiRequestAuth(`/admin/tasks/${taskId}`)
}

// PUT /admin/tasks/:taskId/status — ubah status task (draft/published/closed).
// Menggunakan FormData karena endpoint menerima Form parameter.
export async function adminUpdateTaskStatus(taskId, status) {
  const formData = new FormData()
  formData.append('status', status)
  return apiRequestAuth(`/admin/tasks/${taskId}/status`, {
    method: 'PUT',
    body: formData,
  })
}

// ── Admin: Reports ──────────────────────────────────────────────────────────

// GET /admin/reports — semua laporan.
export async function adminFetchReports() {
  return apiRequestAuth('/admin/reports')
}

// GET /admin/reports/:reportId — detail satu laporan.
export async function adminFetchReportDetail(reportId) {
  return apiRequestAuth(`/admin/reports/${reportId}`)
}

// PUT /admin/reports/:reportId/status — perbarui status + catatan laporan.
// body: { status, admin_notes?, resolution? }
// status: open | pending | under_review | resolved | rejected
export async function adminUpdateReportStatus(reportId, body) {
  return apiRequestAuth(`/admin/reports/${reportId}/status`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// PUT /admin/reports/:reportId/resolve — [deprecated] selesaikan laporan.
// Gunakan adminUpdateReportStatus dengan status 'resolved'.
export async function adminResolveReport(reportId, body) {
  return apiRequestAuth(`/admin/reports/${reportId}/resolve`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// POST /reports — pengguna membuat laporan baru.
// body: { reported_user_id?, reported_task_id?, reason_category?, subject, description }
export async function createReport(body) {
  return apiRequestAuth('/reports', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// GET /reports/my — laporan yang dibuat user yang login.
export async function fetchMyReports() {
  return apiRequestAuth('/reports/my')
}


// ─── Notifications ──────────────────────────────────────────────────────────
// Semua endpoint notifikasi memerlukan token user yang valid.
// Backend memfilter notifikasi berdasarkan user_id == current_user.id,
// sehingga pengguna hanya melihat notifikasinya sendiri (tidak ada akses
// lintas pengguna). Jangan menduplikasi mekanisme token — gunakan apiRequestAuth.

// GET /notifications — semua notifikasi user yang sedang login, urut terbaru
// dulu (order_by created_at.desc). Response: NotificationResponse[]
export async function fetchNotifications() {
  return apiRequestAuth('/notifications')
}

// GET /notifications/unread — notifikasi yang belum dibaca (is_read == false).
// Response: NotificationResponse[]
export async function fetchUnreadNotifications() {
  return apiRequestAuth('/notifications/unread')
}

// PUT /notifications/:notificationId/read — tandai satu notifikasi sebagai
// sudah dibaca. Backend memverifikasi kepemilikan (403 jika bukan milik user).
// Response: NotificationResponse (dengan is_read = true)
export async function markNotificationRead(notificationId) {
  return apiRequestAuth(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  })
}

// ─── Public Profiles ───────────────────────────────────────────────────────

// GET /profiles/worker/:profileId/public — profil publik Worker berdasarkan WorkerProfile ID.
// Membutuhkan autentikasi. Mengembalikan informasi publik saja (tanpa email/telepon).
// profileId: UUID dari WorkerProfile (bukan User ID)
export async function fetchPublicWorkerProfile(profileId) {
  return apiRequestAuth(`/profiles/worker/${profileId}/public`)
}

// GET /profiles/employer/:profileId/public — profil publik Employer berdasarkan EmployerProfile ID.
// Membutuhkan autentikasi. Mengembalikan informasi publik saja (tanpa contact_email/whatsapp).
// profileId: UUID dari EmployerProfile (bukan User ID)
export async function fetchPublicEmployerProfile(profileId) {
  return apiRequestAuth(`/profiles/employer/${profileId}/public`)
}

// ── Admin: Platform Bank Info ───────────────────────────────────────────────

// GET /admin/platform/bank-info — ambil konfigurasi rekening platform.
// Throws 404 jika belum pernah dikonfigurasi.
export async function adminFetchPlatformBankInfo() {
  return apiRequestAuth('/admin/platform/bank-info')
}

// PUT /admin/platform/bank-info — buat/perbarui konfigurasi rekening platform.
// body: { payment_type, bank_name, account_number, account_holder, branch?, transfer_note?, is_configured }
export async function adminUpdatePlatformBankInfo(body) {
  return apiRequestAuth('/admin/platform/bank-info', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// ── Employer: Platform Bank Info ────────────────────────────────────────────

// GET /payments/platform-bank-info — info rekening platform untuk Employer.
// Digunakan saat employer sudah punya tagihan dan ingin mengecek rekening tujuan.
export async function fetchPlatformBankInfo() {
  return apiRequestAuth('/payments/platform-bank-info')
}

// ─── Ratings ────────────────────────────────────────────────────────────────
// Semua endpoint rating memerlukan token user yang valid.
// Backend memvalidasi bahwa hanya Worker/Employer yang terlibat dalam assignment
// yang dapat memberikan rating, dan hanya setelah assignment.status == 'approved'.

// POST /ratings — buat rating baru.
// body: { assignment_id, to_user_id, score (1-5), review? }
// Hanya boleh dibuat setelah assignment berstatus 'approved'.
// Satu user hanya bisa memberikan satu rating per assignment (unique constraint di DB).
export async function createRating(body) {
  return apiRequestAuth('/ratings', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// GET /ratings/my — semua rating yang diberikan oleh user yang login (from_user_id).
export async function fetchMyRatings() {
  return apiRequestAuth('/ratings/my')
}

// GET /ratings/assignment/:assignmentId — semua rating untuk satu assignment.
// Hanya Worker atau Employer yang terlibat di assignment tersebut yang dapat mengakses.
export async function fetchRatingsByAssignment(assignmentId) {
  return apiRequestAuth(`/ratings/assignment/${assignmentId}`)
}
