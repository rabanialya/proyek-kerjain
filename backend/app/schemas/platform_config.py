"""
Schemas untuk konfigurasi rekening platform (input/output Admin).
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PlatformBankInfoUpdate(BaseModel):
    """
    Request Admin untuk mengatur/memperbarui rekening platform.
    Mendukung rekening bank konvensional maupun e-wallet.
    """
    payment_type: str = Field(
        default="bank",
        description="Tipe metode: 'bank' atau 'ewallet'",
    )
    bank_name: str = Field(
        min_length=1,
        description="Nama bank (contoh: BCA, Mandiri) atau nama e-wallet (contoh: GoPay, OVO)",
    )
    account_number: str = Field(
        min_length=1,
        description="Nomor rekening bank atau nomor HP e-wallet",
    )
    account_holder: str = Field(
        min_length=1,
        description="Nama pemilik rekening atau nama terdaftar e-wallet",
    )
    branch: str = Field(
        default="",
        description="Cabang bank (opsional, kosongkan untuk e-wallet)",
    )
    transfer_note: str = Field(
        default="",
        description="Catatan tambahan yang ditampilkan ke Employer (opsional)",
    )
    is_configured: bool = Field(
        default=True,
        description="Aktifkan tampilan rekening ke Employer",
    )


class PlatformBankInfoResponse(BaseModel):
    """
    Response konfigurasi rekening platform.
    Dikembalikan ke Admin (detail) maupun Employer (info rekening tujuan).
    """
    id: UUID
    payment_type: str
    bank_name: str
    account_number: str
    account_holder: str
    branch: str
    transfer_note: str
    is_configured: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PlatformBankInfoPublic(BaseModel):
    """
    Info rekening yang dikirim ke Employer — tanpa id & timestamp.
    Digunakan dalam PaymentSettlementResponse.
    """
    is_configured: bool
    payment_type: str
    bank_name: str
    account_number: str
    account_holder: str
    branch: str
    transfer_note: str
