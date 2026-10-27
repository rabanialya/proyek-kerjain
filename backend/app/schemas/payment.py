from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# REQUEST SCHEMAS
# ---------------------------------------------------------------------------

class PaymentCreate(BaseModel):
    """Membuat WORK_PAYMENT atau PLATFORM_FEE secara terpisah."""
    assignment_id: UUID | None = None
    task_id: UUID | None = None

    type: str = Field(min_length=1)
    method: str = Field(min_length=1)

    amount: Decimal | None = Field(
        default=None,
        gt=0
    )


class PaymentSettlementCreate(BaseModel):
    """Membuat WORK_PAYMENT + PLATFORM_FEE sekaligus via /settle."""
    method: str = Field(min_length=1)


class PaymentConfirm(BaseModel):
    """Legacy — tidak digunakan untuk record baru."""
    pass


class PaymentUploadProofResponse(BaseModel):
    """Response setelah Employer upload bukti transfer."""
    id: UUID
    status: str
    transfer_proof_url: str
    message: str


class AdminPaymentVerify(BaseModel):
    """Admin memverifikasi bahwa dana transfer sudah masuk."""
    notes: str | None = Field(
        default=None,
        description="Catatan opsional Admin saat verifikasi"
    )


class AdminPaymentReject(BaseModel):
    """Admin menolak bukti transfer dengan alasan yang jelas."""
    rejection_reason: str = Field(
        min_length=5,
        description="Alasan penolakan — harus diisi agar Employer dapat menindaklanjuti"
    )


class AdminPaymentDisburse(BaseModel):
    """Admin mencatat bahwa pencairan ke Worker sudah dilakukan."""
    notes: str | None = Field(
        default=None,
        description="Catatan opsional Admin saat mencatat pencairan"
    )


# ---------------------------------------------------------------------------
# RESPONSE SCHEMAS
# ---------------------------------------------------------------------------

class PaymentResponse(BaseModel):
    """Response standar untuk satu payment record."""
    id: UUID

    assignment_id: UUID | None = None
    task_id: UUID | None = None

    type: str
    method: str
    amount: Decimal
    status: str

    transaction_reference: str | None = None

    # Diisi saat Admin verify atau disburse
    paid_at: datetime | None = None

    # Legacy fields
    confirmed_by: UUID | None = None
    confirmed_at: datetime | None = None

    # Bukti transfer dari Employer
    transfer_proof_url: str | None = None

    # Alasan penolakan Admin
    rejection_reason: str | None = None

    # Admin yang memverifikasi
    verified_by: UUID | None = None
    verified_at: datetime | None = None

    # Kolom pencairan — diisi saat Admin mengkonfirmasi transfer keluar ke Worker
    disbursed_by: UUID | None = None
    disbursed_at: datetime | None = None
    disbursement_reference: str | None = None
    disbursement_proof_url: str | None = None
    disbursement_notes: str | None = None

    created_at: datetime

    class Config:
        from_attributes = True


class PaymentSettlementResponse(BaseModel):
    """
    Response dari /settle — berisi dua payment record plus
    rincian tagihan yang harus ditransfer Employer ke platform.
    """
    work_payment: PaymentResponse
    platform_fee: PaymentResponse

    # Rincian tagihan
    worker_wage: Decimal
    platform_fee_amount: Decimal
    total_transfer: Decimal

    # Referensi unik untuk tracking
    reference_code: str

    # Informasi rekening tujuan platform (dari konfigurasi)
    platform_bank_info: dict

    class Config:
        from_attributes = True
