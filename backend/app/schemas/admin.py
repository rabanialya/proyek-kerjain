from pydantic import BaseModel, Field
from typing import ClassVar, Set
from datetime import datetime
from decimal import Decimal
from uuid import UUID


class UserStatusUpdate(BaseModel):
    is_active: bool


# ---------------------------------------------------------------------------
# Admin Payment Schemas
# ---------------------------------------------------------------------------

class AdminPaymentVerify(BaseModel):
    """
    Admin memverifikasi bahwa dana transfer dari Employer sudah masuk
    ke rekening platform.
    
    Setelah diverifikasi:
      - WORK_PAYMENT status → verified (kewajiban platform kepada Worker tercatat)
      - PLATFORM_FEE status → verified (biaya platform dianggap settled)
    """
    notes: str | None = Field(
        default=None,
        description="Catatan opsional Admin saat verifikasi"
    )


class AdminPaymentReject(BaseModel):
    """
    Admin menolak bukti transfer — dana belum masuk atau bukti tidak valid.
    
    Setelah ditolak:
      - WORK_PAYMENT + PLATFORM_FEE terkait → rejected
      - Employer perlu upload ulang bukti transfer
    """
    rejection_reason: str = Field(
        min_length=5,
        description="Alasan penolakan yang jelas agar Employer dapat menindaklanjuti"
    )


class AdminPaymentDisburse(BaseModel):
    """
    Admin mencatat bahwa pencairan ke Worker sudah dilakukan.
    Hanya berlaku untuk WORK_PAYMENT yang sudah berstatus verified.
    
    Setelah disburse:
      - WORK_PAYMENT status → disbursed
      - paid_at diisi dengan waktu saat ini
    """
    notes: str | None = Field(
        default=None,
        description="Catatan opsional Admin saat mencatat pencairan"
    )


class AdminPaymentSummaryResponse(BaseModel):
    """Ringkasan satu payment record untuk tampilan Admin."""
    id: UUID
    assignment_id: UUID | None = None
    task_id: UUID | None = None
    type: str
    method: str
    amount: Decimal
    status: str
    transfer_proof_url: str | None = None
    rejection_reason: str | None = None
    verified_by: UUID | None = None
    verified_at: datetime | None = None
    paid_at: datetime | None = None
    transaction_reference: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Admin Dispute Schemas
# ---------------------------------------------------------------------------

class AdminDisputeResolve(BaseModel):
    """
    Admin menyelesaikan dispute dengan keputusan terstruktur.

    decision harus salah satu dari:
      - "approve_work"   : Hasil pekerjaan diterima.
                           Assignment → approved, alur pembayaran dapat dilanjutkan.
      - "reject_work"    : Hasil pekerjaan ditolak.
                           Assignment → disputed_closed.
                           Tidak ada refund atau transaksi keuangan otomatis.
                           Kebijakan kompensasi perlu didefinisikan secara terpisah.
      - "needs_revision" : Worker perlu merevisi pekerjaan.
                           Assignment → in_progress.
                           Tidak ada refund otomatis.

    resolution wajib berisi penjelasan alasan keputusan.
    """
    decision: str = Field(
        description="Keputusan Admin: approve_work | reject_work | needs_revision"
    )

    resolution: str = Field(
        min_length=10,
        description="Penjelasan alasan keputusan Admin — wajib diisi"
    )

    VALID_DECISIONS: ClassVar[Set[str]] = {"approve_work", "reject_work", "needs_revision"}
