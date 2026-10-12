from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.rating import Rating
from app.models.assignment import Assignment
from app.models.application import Application
from app.models.task import Task
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.models.employer_profile import EmployerProfile

from app.schemas.rating import (
    RatingCreate,
    RatingResponse,
)

from app.utils.dependencies import (
    get_current_user,
    get_session,
)


router = APIRouter(
    prefix="/ratings",
    tags=["Rating"]
)


# =========================================================
# CREATE RATING
# =========================================================

@router.post(
    "",
    response_model=RatingResponse,
    status_code=201
)
def create_rating(
    rating_data: RatingCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # -----------------------------------------------------
    # Cari assignment
    # -----------------------------------------------------

    assignment = session.get(
        Assignment,
        rating_data.assignment_id
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment tidak ditemukan"
        )

    # -----------------------------------------------------
    # Rating hanya setelah assignment approved
    # -----------------------------------------------------

    if assignment.status != "approved":
        raise HTTPException(
            status_code=400,
            detail="Rating hanya dapat diberikan setelah assignment disetujui"
        )

    # -----------------------------------------------------
    # Cari application
    # -----------------------------------------------------

    application = session.get(
        Application,
        assignment.application_id
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cari task
    # -----------------------------------------------------

    task = session.get(
        Task,
        application.task_id
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cari Worker Profile
    # -----------------------------------------------------

    worker_profile = session.get(
        WorkerProfile,
        application.worker_id
    )

    if not worker_profile:
        raise HTTPException(
            status_code=404,
            detail="Worker Profile tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cari Employer Profile
    # -----------------------------------------------------

    employer_profile = session.get(
        EmployerProfile,
        task.employer_id
    )

    if not employer_profile:
        raise HTTPException(
            status_code=404,
            detail="Employer Profile tidak ditemukan"
        )

    # -----------------------------------------------------
    # Tentukan user yang terlibat
    # -----------------------------------------------------

    worker_user_id = worker_profile.user_id
    employer_user_id = employer_profile.user_id

    is_worker = current_user.id == worker_user_id
    is_employer = current_user.id == employer_user_id

    if not is_worker and not is_employer:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak terlibat dalam assignment ini"
        )

    # -----------------------------------------------------
    # User tidak boleh rating dirinya sendiri
    # -----------------------------------------------------

    if rating_data.to_user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Anda tidak dapat memberikan rating kepada diri sendiri"
        )

    # -----------------------------------------------------
    # Tentukan siapa yang boleh diberi rating
    # -----------------------------------------------------

    if is_worker:
        expected_target_id = employer_user_id

    elif is_employer:
        expected_target_id = worker_user_id

    else:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses untuk memberikan rating"
        )

    if rating_data.to_user_id != expected_target_id:
        raise HTTPException(
            status_code=400,
            detail="User tujuan rating bukan pihak yang terlibat dalam assignment"
        )

    # -----------------------------------------------------
    # Cek apakah user sudah pernah memberikan rating
    # -----------------------------------------------------

    existing_rating = session.exec(
        select(Rating).where(
            Rating.assignment_id == assignment.id,
            Rating.from_user_id == current_user.id
        )
    ).first()

    if existing_rating:
        raise HTTPException(
            status_code=400,
            detail="Anda sudah memberikan rating untuk assignment ini"
        )

    # -----------------------------------------------------
    # Buat rating
    # -----------------------------------------------------

    rating = Rating(
        assignment_id=assignment.id,
        from_user_id=current_user.id,
        to_user_id=rating_data.to_user_id,
        score=rating_data.score,
        review=rating_data.review,
    )

    session.add(rating)
    session.commit()
    session.refresh(rating)

    # -----------------------------------------------------
    # Update rating average
    # -----------------------------------------------------

    target_ratings = session.exec(
        select(Rating).where(
            Rating.to_user_id == rating_data.to_user_id
        )
    ).all()

    total_score = sum(
        item.score
        for item in target_ratings
    )

    rating_average = (
        total_score / len(target_ratings)
        if target_ratings
        else 0.0
    )

    # -----------------------------------------------------
    # Jika target adalah Worker
    # -----------------------------------------------------

    if rating_data.to_user_id == worker_user_id:

        worker_profile.rating_avg = rating_average

        session.add(worker_profile)

    # -----------------------------------------------------
    # Jika target adalah Employer
    # -----------------------------------------------------

    elif rating_data.to_user_id == employer_user_id:

        employer_profile.rating_avg = rating_average

        session.add(employer_profile)

    session.commit()
    session.refresh(rating)

    return rating


# =========================================================
# GET MY RATINGS
# =========================================================

@router.get(
    "/my",
    response_model=list[RatingResponse]
)
def get_my_ratings(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    ratings = session.exec(
        select(Rating).where(
            Rating.from_user_id == current_user.id
        )
    ).all()

    return ratings


# =========================================================
# GET RATINGS BY ASSIGNMENT
# =========================================================

@router.get(
    "/assignment/{assignment_id}",
    response_model=list[RatingResponse]
)
def get_assignment_ratings(
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # -----------------------------------------------------
    # Cari assignment
    # -----------------------------------------------------

    assignment = session.get(
        Assignment,
        assignment_id
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cari application
    # -----------------------------------------------------

    application = session.get(
        Application,
        assignment.application_id
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cari task
    # -----------------------------------------------------

    task = session.get(
        Task,
        application.task_id
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cari profile
    # -----------------------------------------------------

    worker_profile = session.get(
        WorkerProfile,
        application.worker_id
    )

    employer_profile = session.get(
        EmployerProfile,
        task.employer_id
    )

    if not worker_profile or not employer_profile:
        raise HTTPException(
            status_code=404,
            detail="Profile terkait assignment tidak ditemukan"
        )

    # -----------------------------------------------------
    # Cek akses
    # -----------------------------------------------------

    is_worker = current_user.id == worker_profile.user_id
    is_employer = current_user.id == employer_profile.user_id

    if not is_worker and not is_employer:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke rating assignment ini"
        )

    # -----------------------------------------------------
    # Ambil rating
    # -----------------------------------------------------

    ratings = session.exec(
        select(Rating).where(
            Rating.assignment_id == assignment_id
        )
    ).all()

    return ratings