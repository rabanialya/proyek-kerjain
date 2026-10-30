"""
Payment Router — Kerjain

Alur pembayaran transfer bank manual:

  1. Employer: POST /payments/settle/{assignment_id}
               → buat WORK_PAYMENT + PLATFORM_FEE (status: pending)
               → response berisi rincian tagihan + info rekening platform

  2. Employer: POST /payments/{payment_id}/upload-proof
               → upload bukti transfer
               → WORK_PAYMENT + PLATFORM_FEE terkait → awaiting_verification

  3. Admin:    PUT  /admin/payments/{payment_id}/verify   (lihat admin.py)
               → status → verified, paid_at diisi

  4. Admin:    PUT  /admin/payments/{payment_id}/reject   (lihat admin.py)
               → status → rejected, rejection_reason diisi
               → Employer perlu upload ulang bukti

  5. Admin:    PUT  /admin/payments/{payment_id}/disburse (lihat admin.py)
               → hanya untuk WORK_PAYMENT yang sudah verified
               → status → disbursed (pencairan ke Worker selesai)

Endpoint konfirmasi lama (PUT /payments/{id}/confirm) dipertahankan
hanya agar record lama tidak rusak, tetapi dibatasi ke Admin only.
"""

import os
import uuid as uuid_module
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, select

from app.config.platform import PLATFORM_BANK_INFO
from app.models.application import Application
from app.models.assignment import Assignment
from app.models.employer_profile import EmployerProfile
from app.models.payment import Payment
from app.models.task import Task
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentSettlementCreate,
    PaymentSettlementResponse,
    PaymentUploadProofResponse,
)
from app.services import create_notification, log_activity
from app.utils.dependencies import get_current_user, get_session

router = APIRouter(
    prefix="/payments",
    tags=["Payment"]
)

PLATFORM_FEE_PERCENTAGE = Decimal("0.10")

# Folder penyimpanan bukti transfer (privat — tidak dapat diakses publik).
# File lama di uploads/transfer-proof/ tetap dilayani via router files.py (fallback).
TRANSFER_PROOF_DIR = Path("_private_uploads") / "transfer-proof"
TRANSFER_PROOF_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_PROOF_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_PROOF_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


# =========================================================
# Helpers
# =========================================================

def _get_employer_profile_or_403(current_user: User, session: Session) -> EmployerProfile:
    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()
    if not employer_profile:
        raise HTTPException(
            status_code=403,
            detail="Anda belum memiliki Employer Profile"
        )
    return employer_profile


def _build_reference_code(assignment_id: UUID) -> str:
    """Kode referensi unik untuk tracking transfer."""
    short = str(assignment_id).replace("-", "")[:12].upper()
    return f"KRJ-{short}"


# =========================================================
# CREATE PAYMENT (single — jarang dipakai langsung)
# =========================================================

@router.post(
    "",
    response_model=PaymentResponse,
    status_code=201
)
def create_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    allowed_types = {"PLATFORM_FEE", "WORK_PAYMENT"}
    if payment_data.type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipe payment tidak valid")

    if payment_data.method not in {"CASH", "BANK_TRANSFER"}:
        raise HTTPException(
            status_code=400,
            detail="Metode pembayaran tidak valid. Gunakan BANK_TRANSFER."
        )

    if payment_data.type == "WORK_PAYMENT":
        if not payment_data.assignment_id:
            raise HTTPException(status_code=400, detail="WORK_PAYMENT harus memiliki assignment_id")
        if not payment_data.task_id:
            raise HTTPException(status_code=400, detail="WORK_PAYMENT harus memiliki task_id")

        assignment = session.get(Assignment, payment_data.assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment tidak ditemukan")

        application = session.get(Application, assignment.application_id)
        if not application:
            raise HTTPException(status_code=404, detail="Application tidak ditemukan")

        task = session.get(Task, payment_data.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task tidak ditemukan")

        if application.task_id != task.id:
            raise HTTPException(status_code=400, detail="Assignment tidak sesuai dengan task")

        employer_profile = _get_employer_profile_or_403(current_user, session)
        if task.employer_id != employer_profile.id:
            raise HTTPException(status_code=403, detail="Anda bukan pemilik task ini")

        if assignment.status != "approved":
            raise HTTPException(
                status_code=400,
                detail="Payment hanya dapat dibuat setelah assignment disetujui"
            )

        if assignment.status == "disputed":
            raise HTTPException(
                status_code=400,
                detail="Assignment sedang dalam dispute. Payment diblokir."
            )

        existing = session.exec(
            select(Payment).where(
                Payment.assignment_id == assignment.id,
                Payment.type == "WORK_PAYMENT"
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="WORK_PAYMENT untuk assignment ini sudah dibuat")

        payment = Payment(
            assignment_id=assignment.id,
            task_id=task.id,
            type="WORK_PAYMENT",
            method="BANK_TRANSFER",
            amount=task.wage_amount,
            status="pending"
        )

    else:  # PLATFORM_FEE
        if not payment_data.task_id:
            raise HTTPException(status_code=400, detail="PLATFORM_FEE harus memiliki task_id")
        if payment_data.assignment_id:
            raise HTTPException(status_code=400, detail="PLATFORM_FEE tidak boleh memiliki assignment_id")

        task = session.get(Task, payment_data.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task tidak ditemukan")

        employer_profile = _get_employer_profile_or_403(current_user, session)
        if task.employer_id != employer_profile.id:
            raise HTTPException(status_code=403, detail="Anda bukan pemilik task ini")

        existing = session.exec(
            select(Payment).where(
                Payment.task_id == task.id,
                Payment.type == "PLATFORM_FEE"
            )
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="PLATFORM_FEE untuk task ini sudah dibuat")

        payment = Payment(
            assignment_id=None,
            task_id=task.id,
            type="PLATFORM_FEE",
            method="BANK_TRANSFER",
            amount=task.wage_amount * PLATFORM_FEE_PERCENTAGE,
            status="pending"
        )

    session.add(payment)
    session.commit()
    session.refresh(payment)
    return payment


# =========================================================
# SETTLE ASSIGNMENT PAYMENT
# Membuat WORK_PAYMENT + PLATFORM_FEE sekaligus.
# Response berisi rincian tagihan + info rekening platform.
# =========================================================

@router.post(
    "/settle/{assignment_id}",
    response_model=PaymentSettlementResponse,
)
def settle_assignment_payment(
    assignment_id: UUID,
    data: PaymentSettlementCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if data.method.upper() not in {"CASH", "BANK_TRANSFER"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Metode pembayaran tidak valid",
        )

    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment tidak ditemukan")

    # ── Blokir jika disputed ──────────────────────────────────────────
    if assignment.status == "disputed":
        raise HTTPException(
            status_code=400,
            detail=(
                "Assignment sedang dalam dispute. "
                "Settlement diblokir sampai Admin menyelesaikan dispute."
            )
        )

    if assignment.status != "approved":
        raise HTTPException(
            status_code=400,
            detail="Pembayaran hanya dapat dibuat setelah assignment disetujui",
        )

    application = session.get(Application, assignment.application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application tidak ditemukan")

    task = session.get(Task, application.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

    employer_profile = _get_employer_profile_or_403(current_user, session)
    if task.employer_id != employer_profile.id:
        raise HTTPException(status_code=403, detail="Anda bukan pemilik task ini")

    # ── Hitung nominal ─────────────────────────────────────────────────
    worker_wage = task.wage_amount
    platform_fee_amount = worker_wage * PLATFORM_FEE_PERCENTAGE
    total_transfer = worker_wage + platform_fee_amount

    # ── Idempoten: ambil atau buat WORK_PAYMENT ────────────────────────
    work_payment = session.exec(
        select(Payment).where(
            Payment.assignment_id == assignment.id,
            Payment.type == "WORK_PAYMENT",
        )
    ).first()

    if not work_payment:
        work_payment = Payment(
            assignment_id=assignment.id,
            task_id=task.id,
            type="WORK_PAYMENT",
            method="BANK_TRANSFER",
            amount=worker_wage,
            status="pending",
            transaction_reference=_build_reference_code(assignment.id),
        )
        session.add(work_payment)

    # ── Idempoten: ambil atau buat PLATFORM_FEE ────────────────────────
    platform_fee_payment = session.exec(
        select(Payment).where(
            Payment.task_id == task.id,
            Payment.type == "PLATFORM_FEE",
        )
    ).first()

    if not platform_fee_payment:
        platform_fee_payment = Payment(
            assignment_id=None,
            task_id=task.id,
            type="PLATFORM_FEE",
            method="BANK_TRANSFER",
            amount=platform_fee_amount,
            status="pending",
            transaction_reference=_build_reference_code(assignment.id),
        )
        session.add(platform_fee_payment)

    # ── Activity Log: Employer memulai pembayaran via alur settle (actor: Employer) ──
    # Tanpa notifikasi pada tahap ini. Entity = WORK_PAYMENT yang dibuat/diambil.
    log_activity(
        session,
        user_id=current_user.id,
        entity_type="payment",
        entity_id=work_payment.id,
        action="settle_payment",
        new_value={
            "work_payment_status": work_payment.status,
            "platform_fee_status": platform_fee_payment.status,
        },
    )

    session.commit()
    session.refresh(work_payment)
    session.refresh(platform_fee_payment)

    return PaymentSettlementResponse(
        work_payment=work_payment,
        platform_fee=platform_fee_payment,
        worker_wage=worker_wage,
        platform_fee_amount=platform_fee_amount,
        total_transfer=total_transfer,
        reference_code=work_payment.transaction_reference or _build_reference_code(assignment.id),
        platform_bank_info=PLATFORM_BANK_INFO,
    )


# =========================================================
# UPLOAD BUKTI TRANSFER
# Hanya Employer pemilik task.
# Setelah upload: WORK_PAYMENT + PLATFORM_FEE terkait → awaiting_verification.
# Blokir re-upload jika sudah verified atau disbursed.
# =========================================================

@router.post(
    "/{payment_id}/upload-proof",
    response_model=PaymentUploadProofResponse,
)
def upload_transfer_proof(
    payment_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan")

    # ── Hanya WORK_PAYMENT yang jadi entry point upload ────────────────
    if payment.type != "WORK_PAYMENT":
        raise HTTPException(
            status_code=400,
            detail=(
                "Upload bukti transfer dilakukan melalui WORK_PAYMENT. "
                "PLATFORM_FEE akan diperbarui otomatis."
            )
        )

    # ── Blokir upload ulang jika sudah final ───────────────────────────
    if payment.status in {"verified", "disbursed"}:
        raise HTTPException(
            status_code=400,
            detail=f"Payment sudah berstatus '{payment.status}'. Upload bukti tidak diperlukan."
        )

    # ── Validasi kepemilikan (Employer pemilik task) ───────────────────
    if not payment.task_id:
        raise HTTPException(status_code=400, detail="Payment tidak memiliki task")

    task = session.get(Task, payment.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

    employer_profile = _get_employer_profile_or_403(current_user, session)
    if task.employer_id != employer_profile.id:
        raise HTTPException(status_code=403, detail="Anda bukan pemilik task ini")

    # ── Validasi file ─────────────────────────────────────────────────
    if file.content_type not in ALLOWED_PROOF_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF."
        )

    contents = file.file.read()
    if len(contents) > MAX_PROOF_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Ukuran file melebihi 10 MB."
        )

    # ── Simpan file ───────────────────────────────────────────────────
    # Ekstensi diambil dari content-type (lebih aman daripada nama file client)
    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "application/pdf": ".pdf",
    }
    # Gunakan content-type untuk ekstensi; fallback ke ekstensi dari nama file
    # sebagai secondary guess jika content-type tidak dikenal.
    ext = ext_map.get(file.content_type)
    if ext is None:
        # Fallback: ambil ekstensi dari nama file client, tapi normalisasi
        raw_ext = Path(file.filename).suffix.lower() if file.filename else ".bin"
        ext = raw_ext if raw_ext in {".jpg", ".jpeg", ".png", ".webp", ".pdf"} else ".bin"
    filename = f"{uuid_module.uuid4()}{ext}"
    file_path = TRANSFER_PROOF_DIR / filename

    with open(file_path, "wb") as f:
        f.write(contents)

    # Simpan path relatif ke DB — router files.py menggunakan Path(stored_url).name
    proof_url = f"_private_uploads/transfer-proof/{filename}"

    # ── Update WORK_PAYMENT ────────────────────────────────────────────
    payment.transfer_proof_url = proof_url
    payment.status = "awaiting_verification"
    payment.rejection_reason = None  # reset jika upload ulang setelah rejected
    session.add(payment)

    # ── Update PLATFORM_FEE terkait (ikut awaiting_verification) ──────
    platform_fee = session.exec(
        select(Payment).where(
            Payment.task_id == task.id,
            Payment.type == "PLATFORM_FEE",
        )
    ).first()

    if platform_fee and platform_fee.status in {"pending", "rejected"}:
        platform_fee.status = "awaiting_verification"
        platform_fee.transfer_proof_url = proof_url
        platform_fee.rejection_reason = None
        session.add(platform_fee)

    # ── Notifikasi ke Admin berwenang + Activity Log (actor: Employer) ──
    # Penerima: semua User.is_admin & is_active. Satu transaksi dengan perubahan status.
    admins = session.exec(
        select(User).where(User.is_admin == True, User.is_active == True)  # noqa: E712
    ).all()
    for admin in admins:
        create_notification(
            session,
            user_id=admin.id,
            title="Bukti transfer baru perlu diverifikasi",
            message=(
                f"Employer mengunggah bukti transfer untuk task \"{task.title}\". "
                "Status: menunggu verifikasi."
            ),
            entity_type="payment",
            entity_id=payment.id,
        )

    log_activity(
        session,
        user_id=current_user.id,
        entity_type="payment",
        entity_id=payment.id,
        action="upload_transfer_proof",
        new_value={"status": "awaiting_verification"},
    )

    session.commit()
    session.refresh(payment)

    return PaymentUploadProofResponse(
        id=payment.id,
        status=payment.status,
        transfer_proof_url=proof_url,
        message=(
            "Bukti transfer berhasil diunggah. "
            "Status pembayaran diperbarui menjadi 'menunggu verifikasi'. "
            "Admin akan memeriksa dan memverifikasi dana masuk."
        )
    )


# =========================================================
# GET MY PAYMENTS
# =========================================================

@router.get(
    "/my",
    response_model=list[PaymentResponse]
)
def get_my_payments(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    payments: list[Payment] = []

    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    # Payment sebagai Employer (semua payment pada task miliknya)
    if employer_profile:
        employer_tasks = session.exec(
            select(Task).where(Task.employer_id == employer_profile.id)
        ).all()
        employer_task_ids = {t.id for t in employer_tasks}

        if employer_task_ids:
            employer_payments = session.exec(
                select(Payment).where(Payment.task_id.in_(employer_task_ids))
            ).all()
            payments.extend(employer_payments)

    # Payment sebagai Worker (hanya WORK_PAYMENT pada assignment miliknya)
    if worker_profile:
        worker_apps = session.exec(
            select(Application).where(
                Application.worker_id == worker_profile.id
            )
        ).all()
        worker_app_ids = {a.id for a in worker_apps}

        if worker_app_ids:
            worker_assignments = session.exec(
                select(Assignment).where(
                    Assignment.application_id.in_(worker_app_ids)
                )
            ).all()
            worker_assignment_ids = {a.id for a in worker_assignments}

            if worker_assignment_ids:
                worker_payments = session.exec(
                    select(Payment).where(
                        Payment.assignment_id.in_(worker_assignment_ids),
                        Payment.type == "WORK_PAYMENT",
                    )
                ).all()
                payments.extend(worker_payments)

    unique = {p.id: p for p in payments}
    return list(unique.values())


# =========================================================
# =========================================================
# GET PAYMENT BY ASSIGNMENT  (shortcut untuk frontend)
# Mengembalikan WORK_PAYMENT + PLATFORM_FEE untuk satu assignment.
# PENTING: harus didaftarkan SEBELUM /{payment_id} agar
# path /by-assignment/... tidak ditangkap sebagai UUID.
# =========================================================

@router.get(
    "/by-assignment/{assignment_id}",
    response_model=list[PaymentResponse]
)
def get_payments_by_assignment(
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment tidak ditemukan")

    application = session.get(Application, assignment.application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application tidak ditemukan")

    task = session.get(Task, application.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan")

    # Validasi akses
    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()
    is_employer = employer_profile and task.employer_id == employer_profile.id

    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()
    is_worker = worker_profile and application.worker_id == worker_profile.id

    if not is_employer and not is_worker:
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke assignment ini")

    # Ambil payments
    payments = session.exec(
        select(Payment).where(
            Payment.assignment_id == assignment.id
        )
    ).all()

    # Worker hanya boleh lihat WORK_PAYMENT
    if is_worker and not is_employer:
        payments = [p for p in payments if p.type == "WORK_PAYMENT"]

    # Tambahkan PLATFORM_FEE dari task (untuk Employer)
    if is_employer:
        task_payments = session.exec(
            select(Payment).where(
                Payment.task_id == task.id,
                Payment.type == "PLATFORM_FEE",
            )
        ).all()
        existing_ids = {p.id for p in payments}
        for tp in task_payments:
            if tp.id not in existing_ids:
                payments.append(tp)

    return payments


# =========================================================
# GET PAYMENT DETAIL
# =========================================================

@router.get(
    "/{payment_id}",
    response_model=PaymentResponse
)
def get_payment(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan")

    has_access = False

    # Akses sebagai Employer
    if payment.task_id:
        task = session.get(Task, payment.task_id)
        if task:
            employer_profile = session.exec(
                select(EmployerProfile).where(
                    EmployerProfile.user_id == current_user.id
                )
            ).first()
            if employer_profile and task.employer_id == employer_profile.id:
                has_access = True

    # Akses sebagai Worker — hanya WORK_PAYMENT
    if not has_access and payment.assignment_id and payment.type == "WORK_PAYMENT":
        assignment = session.get(Assignment, payment.assignment_id)
        if assignment:
            application = session.get(Application, assignment.application_id)
            if application:
                worker_profile = session.exec(
                    select(WorkerProfile).where(
                        WorkerProfile.user_id == current_user.id
                    )
                ).first()
                if worker_profile and application.worker_id == worker_profile.id:
                    has_access = True

    if not has_access:
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke payment ini")

    return payment


# =========================================================
# CONFIRM PAYMENT (legacy — Admin only)
# Endpoint ini dipertahankan agar record lama tidak rusak.
# Untuk alur baru, gunakan endpoint Admin verify/reject/disburse.
# =========================================================

@router.put(
    "/{payment_id}/confirm",
    response_model=PaymentResponse,
    deprecated=True,
)
def confirm_payment_legacy(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Legacy endpoint — hanya Admin.
    Untuk alur transfer manual baru, gunakan:
      PUT /admin/payments/{id}/verify
      PUT /admin/payments/{id}/reject
      PUT /admin/payments/{id}/disburse
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail=(
                "Endpoint ini tidak lagi tersedia untuk Employer atau Worker. "
                "Konfirmasi pembayaran dilakukan oleh Admin setelah verifikasi dana masuk."
            )
        )

    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan")

    if payment.status not in {"pending", "awaiting_verification"}:
        raise HTTPException(status_code=400, detail="Payment tidak dapat dikonfirmasi dari status saat ini")

    now = datetime.now(timezone.utc)
    payment.status = "confirmed"
    payment.confirmed_by = current_user.id
    payment.confirmed_at = now
    payment.paid_at = now

    session.add(payment)
    session.commit()
    session.refresh(payment)
    return payment


# =========================================================
# GET DISBURSEMENT PROOF — DEPRECATED
#
# Endpoint ini digantikan oleh GET /files/disbursement-proof/{payment_id}
# yang melayani file langsung (bukan URL publik).
# Dipertahankan hanya agar client lama tidak mendapat 404 yang membingungkan,
# namun mengembalikan 410 Gone dengan pesan redirect.
# =========================================================

@router.get(
    "/{payment_id}/disbursement-proof",
    deprecated=True,
    summary="[DEPRECATED] Gunakan GET /files/disbursement-proof/{payment_id}",
    include_in_schema=True,
)
def get_disbursement_proof_deprecated(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),  # noqa: tetap wajib login
):
    """
    Endpoint ini tidak lagi melayani file.
    Gunakan GET /files/disbursement-proof/{payment_id} sebagai gantinya.
    File kini dilayani langsung oleh backend tanpa URL publik.
    """
    raise HTTPException(
        status_code=410,
        detail=(
            "Endpoint ini sudah tidak aktif. "
            "Gunakan GET /files/disbursement-proof/{payment_id} untuk mengakses file."
        ),
    )
