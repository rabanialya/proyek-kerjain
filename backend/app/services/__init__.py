"""Layanan terpusat: notifikasi & activity log.

Helper di paket ini mematuhi kontrak berikut:

- Memakai ``Session`` yang diberikan pemanggil; TIDAK membuat session/engine
  baru.
- TIDAK memanggil ``session.commit()`` — pemanggil bertanggung jawab atas
  transaksi, idealnya satu commit atomik yang mencakup perubahan entitas
  bisnis bersama notifikasi/log.
- TIDAK mengubah status entitas bisnis.
- Hanya menerima parameter terstruktur; tidak mencatat data sensitif.
"""

from app.services.notifications import create_notification
from app.services.activity_logging import log_activity

__all__ = ["create_notification", "log_activity"]
