from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class EmployerProfile(SQLModel, table=True):
    __tablename__ = "employer_profiles"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    user_id: UUID = Field(
        foreign_key="users.id",
        unique=True,
        index=True
    )

    # ── Identitas utama ───────────────────────────────────────────────────

    display_name: str
    """Nama perusahaan, usaha, atau nama pemilik. Wajib diisi."""

    tipe_employer: str | None = None
    """
    Tipe entitas: "Perusahaan", "UMKM", "Usaha Mandiri", "Perorangan".
    Disimpan sebagai string tunggal.
    """

    sektor: str | None = None
    """Sektor atau industri, contoh: Konstruksi, Kuliner, Teknologi."""

    tagline: str | None = None
    """Tagline atau slogan singkat perusahaan (1–2 kalimat)."""

    description: str | None = None
    """Deskripsi lengkap perusahaan atau usaha."""

    location: str | None = None
    """Domisili atau lokasi utama operasional."""

    # ── Kontak ────────────────────────────────────────────────────────────

    contact_email: str | None = None
    """Email kontak yang ditampilkan ke Worker (bisa berbeda dari email akun)."""

    whatsapp: str | None = None
    """Nomor WhatsApp atau telepon yang dapat dihubungi Worker."""

    website: str | None = None
    """URL website atau profil media sosial."""

    # ── Format kerja ──────────────────────────────────────────────────────

    work_type: str | None = None
    """
    Format kerja yang sering ditawarkan dalam format JSON string.
    Contoh: '["remote","on_site"]'. Pilihan: "remote", "on_site", "hybrid".
    """

    work_address: str | None = None
    """Alamat fisik lokasi kerja, relevan untuk pekerjaan on-site."""

    # ── Kebijakan pembayaran ──────────────────────────────────────────────

    payment_scheme: str | None = None
    """
    Skema pembayaran yang umum diterapkan dalam format JSON string.
    Contoh: '["per_hari","per_proyek"]'.
    Pilihan: "per_jam", "per_hari", "per_proyek", "bulanan".
    """

    payment_schedule: str | None = None
    """
    Kebijakan waktu pembayaran, contoh: "Setelah pekerjaan selesai",
    "H+3 setelah konfirmasi", dll.
    """

    # ── Sistem ────────────────────────────────────────────────────────────

    is_verified: bool = Field(default=False)
    """
    Status verifikasi yang dikelola admin — tidak dapat diubah pengguna
    melalui form profil.
    """

    rating_avg: float = Field(default=0.0)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
