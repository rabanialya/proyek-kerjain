from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


# ---------------------------------------------------------------------------
# Status lifecycle untuk WORK_PAYMENT (pembayaran ke Worker):
#
#   pending
#     → awaiting_verification  (Employer upload bukti transfer)
#     → verified               (Admin konfirmasi dana masuk)
#     → rejected               (Admin tolak bukti, Employer perlu upload ulang)
#     → disbursed              (Admin catat pencairan ke Worker selesai)
#
# Status lifecycle untuk PLATFORM_FEE:
#
#   pending
#     → awaiting_verification  (ikut bersama WORK_PAYMENT saat Employer upload bukti)
#     → verified               (Admin konfirmasi, platform_fee dianggap settled)
#     → rejected               (ikut ditolak bersama WORK_PAYMENT)
#
# Status "confirmed" (legacy) tidak lagi digunakan untuk record baru,
# tetapi dipertahankan agar record lama tidak rusak.
# ---------------------------------------------------------------------------

PAYMENT_STATUSES = {
    "pending",
    "awaiting_verification",
    "verified",
    "rejected",
    "disbursed",
    "confirmed",   # legacy — tidak digunakan untuk record baru
}


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    assignment_id: UUID | None = Field(
        default=None,
        foreign_key="assignments.id",
        index=True
    )

    task_id: UUID | None = Field(
        default=None,
        foreign_key="tasks.id",
        index=True
    )

    type: str
    method: str
    amount: Decimal

    # Status payment — lihat PAYMENT_STATUSES di atas
    status: str = Field(default="pending")

    transaction_reference: str | None = None

    # Diisi oleh Admin saat status → verified atau disbursed
    paid_at: datetime | None = None

    # Legacy: diisi oleh endpoint confirm lama (hanya Employer).
    # Tidak digunakan lagi untuk record baru — gunakan verified_by/verified_at.
    confirmed_by: UUID | None = Field(
        default=None,
        foreign_key="users.id"
    )
    confirmed_at: datetime | None = None

    # URL file bukti transfer yang diunggah Employer
    transfer_proof_url: str | None = None

    # Alasan penolakan Admin (diisi jika status = 'rejected')
    rejection_reason: str | None = None

    # Admin yang memverifikasi pembayaran
    verified_by: UUID | None = Field(
        default=None,
        foreign_key="users.id"
    )

    # Waktu verifikasi Admin
    verified_at: datetime | None = None

    # ---------------------------------------------------------------------------
    # Kolom pencairan (disbursement) — diisi saat Admin mengkonfirmasi transfer
    # keluar ke Worker. Ditambahkan oleh migration a1b2c3d4e5f7.
    # ---------------------------------------------------------------------------

    # Admin yang mengkonfirmasi pencairan ke Worker
    disbursed_by: UUID | None = Field(
        default=None,
        foreign_key="users.id"
    )

    # Waktu Admin mengkonfirmasi pencairan (berbeda dari paid_at yang dipakai verify)
    disbursed_at: datetime | None = None

    # Referensi transaksi bank keluar (nomor referensi / kode unik dari bank)
    disbursement_reference: str | None = None

    # URL file bukti transfer keluar ke Worker (diunggah Admin)
    disbursement_proof_url: str | None = None

    # Catatan Admin terkait pencairan
    disbursement_notes: str | None = None

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )