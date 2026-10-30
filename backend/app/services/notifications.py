"""Helper terpusat untuk membuat notifikasi.

Kontrak helper (berlaku untuk seluruh layanan di ``app/services``):

1. Menggunakan ``Session`` yang diberikan pemanggil — TIDAK membuat session
   atau engine database baru.
2. TIDAK memanggil ``session.commit()`` maupun ``session.rollback()``. Pemanggil
   bertanggung jawab atas transaksi, idealnya satu commit yang mencakup
   perubahan entitas bisnis DAN notifikasi sehingga keduanya atomik.
3. TIDAK mengubah status entitas bisnis apa pun. Helper hanya menambahkan baris
   notifikasi ke session.
4. Hanya menerima parameter terstruktur (UUID/str). Helper TIDAK mengintip
   payload request secara otomatis, sehingga tidak ada password, token, OTP,
   kredensial, atau data sensitif lain yang terekam secara tak sengaja.
   Pemanggil WAJIB memastikan ``title``/``message``/``entity_*`` bebas data
   sensitif.
"""

from uuid import UUID

from sqlmodel import Session

from app.models.notification import Notification


def create_notification(
    session: Session,
    user_id: UUID,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
) -> Notification:
    """Buat satu notifikasi untuk ``user_id`` dan tambahkan ke ``session``.

    ``user_id`` adalah penerima notifikasi (worker/employer/admin sesuai konteks
    event). ``entity_type``/``entity_id`` bersifat opsional — dipakai untuk
    menautkan notifikasi ke entitas terkait (mis. ``"application"``, task_id)
    bila relevan.

    Mengembalikan objek ``Notification`` yang sudah ditambahkan ke session namun
    BELUM di-commit. Field ``is_read`` diisi ``False`` sesuai default model.
    Pemanggil melakukan commit.
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    session.add(notification)
    return notification
