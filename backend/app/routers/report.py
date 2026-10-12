from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.report import Report
from app.models.user import User

from app.schemas.report import (
    ReportCreate,
    ReportResponse,
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
    # -----------------------------------------------------
    # Jika report ditujukan kepada user tertentu,
    # pastikan user tersebut memang ada
    # -----------------------------------------------------

    if report_data.reported_user_id:

        reported_user = session.get(
            User,
            report_data.reported_user_id
        )

        if not reported_user:
            raise HTTPException(
                status_code=404,
                detail="User yang dilaporkan tidak ditemukan"
            )

        # Tidak boleh melaporkan diri sendiri
        if reported_user.id == current_user.id:
            raise HTTPException(
                status_code=400,
                detail="Anda tidak dapat melaporkan diri sendiri"
            )

    # -----------------------------------------------------
    # Buat report
    # -----------------------------------------------------

    report = Report(
        reported_by=current_user.id,
        reported_user_id=report_data.reported_user_id,
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
        select(Report).where(
            Report.reported_by == current_user.id
        )
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
    report = session.get(
        Report,
        report_id
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report tidak ditemukan"
        )

    # -----------------------------------------------------
    # Untuk sementara hanya pembuat report yang bisa
    # melihat detail report
    # -----------------------------------------------------

    if report.reported_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke report ini"
        )

    return report