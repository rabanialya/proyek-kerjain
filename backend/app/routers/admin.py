from uuid import UUID

import os
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select, func
from datetime import datetime, timezone

from app.models.user import User
from app.models.payment import Payment
from app.models.assignment import Assignment
from app.models.application import Application
from app.models.task import Task
from app.models.dispute import Dispute
from app.utils.dependencies import get_current_admin, get_session
from app.schemas.admin import (
    UserStatusUpdate,
    AdminPaymentVerify,
    AdminPaymentReject,
    AdminPaymentSummaryResponse,
    AdminDisputeResolve,
    AdminStatsResponse,
)
from app.schemas.payment import PaymentResponse  # noqa: F401 — dipakai oleh endpoint admin payment jika diperlukan
from app.models.report import Report
from app.schemas.report import ReportResponse, ReportResolve
from app.schemas.dispute import DisputeResponse
from app.models.activity_log import ActivityLog
from app.schemas.activity_log import ActivityLogResponse
from app.models.category import Category
from app.schemas.category import CategoryResponse, CategoryCreate, CategoryUpdate
from app.schemas.task import TaskResponse

# Folder penyimpanan bukti transfer keluar (Admin → Worker) — privat, tidak dapat diakses publik.
# File lama di uploads/disbursement-proof/ tetap dilayani via router files.py (fallback).
DISBURSEMENT_PROOF_DIR = Path("_private_uploads") / "disbursement-proof"
DISBURSEMENT_PROOF_DIR.mkdir(parents=True, exist_ok=True)

# Tipe file yang diizinkan untuk bukti transfer
ALLOWED_DISBURSEMENT_PROOF_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}
MAX_DISBURSEMENT_PROOF_SIZE = 10 * 1024 * 1024  # 10 MB


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get(
    "/stats",
    response_model=AdminStatsResponse,
    summary="Statistik ringkasan platform (Admin)",
)
def get_admin_stats(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    """
    Mengembalikan statistik agregat platform menggunakan query COUNT langsung ke DB.
    Tidak mengunduh seluruh data — aman untuk tabel besar.
    """
    total_users = session.exec(select(func.count(User.id))).one()
    active_users = session.exec(
        select(func.count(User.id)).where(User.is_active == True)  # noqa: E712
    ).one()
    total_tasks = session.exec(select(func.count(Task.id))).one()
    published_tasks = session.exec(
        select(func.count(Task.id)).where(Task.status == "published")
    ).one()
    awaiting_verification = session.exec(
        select(func.count(Payment.id)).where(
            Payment.type == "WORK_PAYMENT",
            Payment.status == "awaiting_verification",
        )
    ).one()
    open_disputes = session.exec(
        select(func.count(Dispute.id)).where(Dispute.status == "open")
    ).one()
    resolved_disputes = session.exec(
        select(func.count(Dispute.id)).where(Dispute.status == "resolved")
    ).one()
    recent_logs = session.exec(
        select(ActivityLog)
        .order_by(ActivityLog.created_at.desc())
        .limit(5)
    ).all()

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_tasks=total_tasks,
        published_tasks=published_tasks,
        payments_awaiting_verification=awaiting_verification,
        open_disputes=open_disputes,
        resolved_disputes=resolved_disputes,
        recent_activity=[
            {
                "id": str(log.id),
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": str(log.entity_id),
                "user_id": str(log.user_id) if log.user_id else None,
                "created_at": log.created_at.isoformat(),
            }
            for log in recent_logs
        ],
    )


@router.get("/users")
def get_all_users(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    users = session.exec(
        select(User).order_by(User.created_at.desc())
    ).all()

    return users


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User tidak ditemukan"
        )

    return user

@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: UUID,
    data: UserStatusUpdate,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User tidak ditemukan"
        )

    if user.id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="Admin tidak dapat menonaktifkan akun sendiri"
        )

    user.is_active = data.is_active

    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "message": "Status user berhasil diperbarui",
        "user_id": user.id,
        "is_active": user.is_active
    }

@router.get(
    "/reports",
    response_model=list[ReportResponse]
)
def get_all_reports(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    reports = session.exec(
        select(Report)
        .order_by(Report.created_at.desc())
    ).all()

    return reports

@router.get(
    "/reports/{report_id}",
    response_model=ReportResponse
)
def get_report_detail(
    report_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    report = session.get(Report, report_id)

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report tidak ditemukan"
        )

    return report

@router.put(
    "/reports/{report_id}/resolve",
    response_model=ReportResponse
)
def resolve_report(
    report_id: UUID,
    data: ReportResolve,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    report = session.get(Report, report_id)

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report tidak ditemukan"
        )

    if report.status == "resolved":
        raise HTTPException(
            status_code=400,
            detail="Report sudah diselesaikan"
        )

    report.status = "resolved"
    report.resolution = data.resolution
    report.resolved_by = current_admin.id
    report.resolved_at = datetime.now(timezone.utc)

    session.add(report)
    session.commit()
    session.refresh(report)

    return report

@router.get(
    "/disputes",
    response_model=list[DisputeResponse]
)
def get_all_disputes(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    disputes = session.exec(
        select(Dispute)
        .order_by(Dispute.created_at.desc())
    ).all()

    return disputes

@router.get(
    "/disputes/{dispute_id}",
    response_model=DisputeResponse
)
def get_dispute_detail(
    dispute_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    dispute = session.get(Dispute, dispute_id)

    if not dispute:
        raise HTTPException(
            status_code=404,
            detail="Dispute tidak ditemukan"
        )

    return dispute

@router.put(
    "/disputes/{dispute_id}/resolve",
    response_model=DisputeResponse
)
def resolve_dispute(
    dispute_id: UUID,
    data: AdminDisputeResolve,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    """
    Admin menyelesaikan dispute dengan keputusan terstruktur.

    Keputusan yang valid:
      - approve_work   → assignment status berubah ke "approved"
      - reject_work    → assignment status berubah ke "disputed_closed"
      - needs_revision → assignment status berubah ke "in_progress"

    Jika reject_work atau needs_revision: tidak ada alur keuangan otomatis.
    Kebijakan refund/kompensasi perlu didefinisikan secara terpisah.
    """
    valid_decisions = {"approve_work", "reject_work", "needs_revision"}
    if data.decision not in valid_decisions:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Keputusan tidak valid. Pilih salah satu: "
                f"{', '.join(valid_decisions)}"
            )
        )

    dispute = session.get(Dispute, dispute_id)
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute tidak ditemukan")

    if dispute.status == "resolved":
        raise HTTPException(status_code=400, detail="Dispute sudah diselesaikan")

    # Ambil assignment terkait
    assignment = session.get(Assignment, dispute.assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment terkait tidak ditemukan")

    now = datetime.now(timezone.utc)

    # Selesaikan dispute
    dispute.status = "resolved"
    dispute.decision = data.decision
    dispute.resolution = data.resolution
    dispute.resolved_by = current_admin.id
    dispute.resolved_at = now
    session.add(dispute)

    # Transisi assignment sesuai keputusan
    if data.decision == "approve_work":
        # Hasil pekerjaan diterima — lanjutkan ke alur pembayaran
        assignment.status = "approved"
        assignment.approved_at = now
        assignment.completed_at = now

    elif data.decision == "needs_revision":
        # Worker perlu revisi — kembali ke in_progress
        assignment.status = "in_progress"
        assignment.approved_at = None
        assignment.completed_at = None

    elif data.decision == "reject_work":
        # Hasil ditolak — assignment ditutup sebagai disputed_closed
        # Tidak ada refund otomatis. Kebijakan kompensasi perlu didefinisikan.
        assignment.status = "disputed_closed"

    assignment.updated_at = now
    session.add(assignment)

    session.commit()
    session.refresh(dispute)

    # ── Catat activity log ─────────────────────────────────────────────────
    log = ActivityLog(
        user_id=current_admin.id,
        entity_type="dispute",
        entity_id=dispute.id,
        action="resolve_dispute",
        old_value={"status": "open"},
        new_value={
            "status": "resolved",
            "decision": data.decision,
            "assignment_status": assignment.status,
        },
    )
    session.add(log)
    session.commit()

    return dispute

@router.get(
    "/activity-logs",
    response_model=list[ActivityLogResponse]
)
def get_all_activity_logs(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    logs = session.exec(
        select(ActivityLog)
        .order_by(ActivityLog.created_at.desc())
    ).all()

    return logs

@router.get(
    "/activity-logs/{log_id}",
    response_model=ActivityLogResponse
)
def get_activity_log_detail(
    log_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    log = session.get(ActivityLog, log_id)

    if not log:
        raise HTTPException(
            status_code=404,
            detail="Activity log tidak ditemukan"
        )

    return log

@router.get(
    "/categories",
    response_model=list[CategoryResponse]
)
def get_all_categories(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    categories = session.exec(
        select(Category)
    ).all()

    return categories

@router.get(
    "/categories/{category_id}",
    response_model=CategoryResponse
)
def get_category_detail_admin(
    category_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    category = session.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category tidak ditemukan"
        )

    return category

@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=201,
)
def create_category_admin(
    data: CategoryCreate,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    existing_category = session.exec(
        select(Category).where(
            Category.name == data.name
        )
    ).first()

    if existing_category:
        raise HTTPException(
            status_code=400,
            detail="Category sudah ada",
        )

    category = Category(
        name=data.name
    )

    session.add(category)
    session.commit()
    session.refresh(category)

    return category

@router.put(
    "/categories/{category_id}",
    response_model=CategoryResponse,
)
def update_category_admin(
    category_id: UUID,
    data: CategoryUpdate,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    category = session.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category tidak ditemukan",
        )

    if data.name is not None:
        existing_category = session.exec(
            select(Category).where(
                Category.name == data.name,
                Category.id != category_id,
            )
        ).first()

        if existing_category:
            raise HTTPException(
                status_code=400,
                detail="Category sudah ada",
            )

        category.name = data.name

    if data.is_active is not None:
        category.is_active = data.is_active

    session.add(category)
    session.commit()
    session.refresh(category)

    return category

@router.delete(
    "/categories/{category_id}"
)
def delete_category_admin(
    category_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    category = session.get(Category, category_id)

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category tidak ditemukan",
        )

    session.delete(category)
    session.commit()

    return {
        "message": "Category berhasil dihapus"
    }

@router.get(
    "/tasks",
    response_model=list[TaskResponse]
)
def get_all_tasks_admin(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    tasks = session.exec(
        select(Task)
        .order_by(Task.created_at.desc())
    ).all()

    return tasks

@router.get(
    "/tasks/{task_id}",
    response_model=TaskResponse
)
def get_task_detail_admin(
    task_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    task = session.get(Task, task_id)

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan"
        )

    return task


# =============================================================
# ADMIN — PAYMENT MANAGEMENT
# =============================================================

@router.get(
    "/payments",
    response_model=list[AdminPaymentSummaryResponse],
    summary="Daftar semua payment (Admin)",
)
def get_all_payments_admin(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    """Mengembalikan semua payment records, diurutkan terbaru dulu."""
    payments = session.exec(
        select(Payment).order_by(Payment.created_at.desc())
    ).all()
    return payments


@router.get(
    "/payments/awaiting",
    response_model=list[AdminPaymentSummaryResponse],
    summary="Payment menunggu verifikasi (Admin)",
)
def get_payments_awaiting_admin(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    """Daftar WORK_PAYMENT berstatus awaiting_verification — antrian verifikasi Admin."""
    payments = session.exec(
        select(Payment).where(
            Payment.type == "WORK_PAYMENT",
            Payment.status == "awaiting_verification",
        ).order_by(Payment.created_at.asc())
    ).all()
    return payments


@router.get(
    "/payments/{payment_id}",
    response_model=AdminPaymentSummaryResponse,
    summary="Detail satu payment (Admin)",
)
def get_payment_detail_admin(
    payment_id: UUID,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan")
    return payment


@router.put(
    "/payments/{payment_id}/verify",
    response_model=AdminPaymentSummaryResponse,
    summary="Admin verifikasi dana transfer masuk",
)
def admin_verify_payment(
    payment_id: UUID,
    data: AdminPaymentVerify,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    """
    Admin mengonfirmasi bahwa dana transfer dari Employer sudah masuk
    ke rekening platform.

    - WORK_PAYMENT: pending/awaiting_verification → verified
    - PLATFORM_FEE terkait (task_id sama): ikut diverifikasi otomatis
    - Assignment yang sedang disputed TIDAK dapat diverifikasi pembayarannya.
    """
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan")

    if payment.type != "WORK_PAYMENT":
        raise HTTPException(
            status_code=400,
            detail="Verifikasi hanya dilakukan pada WORK_PAYMENT."
        )

    if payment.status not in {"pending", "awaiting_verification"}:
        raise HTTPException(
            status_code=400,
            detail=f"Payment tidak dapat diverifikasi dari status '{payment.status}'."
        )

    # Blokir jika assignment masih disputed
    if payment.assignment_id:
        assignment = session.get(Assignment, payment.assignment_id)
        if assignment and assignment.status == "disputed":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Assignment masih berstatus disputed. "
                    "Selesaikan dispute terlebih dahulu sebelum memverifikasi pembayaran."
                )
            )

    now = datetime.now(timezone.utc)

    payment.status = "verified"
    payment.verified_by = current_admin.id
    payment.verified_at = now
    payment.paid_at = now
    if data.notes:
        # Simpan catatan di transaction_reference jika tersedia
        payment.transaction_reference = (
            f"{payment.transaction_reference or ''} | Catatan: {data.notes}"
        ).strip(" |")
    session.add(payment)

    # Verifikasi PLATFORM_FEE terkait secara otomatis
    if payment.task_id:
        platform_fee = session.exec(
            select(Payment).where(
                Payment.task_id == payment.task_id,
                Payment.type == "PLATFORM_FEE",
                Payment.status.in_(["pending", "awaiting_verification"]),
            )
        ).first()

        if platform_fee:
            platform_fee.status = "verified"
            platform_fee.verified_by = current_admin.id
            platform_fee.verified_at = now
            platform_fee.paid_at = now
            session.add(platform_fee)

    session.commit()
    session.refresh(payment)

    # ── Catat activity log untuk verifikasi payment ───────────────────────
    log = ActivityLog(
        user_id=current_admin.id,
        entity_type="payment",
        entity_id=payment.id,
        action="verify_payment",
        old_value={"status": "awaiting_verification"},
        new_value={"status": "verified", "verified_by": str(current_admin.id)},
    )
    session.add(log)
    session.commit()

    return payment


@router.put(
    "/payments/{payment_id}/reject",
    response_model=AdminPaymentSummaryResponse,
    summary="Admin menolak bukti transfer",
)
def admin_reject_payment(
    payment_id: UUID,
    data: AdminPaymentReject,
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    """
    Admin menolak bukti transfer karena dana belum masuk atau bukti tidak valid.

    - WORK_PAYMENT: awaiting_verification → rejected
    - PLATFORM_FEE terkait ikut ditolak
    - Employer perlu upload ulang bukti transfer
    """
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan")

    if payment.type != "WORK_PAYMENT":
        raise HTTPException(
            status_code=400,
            detail="Penolakan hanya dilakukan pada WORK_PAYMENT."
        )

    if payment.status != "awaiting_verification":
        raise HTTPException(
            status_code=400,
            detail=f"Payment tidak dapat ditolak dari status '{payment.status}'."
        )

    now = datetime.now(timezone.utc)

    payment.status = "rejected"
    payment.rejection_reason = data.rejection_reason
    payment.verified_by = current_admin.id
    payment.verified_at = now
    session.add(payment)

    # Tolak PLATFORM_FEE terkait
    if payment.task_id:
        platform_fee = session.exec(
            select(Payment).where(
                Payment.task_id == payment.task_id,
                Payment.type == "PLATFORM_FEE",
                Payment.status == "awaiting_verification",
            )
        ).first()

        if platform_fee:
            platform_fee.status = "rejected"
            platform_fee.rejection_reason = data.rejection_reason
            platform_fee.verified_by = current_admin.id
            platform_fee.verified_at = now
            session.add(platform_fee)

    session.commit()
    session.refresh(payment)

    # ── Catat activity log untuk penolakan payment ────────────────────────
    log = ActivityLog(
        user_id=current_admin.id,
        entity_type="payment",
        entity_id=payment.id,
        action="reject_payment",
        old_value={"status": "awaiting_verification"},
        new_value={"status": "rejected", "rejection_reason": data.rejection_reason},
    )
    session.add(log)
    session.commit()

    return payment


@router.put(
    "/payments/{payment_id}/disburse",
    response_model=AdminPaymentSummaryResponse,
    summary="Admin catat dan konfirmasi pencairan ke Worker",
)
def admin_disburse_payment(
    payment_id: UUID,
    disbursement_reference: str | None = Form(
        default=None,
        description="Referensi transaksi bank keluar (opsional)"
    ),
    disbursement_notes: str | None = Form(
        default=None,
        description="Catatan Admin terkait pencairan (opsional)"
    ),
    proof_file: UploadFile | None = File(
        default=None,
        description="File bukti transfer keluar ke Worker (JPG/PNG/WEBP/PDF, maks 10 MB)"
    ),
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    """
    Admin mengkonfirmasi bahwa transfer manual ke Worker sudah selesai dilakukan.

    Prasyarat yang divalidasi backend:
      - Payment harus bertipe WORK_PAYMENT
      - Status harus 'verified' (dana Employer sudah masuk ke platform)
      - Assignment terkait harus berstatus 'approved' (pekerjaan disetujui)
      - Tidak boleh ada dispute 'open' pada assignment
      - Payment belum pernah dicairkan (status bukan 'disbursed')

    Row-level locking (SELECT FOR UPDATE) mencegah pencairan ganda
    dari request yang bersamaan.

    File bukti transfer keluar disimpan di uploads/disbursement-proof/.
    Akses file melalui endpoint static yang sudah di-mount di main.py.
    """
    # ── Row-level lock untuk cegah concurrent disbursement ───────────────
    # SQLModel with_for_update() menghasilkan SELECT ... FOR UPDATE
    # sehingga baris payment dikunci sampai transaksi selesai.
    payment = session.exec(
        select(Payment).where(Payment.id == payment_id).with_for_update()
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan")

    # ── Validasi tipe ────────────────────────────────────────────────────
    if payment.type != "WORK_PAYMENT":
        raise HTTPException(
            status_code=400,
            detail="Pencairan hanya berlaku untuk WORK_PAYMENT."
        )

    # ── Validasi status payment ──────────────────────────────────────────
    if payment.status == "disbursed":
        raise HTTPException(
            status_code=409,
            detail="Payment ini sudah pernah dicairkan. Pencairan ganda tidak diizinkan."
        )

    if payment.status != "verified":
        raise HTTPException(
            status_code=400,
            detail=(
                f"WORK_PAYMENT harus berstatus 'verified' sebelum dapat dicairkan. "
                f"Status saat ini: '{payment.status}'."
            )
        )

    # ── Validasi assignment ──────────────────────────────────────────────
    if not payment.assignment_id:
        raise HTTPException(
            status_code=400,
            detail="Payment tidak memiliki assignment terkait. Tidak dapat dicairkan."
        )

    assignment = session.get(Assignment, payment.assignment_id)
    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment terkait tidak ditemukan."
        )

    # Assignment harus sudah disetujui (approved)
    if assignment.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Assignment harus berstatus 'approved' sebelum dapat dicairkan. "
                f"Status saat ini: '{assignment.status}'."
            )
        )

    # ── Cek dispute terbuka ──────────────────────────────────────────────
    open_dispute = session.exec(
        select(Dispute).where(
            Dispute.assignment_id == assignment.id,
            Dispute.status == "open",
        )
    ).first()

    if open_dispute:
        raise HTTPException(
            status_code=400,
            detail=(
                "Masih ada dispute terbuka untuk assignment ini. "
                "Selesaikan dispute terlebih dahulu sebelum mencairkan."
            )
        )

    # ── Validasi dan simpan file bukti (jika ada) ────────────────────────
    disbursement_proof_url: str | None = None

    if proof_file and proof_file.filename:
        # Validasi content-type
        if proof_file.content_type not in ALLOWED_DISBURSEMENT_PROOF_TYPES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Format file tidak didukung: '{proof_file.content_type}'. "
                    "Gunakan JPG, PNG, WEBP, atau PDF."
                )
            )

        # Baca konten dan validasi ukuran
        contents = proof_file.file.read()
        if len(contents) > MAX_DISBURSEMENT_PROOF_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Ukuran file melebihi batas maksimum 10 MB."
            )
        if len(contents) == 0:
            raise HTTPException(
                status_code=400,
                detail="File bukti transfer tidak boleh kosong."
            )

        # Tentukan ekstensi berdasarkan content-type (tidak mempercayai nama file)
        ext_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "application/pdf": ".pdf",
        }
        extension = ext_map.get(proof_file.content_type, ".bin")
        filename = f"disbursement_{payment_id}_{uuid4().hex[:8]}{extension}"
        file_path = DISBURSEMENT_PROOF_DIR / filename

        try:
            with open(file_path, "wb") as f:
                f.write(contents)
        except OSError as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Gagal menyimpan file bukti transfer: {exc}"
            )

        disbursement_proof_url = f"_private_uploads/disbursement-proof/{filename}"

    # ── Update payment ───────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    old_status = payment.status

    payment.status = "disbursed"
    payment.disbursed_by = current_admin.id
    payment.disbursed_at = now
    payment.paid_at = now  # backward compat — tetap diisi
    payment.disbursement_reference = disbursement_reference or None
    payment.disbursement_notes = disbursement_notes or None

    if disbursement_proof_url:
        payment.disbursement_proof_url = disbursement_proof_url

    session.add(payment)
    session.flush()  # flush sebelum commit agar ID tersedia untuk log

    # ── Activity log ─────────────────────────────────────────────────────
    log = ActivityLog(
        user_id=current_admin.id,
        entity_type="payment",
        entity_id=payment.id,
        action="disburse_payment",
        old_value={"status": old_status},
        new_value={
            "status": "disbursed",
            "disbursed_by": str(current_admin.id),
            "disbursed_at": now.isoformat(),
            "disbursement_reference": disbursement_reference,
            "has_proof": disbursement_proof_url is not None,
        },
    )
    session.add(log)
    session.commit()
    session.refresh(payment)

    return payment
