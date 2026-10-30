from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogResponse
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/activity-logs",
    tags=["Activity Logs"]
)


# ---------------------------------------------------------------------------
# KEBIJAKAN AKSES ACTIVITY LOG (sisi pengguna)
# ---------------------------------------------------------------------------
# Endpoint di file ini adalah endpoint "riwayat aktivitas saya".
#
# - Pengguna biasa HANYA melihat log di mana dirinya adalah actor, yaitu
#   ``ActivityLog.user_id == current_user.id``. Pencarian selalu di-scope ke
#   current_user.id; tidak ada parameter untuk melihat log pengguna lain.
# - Detail log milik pengguna lain menolak dengan 403.
# - Admin melihat SEMUA log melalui endpoint terpisah ``/admin/activity-logs``
#   (lihat ``routers/admin.py``, di-guard ``get_current_admin``). Endpoint di
#   file ini TIDAK menggantikan endpoint admin tersebut dan sengaja dipisah
#   agar batasan akses eksplisit.
# - Saat ini hampir semua ActivityLog ber-actor admin, sehingga pengguna biasa
#   umumnya mendapat daftar kosong. Begitu pencatatan aksi pengguna
#   ditambahkan nanti, pengguna akan melihat riwayat aktivitasnya sendiri di
#   sini — sesuai kebijakan ini.
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=list[ActivityLogResponse]
)
def get_my_activity_logs(
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    """Daftar activity log milik pengguna yang sedang login (actor = dirinya).

    Hasil di-scope ke ``ActivityLog.user_id == current_user.id`` dan diurutkan
    terbaru lebih dulu. Tidak mungkin melihat log pengguna lain dari endpoint ini.
    """
    logs = session.exec(
        select(ActivityLog)
        .where(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
    ).all()

    return logs


@router.get(
    "/{log_id}",
    response_model=ActivityLogResponse
)
def get_activity_log(
    log_id: UUID,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
):
    """Detail satu activity log milik pengguna yang sedang login.

    Hanya boleh diakses jika ``log.user_id == current_user.id``; jika tidak, 403.
    Log milik pengguna lain tidak dapat dilihat lewat endpoint ini — admin
    menggunakan ``/admin/activity-logs/{log_id}`` untuk itu.
    """
    log = session.get(ActivityLog, log_id)

    if not log:
        raise HTTPException(
            status_code=404,
            detail="Activity log tidak ditemukan"
        )

    if log.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke activity log ini"
        )

    return log
