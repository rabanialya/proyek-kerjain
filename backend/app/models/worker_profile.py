from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class WorkerProfile(SQLModel, table=True):
    __tablename__ = "worker_profiles"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True
    )

    user_id: UUID = Field(
        foreign_key="users.id",
        unique=True,
        index=True
    )

    # ── Informasi pribadi tambahan ────────────────────────────────────────
    # full_name, email, phone tersimpan di tabel users — tidak diduplikasi.
    # nickname dan location adalah informasi khas profil Worker.

    nickname: str | None = None
    """Nama panggilan yang ditampilkan di profil Worker."""

    location: str | None = None
    """Domisili / kota, contoh: Jakarta Selatan."""

    # ── Bio & keahlian ────────────────────────────────────────────────────

    bio: str | None = None
    """Pengalaman dan deskripsi singkat tentang Worker."""

    skills: str | None = None
    """
    Daftar keahlian dalam format JSON string, contoh: '["Las","Konstruksi"]'.
    Backend menerima list[str] dan menyimpannya sebagai JSON.
    """

    # ── Status dan ketersediaan ───────────────────────────────────────────

    status_pekerjaan: str | None = None
    """
    Status Worker: "Mahasiswa", "Pelajar", "Freelancer", "Gap Year", "Lainnya".
    Disimpan sebagai string tunggal.
    """

    komitmen_jam: str | None = None
    """
    Komitmen jam per minggu: "10-15 jam/minggu", "15-20 jam/minggu", ">20 jam/minggu".
    Disimpan sebagai string tunggal.
    """

    preferensi_shift: str | None = None
    """
    Preferensi shift dalam format JSON string, contoh: '["pagi","malam"]'.
    Pilihan: "pagi", "siang", "malam", "akhir_pekan".
    """

    hari_tersedia: str | None = None
    """
    Hari tersedia dalam format JSON string, contoh: '["Senin","Rabu","Jumat"]'.
    Pilihan: Senin–Minggu.
    """

    tanggal_mulai: date | None = None
    """Tanggal Worker siap mulai bekerja."""

    # ── Metode pembayaran ─────────────────────────────────────────────────

    accepted_payment_methods: str | None = None
    """
    Metode pembayaran yang diterima dalam format JSON string.
    Contoh: '["cash","transfer_bank","e_wallet"]'.
    """

    # ── Sistem ────────────────────────────────────────────────────────────

    rating_avg: float = Field(default=0.0)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
