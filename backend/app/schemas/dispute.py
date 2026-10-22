from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DisputeCreate(BaseModel):
    assignment_id: UUID

    reason: str = Field(
        min_length=3,
        description="Alasan singkat dispute"
    )

    description: str | None = Field(
        default=None,
        description="Deskripsi detail dispute (opsional)"
    )


class DisputeResolve(BaseModel):
    """
    Digunakan Admin untuk menyelesaikan dispute.

    decision harus salah satu dari:
      - "approve_work"  : Admin memutuskan hasil pekerjaan diterima.
                          Assignment boleh dilanjutkan ke alur pembayaran
                          (status assignment → approved).
      - "reject_work"   : Admin memutuskan hasil pekerjaan ditolak.
                          Assignment ditandai disputed_closed.
                          Tidak ada alur refund atau transaksi keuangan
                          yang dihasilkan secara otomatis — kebijakan
                          kompensasi belum didefinisikan.
      - "needs_revision": Admin memutuskan Worker perlu merevisi pekerjaan.
                          Assignment dikembalikan ke in_progress.
                          Tidak ada refund otomatis.

    resolution harus berisi penjelasan alasan keputusan Admin.
    """

    decision: str = Field(
        description="Keputusan Admin: approve_work | reject_work | needs_revision"
    )

    resolution: str = Field(
        min_length=10,
        description="Penjelasan alasan keputusan Admin"
    )


class DisputeResponse(BaseModel):
    id: UUID

    assignment_id: UUID

    raised_by: UUID

    reason: str

    description: str | None = None

    status: str

    # Keputusan terstruktur Admin
    decision: str | None = None

    resolution: str | None = None

    resolved_by: UUID | None = None

    resolved_at: datetime | None = None

    created_at: datetime

    class Config:
        from_attributes = True
