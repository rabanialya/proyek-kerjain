"""Helper terpusat untuk mencatat activity log.

Kontrak helper (sama dengan ``app/services/notifications.py``):

1. Menggunakan ``Session`` yang diberikan pemanggil — TIDAK membuat session
   atau engine database baru.
2. TIDAK memanggil ``session.commit()`` maupun ``session.rollback()``. Pemanggil
   bertanggung jawab atas transaksi, idealnya satu commit yang mencakup
   perubahan entitas bisnis DAN log sehingga audit trail tidak bisa menyimpang
   dari realita.
3. TIDAK mengubah status entitas bisnis apa pun.
4. Hanya menerima parameter terstruktur. ``old_value``/``new_value`` adalah dict
   yang akan disimpan sebagai JSON — isi HANYA field non-sensitif (status, UUID
   sebagai ``str``, timestamp ISO, alasan admin, dsb.). JANGAN memasukkan
   ``password_hash``, token, OTP, nomor rekening, atau payload request mentah.
"""

from uuid import UUID

from sqlmodel import Session

from app.models.activity_log import ActivityLog


def log_activity(
    session: Session,
    user_id: UUID | None,
    entity_type: str,
    entity_id: UUID,
    action: str,
    old_value: dict | None = None,
    new_value: dict | None = None,
) -> ActivityLog:
    """Catat satu activity log dan tambahkan ke ``session``.

    - ``user_id``: actor tindakan. Boleh ``None`` untuk aksi sistem terjadwal
      tanpa actor yang jelas, meskipun saat ini semua log diisi actor (admin).
    - ``entity_type``/``entity_id``: target tindakan (wajib, sesuai model).
    - ``action``: string verba, mis. ``"verify_payment"`` atau ``"create_application"``.
    - ``old_value``/``new_value``: snapshot sebelum/sesudah sebagai dict JSON.

    Mengembalikan ``ActivityLog`` yang sudah ditambahkan ke session namun BELUM
    di-commit. Pemanggil melakukan commit.
    """
    log = ActivityLog(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
    )
    session.add(log)
    return log
