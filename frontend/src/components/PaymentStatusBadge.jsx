import { getPaymentStatusConfig } from '../lib/statusLabels'

// Badge status pembayaran dengan label & warna konsisten lintas halaman.
//
// `status` adalah Payment.status (mis. "pending", "rejected", "disbursed").
// Dipakai pada kartu daftar pekerjaan untuk menampilkan status pembayaran
// sebagai info terpisah dari status penugasan (assignment_status).
export default function PaymentStatusBadge({ status }) {
  const cfg = getPaymentStatusConfig(status)
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  )
}
