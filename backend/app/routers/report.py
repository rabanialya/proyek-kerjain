from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.report import Report
from app.models.task import Task
from app.models.user import User
from app.schemas.report import (
    ReportCreate,
    ReportResponse,
    VALID_REASON_CATEGORIES,
)
from app.utils.dependencies import (
    get_current_user,
    get_session,
)


router = APIRouter(
    prefix="/reports",
    tags=["Report"]
)


# =========================================================
# CREATE REPORT
# =========================================================

@router.post(
    "",
    response_model=ReportResponse,
    status_code=201
)
def create_report(
    report_data: ReportCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Pengguna membuat laporan baru.

    Ketentuan:
    - Tidak boleh melaporkan diri sendiri.
    - reason_category harus salah satu nilai valid jika diisi.
    - reported_task_id harus merujuk ke task yang ada jika diisi.
    """
    # Validasi reason_category
    if report_data.reason_category and report_data.reason_category not in VALID_REASON_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Kategori laporan tidak valid. Pilihan: "
                f"{', '.join(sorted(VALID_REASON_CATEGORIES))}"
            )
        )

    # Jika laporan ditujukan ke user tertentu — validasi keberadaan & self-report
    if report_data.reported_user_id:
        reported_user = session.get(User, report_data.reported_user_id)
        if not reported_user:
            raise HTTPException(
                status_code=404,
                detail="User yang dilaporkan tidak ditemukan"
            )
        if reported_user.id == current_user.id:
            raise HTTPException(
                status_code=400,
                detail="Anda tidak dapat melaporkan diri sendiri"
            )

    # Jika laporan ditujukan ke task tertentu — validasi keberadaan
    if report_data.reported_task_id:
        task = session.get(Task, report_data.reported_task_id)
        if not task:
            raise HTTPException(
                status_code=404,
                detail="Task yang dilaporkan tidak ditemukan"
            )

    report = Report(
        reported_by=current_user.id,
        reported_user_id=report_data.reported_user_id,
        reported_task_id=report_data.reported_task_id,
        reason_category=report_data.reason_category,
        subject=report_data.subject,
        description=report_data.description,
        status="open",
    )

    session.add(report)
    session.commit()
    session.refresh(report)

    return report


# =========================================================
# GET MY REPORTS
# =========================================================

@router.get(
    "/my",
    response_model=list[ReportResponse]
)
def get_my_reports(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    reports = session.exec(
        select(Report)
        .where(Report.reported_by == current_user.id)
        .order_by(Report.created_at.desc())
    ).all()
    return reports


# =========================================================
# GET REPORT DETAIL
# =========================================================

@router.get(
    "/{report_id}",
    response_model=ReportResponse
)
def get_report(
    report_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    report = session.get(Report, report_id)

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report tidak ditemukan"
        )

    # Hanya pembuat laporan yang bisa melihat detail laporan miliknya
    if report.reported_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke report ini"
        )

    return report
