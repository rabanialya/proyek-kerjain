from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlmodel import Session as SQLModelSession

from app.models.payment import Payment
from app.models.assignment import Assignment
from app.models.application import Application
from app.models.task import Task
from app.models.worker_profile import WorkerProfile
from app.models.employer_profile import EmployerProfile
from app.models.user import User

from app.schemas.payment import (
    PaymentCreate,
    PaymentConfirm,
    PaymentResponse,
    PaymentSettlementCreate,
)

from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/payments",
    tags=["Payment"]
)


# =========================================================
# CREATE PAYMENT
# =========================================================

PLATFORM_FEE_PERCENTAGE = Decimal("0.10")


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
    # -----------------------------------------------------
    # Validasi tipe payment
    # -----------------------------------------------------

    allowed_types = {
        "PLATFORM_FEE",
        "WORK_PAYMENT"
    }

    if payment_data.type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Tipe payment tidak valid"
        )

    # -----------------------------------------------------
    # Untuk sementara hanya CASH
    # -----------------------------------------------------

    if payment_data.method != "CASH":
        raise HTTPException(
            status_code=400,
            detail="Untuk saat ini hanya metode CASH yang didukung"
        )

    # -----------------------------------------------------
    # WORK_PAYMENT
    # -----------------------------------------------------

    if payment_data.type == "WORK_PAYMENT":

        if not payment_data.assignment_id:
            raise HTTPException(
                status_code=400,
                detail="WORK_PAYMENT harus memiliki assignment_id"
            )

        if not payment_data.task_id:
            raise HTTPException(
                status_code=400,
                detail="WORK_PAYMENT harus memiliki task_id"
            )

        # -------------------------------------------------
        # Cari assignment
        # -------------------------------------------------

        assignment = session.get(
            Assignment,
            payment_data.assignment_id
        )

        if not assignment:
            raise HTTPException(
                status_code=404,
                detail="Assignment tidak ditemukan"
            )

        # -------------------------------------------------
        # Cari application
        # -------------------------------------------------

        application = session.get(
            Application,
            assignment.application_id
        )

        if not application:
            raise HTTPException(
                status_code=404,
                detail="Application tidak ditemukan"
            )

        # -------------------------------------------------
        # Cari task
        # -------------------------------------------------

        task = session.get(
            Task,
            payment_data.task_id
        )

        if not task:
            raise HTTPException(
                status_code=404,
                detail="Task tidak ditemukan"
            )

        # -------------------------------------------------
        # Pastikan assignment sesuai dengan task
        # -------------------------------------------------

        if application.task_id != task.id:
            raise HTTPException(
                status_code=400,
                detail="Assignment tidak sesuai dengan task"
            )

        # -------------------------------------------------
        # Cari employer profile
        # -------------------------------------------------

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

        # -------------------------------------------------
        # Pastikan employer adalah pemilik task
        # -------------------------------------------------

        if task.employer_id != employer_profile.id:
            raise HTTPException(
                status_code=403,
                detail="Anda bukan pemilik task ini"
            )

        # -------------------------------------------------
        # Payment hanya setelah assignment approved
        # -------------------------------------------------

        if assignment.status != "approved":
            raise HTTPException(
                status_code=400,
                detail="Payment hanya dapat dibuat setelah assignment disetujui"
            )

        # -------------------------------------------------
        # Cegah duplicate WORK_PAYMENT
        # -------------------------------------------------

        existing_payment = session.exec(
            select(Payment).where(
                Payment.assignment_id == assignment.id,
                Payment.type == "WORK_PAYMENT"
            )
        ).first()

        if existing_payment:
            raise HTTPException(
                status_code=400,
                detail="WORK_PAYMENT untuk assignment ini sudah dibuat"
            )

        # -------------------------------------------------
        # Nominal WORK_PAYMENT berasal dari wage Task
        # -------------------------------------------------

        payment = Payment(
            assignment_id=assignment.id,
            task_id=task.id,
            type="WORK_PAYMENT",
            method="CASH",
            amount=task.wage_amount,
            status="pending"
        )

    # -----------------------------------------------------
    # PLATFORM_FEE
    # -----------------------------------------------------

    else:

        if not payment_data.task_id:
            raise HTTPException(
                status_code=400,
                detail="PLATFORM_FEE harus memiliki task_id"
            )

        # PLATFORM_FEE tidak boleh memiliki assignment
        if payment_data.assignment_id:
            raise HTTPException(
                status_code=400,
                detail="PLATFORM_FEE tidak boleh memiliki assignment_id"
            )

        # -------------------------------------------------
        # Cari task
        # -------------------------------------------------

        task = session.get(
            Task,
            payment_data.task_id
        )

        if not task:
            raise HTTPException(
                status_code=404,
                detail="Task tidak ditemukan"
            )

        # -------------------------------------------------
        # Cari employer profile
        # -------------------------------------------------

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

        # -------------------------------------------------
        # Pastikan employer adalah pemilik task
        # -------------------------------------------------

        if task.employer_id != employer_profile.id:
            raise HTTPException(
                status_code=403,
                detail="Anda bukan pemilik task ini"
            )

        # -------------------------------------------------
        # Hitung platform fee 10%
        # -------------------------------------------------

        platform_fee = (
            task.wage_amount * PLATFORM_FEE_PERCENTAGE
        )

        # -------------------------------------------------
        # Cegah duplicate PLATFORM_FEE untuk task
        # -------------------------------------------------

        existing_payment = session.exec(
            select(Payment).where(
                Payment.task_id == task.id,
                Payment.type == "PLATFORM_FEE"
            )
        ).first()

        if existing_payment:
            raise HTTPException(
                status_code=400,
                detail="PLATFORM_FEE untuk task ini sudah dibuat"
            )

        # -------------------------------------------------
        # Buat PLATFORM_FEE
        # -------------------------------------------------

        payment = Payment(
            assignment_id=None,
            task_id=task.id,
            type="PLATFORM_FEE",
            method="CASH",
            amount=platform_fee,
            status="pending"
        )

    # -----------------------------------------------------
    # Simpan payment
    # -----------------------------------------------------

    session.add(payment)
    session.commit()
    session.refresh(payment)

    return payment

@router.post(
    "/settle/{assignment_id}",
    response_model=list[PaymentResponse],
)
def settle_assignment_payment(
    assignment_id: UUID,
    data: PaymentSettlementCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Hanya CASH yang didukung untuk settlement saat ini.
    if data.method.upper() != "CASH":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Metode pembayaran saat ini hanya CASH",
        )

    # Ambil assignment.
    assignment = session.get(Assignment, assignment_id)

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment tidak ditemukan",
        )

    # Settlement hanya dapat dilakukan setelah pekerjaan disetujui.
    if assignment.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pembayaran hanya dapat dibuat setelah assignment disetujui",
        )

    # Ambil application.
    application = session.get(
        Application,
        assignment.application_id,
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application tidak ditemukan",
        )

    # Ambil task.
    task = session.get(Task, application.task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task tidak ditemukan",
        )

    # Pastikan current user adalah employer pemilik task.
    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    if not employer_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda belum memiliki profil employer",
        )

    if task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda bukan pemilik task ini",
        )

    # Cek apakah WORK_PAYMENT sudah pernah dibuat.
    existing_work_payment = session.exec(
        select(Payment).where(
            Payment.assignment_id == assignment.id,
            Payment.type == "WORK_PAYMENT",
        )
    ).first()

    # Cek apakah PLATFORM_FEE sudah pernah dibuat.
    existing_platform_fee = session.exec(
        select(Payment).where(
            Payment.task_id == task.id,
            Payment.type == "PLATFORM_FEE",
        )
    ).first()

    # Hitung nominal dari data task di server.
    work_payment_amount = task.wage_amount
    platform_fee_amount = (
        task.wage_amount * PLATFORM_FEE_PERCENTAGE
    )

    # Jika WORK_PAYMENT belum ada, buat payment baru.
    if not existing_work_payment:
        existing_work_payment = Payment(
            assignment_id=assignment.id,
            task_id=task.id,
            type="WORK_PAYMENT",
            method="CASH",
            amount=work_payment_amount,
            status="pending",
        )

        session.add(existing_work_payment)

    # Jika PLATFORM_FEE belum ada, buat payment baru.
    if not existing_platform_fee:
        existing_platform_fee = Payment(
            assignment_id=None,
            task_id=task.id,
            type="PLATFORM_FEE",
            method="CASH",
            amount=platform_fee_amount,
            status="pending",
        )

        session.add(existing_platform_fee)

    session.commit()

    session.refresh(existing_work_payment)
    session.refresh(existing_platform_fee)

    return [
        existing_work_payment,
        existing_platform_fee,
    ]

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
    payments = []

    # -----------------------------------------------------
    # Cari Employer Profile
    # -----------------------------------------------------

    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    # -----------------------------------------------------
    # Cari Worker Profile
    # -----------------------------------------------------

    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    # -----------------------------------------------------
    # Payment sebagai Employer
    # -----------------------------------------------------

    if employer_profile:

        employer_tasks = session.exec(
            select(Task).where(
                Task.employer_id == employer_profile.id
            )
        ).all()

        employer_task_ids = {
            task.id
            for task in employer_tasks
        }

        if employer_task_ids:

            employer_payments = session.exec(
                select(Payment).where(
                    Payment.task_id.in_(employer_task_ids)
                )
            ).all()

            payments.extend(employer_payments)

    # -----------------------------------------------------
    # Payment sebagai Worker
    # -----------------------------------------------------

    if worker_profile:

        worker_applications = session.exec(
            select(Application).where(
                Application.worker_id == worker_profile.id
            )
        ).all()

        worker_application_ids = {
            application.id
            for application in worker_applications
        }

        if worker_application_ids:

            worker_assignments = session.exec(
                select(Assignment).where(
                    Assignment.application_id.in_(
                        worker_application_ids
                    )
                )
            ).all()

            worker_assignment_ids = {
                assignment.id
                for assignment in worker_assignments
            }

            if worker_assignment_ids:

                worker_payments = session.exec(
                    select(Payment).where(
                        Payment.assignment_id.in_(
                            worker_assignment_ids
                        )
                    )
                ).all()

                payments.extend(worker_payments)

    # -----------------------------------------------------
    # Hilangkan duplicate
    # -----------------------------------------------------

    unique_payments = {
        payment.id: payment
        for payment in payments
    }

    return list(unique_payments.values())


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
    payment = session.get(
        Payment,
        payment_id
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cek akses sebagai Employer
    # -----------------------------------------------------

    has_access = False

    if payment.task_id:

        task = session.get(
            Task,
            payment.task_id
        )

        if task:

            employer_profile = session.exec(
                select(EmployerProfile).where(
                    EmployerProfile.user_id == current_user.id
                )
            ).first()

            if employer_profile:
                if task.employer_id == employer_profile.id:
                    has_access = True

    # -----------------------------------------------------
    # Cek akses sebagai Worker
    # -----------------------------------------------------

    if not has_access and payment.assignment_id:

        assignment = session.get(
            Assignment,
            payment.assignment_id
        )

        if assignment:

            application = session.get(
                Application,
                assignment.application_id
            )

            if application:

                worker_profile = session.exec(
                    select(WorkerProfile).where(
                        WorkerProfile.user_id == current_user.id
                    )
                ).first()

                if worker_profile:
                    if application.worker_id == worker_profile.id:
                        has_access = True

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke payment ini"
        )

    return payment


# =========================================================
# CONFIRM PAYMENT
# =========================================================

@router.put(
    "/{payment_id}/confirm",
    response_model=PaymentResponse
)
def confirm_payment(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    payment = session.get(
        Payment,
        payment_id
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment tidak ditemukan"
        )

    # -----------------------------------------------------
    # Payment hanya bisa dikonfirmasi jika pending
    # -----------------------------------------------------

    if payment.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Payment sudah diproses"
        )

    # -----------------------------------------------------
    # Hanya Employer yang boleh confirm
    # -----------------------------------------------------

    if not payment.task_id:
        raise HTTPException(
            status_code=400,
            detail="Payment tidak memiliki task"
        )

    task = session.get(
        Task,
        payment.task_id
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan"
        )

    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    if not employer_profile:
        raise HTTPException(
            status_code=403,
            detail="Hanya Employer yang dapat mengonfirmasi payment"
        )

    if task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda bukan pemilik task ini"
        )

    # -----------------------------------------------------
    # Confirm payment
    # -----------------------------------------------------

    now = datetime.now(timezone.utc)

    payment.status = "confirmed"
    payment.confirmed_by = current_user.id
    payment.confirmed_at = now
    payment.paid_at = now

    session.add(payment)
    session.commit()
    session.refresh(payment)

    return payment