"""
Model konfigurasi platform — menyimpan rekening bank/e-wallet tujuan transfer
yang diisi oleh Admin melalui UI. Hanya ada satu baris aktif (singleton).
"""

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class PlatformConfig(SQLModel, table=True):
    __tablename__ = "platform_configs"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    # Jenis metode: "bank" atau "ewallet"
    payment_type: str = Field(default="bank")  # "bank" | "ewallet"

    # Nama bank atau nama e-wallet (contoh: "BCA", "GoPay", "OVO")
    bank_name: str = Field(default="")

    # Nomor rekening atau nomor HP e-wallet
    account_number: str = Field(default="")

    # Nama pemilik rekening
    account_holder: str = Field(default="")

    # Cabang bank (opsional, hanya untuk bank)
    branch: str = Field(default="")

    # Catatan tambahan yang ditampilkan ke Employer (opsional)
    transfer_note: str = Field(default="")

    # Flag apakah konfigurasi sudah diisi dan aktif
    is_configured: bool = Field(default=False)

    # Waktu pembuatan dan update
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
