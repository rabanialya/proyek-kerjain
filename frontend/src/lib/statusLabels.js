// Label status pembayaran yang konsisten lintas halaman.
//
// Status berasal dari kolom Payment.status pada record bertipe "WORK_PAYMENT".
// Digunakan oleh kartu daftar pekerjaan dan panel pembayaran agar status
// penugasan (assignment_status) dan status pembayaran (payment.status)
// ditampilkan sebagai dua informasi terpisah — bukan dicampur menjadi satu.
//
// Nilai status yang mungkin (dari backend PAYMENT_STATUSES):
//   pending, awaiting_verification, verified, rejected, disbursed, confirmed
// "confirmed" adalah status legacy dan tidak dipakai pada record baru.

export const PAYMENT_STATUS_LABELS = {
  pending: {
    label: 'Tagihan Dibuat',
    cls: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  awaiting_verification: {
    label: 'Menunggu Verifikasi Admin',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  verified: {
    label: 'Dana Terverifikasi',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: 'Bukti Transfer Ditolak',
    cls: 'bg-red-50 text-red-700 border-red-200',
  },
  disbursed: {
    label: 'Upah Sudah Dicairkan',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  },
  confirmed: {
    label: 'Terkonfirmasi (Legacy)',
    cls: 'bg-slate-50 text-slate-600 border-slate-200',
  },
}

const PAYMENT_STATUS_FALLBACK = {
  label: '',
  cls: 'bg-slate-50 text-slate-600 border-slate-200',
}

// Mengembalikan label teks untuk sebuah status pembayaran.
// Fallback ke status mentah jika status tidak dikenal.
export function getPaymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status]?.label ?? status
}

// Mengembalikan config { label, cls } untuk sebuah status pembayaran.
export function getPaymentStatusConfig(status) {
  return PAYMENT_STATUS_LABELS[status] ?? { ...PAYMENT_STATUS_FALLBACK, label: status }
}
