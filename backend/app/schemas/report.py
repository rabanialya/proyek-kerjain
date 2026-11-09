from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# Pilihan alasan laporan yang valid
VALID_REASON_CATEGORIES = {
    "fraud",           # Penipuan atau indikasi kecurangan
    "wrong_info",      # Informasi tidak sesuai
    "inappropriate",   # Perilaku tidak pantas
    "spam",            # Spam
    "rule_violation",  # Pelanggaran aturan platform
    "other",           # Lainnya
}

REASON_LABELS = {
    "fraud":          "Penipuan / Kecurangan",
    "wrong_info":     "Informasi Tidak Sesuai",
    "inappropriate":  "Perilaku Tidak Pantas",
    "spam":           "Spam",
    "rule_violation": "Pelanggaran Aturan Platform",
    "other":          "Lainnya",
}

# Status laporan yang valid
VALID_STATUSES = {"open", "pending", "under_review", "resolved", "rejected"}


class ReportCreate(BaseModel):
    """Data yang dikirim pengguna saat membuat laporan baru."""

    # Minimal salah satu dari reported_user_id atau reported_task_id harus diisi,
    # atau keduanya kosong (laporan umum).
    reported_user_id: UUID | None = None
    reported_task_id: UUID | None = None

    reason_category: str | None = Field(
        default=None,
        description=(
            "Kategori alasan laporan: "
            "fraud | wrong_info | inappropriate | spam | rule_violation | other"
        )
    )

    subject: str = Field(
        min_length=3,
        max_length=200,
        description="Judul singkat laporan"
    )

    description: str = Field(
        min_length=10,
        max_length=2000,
        description="Penjelasan detail laporan"
    )


class ReportResolve(BaseModel):
    """Admin menyelesaikan laporan — dipertahankan untuk kompatibilitas."""
    resolution: str = Field(min_length=3)


class AdminReportStatusUpdate(BaseModel):
    """
    Admin memperbarui status laporan dan/atau menambah catatan.

    status harus salah satu dari:
      open | pending | under_review | resolved | rejected
    """
    status: str = Field(
        description="Status baru: open | pending | under_review | resolved | rejected"
    )
    admin_notes: str | None = Field(
        default=None,
        description="Catatan Admin terkait penanganan laporan"
    )
    resolution: str | None = Field(
        default=None,
        description="Keterangan penyelesaian (wajib jika status = resolved atau rejected)"
    )


class ReportResponse(BaseModel):
    id: UUID
    reported_by: UUID
    reported_user_id: UUID | None = None
    reported_task_id: UUID | None = None
    reason_category: str | None = None
    subject: str
    description: str
    status: str
    admin_notes: str | None = None
    resolution: str | None = None
    resolved_by: UUID | None = None
    resolved_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True
