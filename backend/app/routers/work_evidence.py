from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session, select

from app.models.assignment import Assignment
from app.models.application import Application
from app.models.task import Task
from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.models.employer_profile import EmployerProfile
from app.models.work_evidence import WorkEvidence
from app.schemas.work_evidence import WorkEvidenceResponse
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/work-evidences",
    tags=["Work Evidence"]
)


# =========================================================
# CONFIGURATION
# =========================================================

# Folder untuk menyimpan file evidence (privat — tidak dapat diakses publik).
# File lama di uploads/work-evidence/ tetap dilayani via router files.py (fallback).
UPLOAD_DIR = Path("_private_uploads/work-evidence")

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)

# Maksimal ukuran satu file: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Format file yang diperbolehkan
ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".pdf"
}


# =========================================================
# UPLOAD MULTIPLE WORK EVIDENCE
# =========================================================

@router.post(
    "/{assignment_id}",
    response_model=list[WorkEvidenceResponse],
    status_code=201
)
def upload_work_evidence(
    assignment_id: UUID,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # =====================================================
    # Pastikan user memiliki Worker Profile
    # =====================================================

    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    if not worker_profile:
        raise HTTPException(
            status_code=403,
            detail="Anda belum memiliki Worker Profile"
        )

    # =====================================================
    # Cari Assignment
    # =====================================================

    assignment = session.get(
        Assignment,
        assignment_id
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment tidak ditemukan"
        )

    # =====================================================
    # Cari Application
    # =====================================================

    application = session.get(
        Application,
        assignment.application_id
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application tidak ditemukan"
        )

    # =====================================================
    # Pastikan assignment milik worker yang sedang login
    # =====================================================

    if application.worker_id != worker_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke assignment ini"
        )

    # =====================================================
    # Evidence hanya boleh diupload saat in_progress
    # =====================================================

    if assignment.status != "in_progress":
        raise HTTPException(
            status_code=400,
            detail=(
                "Evidence hanya dapat diupload saat "
                "assignment berstatus in_progress"
            )
        )

    # =====================================================
    # Pastikan ada file
    # =====================================================

    if not files:
        raise HTTPException(
            status_code=400,
            detail="Minimal satu file harus diupload"
        )

    # =====================================================
    # VALIDASI SEMUA FILE TERLEBIH DAHULU
    # =====================================================

    validated_files = []

    for file in files:

        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="Nama file tidak valid"
            )

        extension = Path(file.filename).suffix.lower()

        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Format file '{extension}' tidak didukung. "
                    "Gunakan JPG, JPEG, PNG, WEBP, atau PDF."
                )
            )

        # Baca file untuk validasi ukuran.
        # Maksimal 10 MB.
        total_size = 0

        while chunk := file.file.read(1024 * 1024):
            total_size += len(chunk)

            if total_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Ukuran file '{file.filename}' terlalu besar. "
                        "Maksimal ukuran file adalah 10 MB."
                    )
                )

        # Kembalikan pointer file ke awal sebelum proses penyimpanan.
        file.file.seek(0)

        validated_files.append(
            (file, extension)
        )

    # =====================================================
    # SIMPAN FILE + DATABASE
    # =====================================================

    created_evidences = []
    created_file_paths = []

    try:

        for file, extension in validated_files:

            # Generate nama file unik
            new_filename = f"{uuid4()}{extension}"

            file_path = UPLOAD_DIR / new_filename

            # Simpan file
            with file_path.open("wb") as buffer:

                while chunk := file.file.read(1024 * 1024):
                    buffer.write(chunk)

            created_file_paths.append(file_path)

            # Simpan informasi file ke database.
            # Simpan sebagai path relatif dengan forward slash.
            # Router files.py menggunakan Path(stored_url).name untuk
            # mencari file — format path tidak mempengaruhi keamanan.
            evidence = WorkEvidence(
                assignment_id=assignment.id,
                file_url=f"_private_uploads/work-evidence/{new_filename}",
            )

            session.add(evidence)
            created_evidences.append(evidence)

        # Commit database setelah seluruh file berhasil disimpan
        session.commit()

        # Refresh semua evidence
        for evidence in created_evidences:
            session.refresh(evidence)

    except Exception:
        # Rollback database
        session.rollback()

        # Hapus file yang sudah sempat dibuat
        for file_path in created_file_paths:
            try:
                if file_path.exists():
                    file_path.unlink()
            except OSError:
                pass

        raise HTTPException(
            status_code=500,
            detail="Gagal menyimpan work evidence"
        )

    finally:
        # Tutup file upload
        for file, _ in validated_files:
            try:
                file.file.close()
            except Exception:
                pass

    return created_evidences


# =========================================================
# GET EVIDENCE MILIK ASSIGNMENT
# =========================================================

@router.get(
    "/{assignment_id}",
    response_model=list[WorkEvidenceResponse]
)
def get_work_evidences(
    assignment_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # =====================================================
    # Cari Assignment
    # =====================================================

    assignment = session.get(
        Assignment,
        assignment_id
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment tidak ditemukan"
        )

    # =====================================================
    # Cari Application
    # =====================================================

    application = session.get(
        Application,
        assignment.application_id
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application tidak ditemukan"
        )

    # =====================================================
    # Cari Worker Profile
    # =====================================================

    worker_profile = session.exec(
        select(WorkerProfile).where(
            WorkerProfile.user_id == current_user.id
        )
    ).first()

    # =====================================================
    # Cari Employer Profile
    # =====================================================

    employer_profile = session.exec(
        select(EmployerProfile).where(
            EmployerProfile.user_id == current_user.id
        )
    ).first()

    # =====================================================
    # Tentukan apakah user adalah Worker pemilik assignment
    # =====================================================

    is_worker = (
        worker_profile is not None
        and application.worker_id == worker_profile.id
    )

    # =====================================================
    # Tentukan apakah user adalah Employer pemilik Task
    # =====================================================

    task = session.get(
        Task,
        application.task_id
    )

    if not task:
        raise HTTPException(
            status_code=404,
            detail="Task tidak ditemukan"
        )

    is_employer = (
        employer_profile is not None
        and task.employer_id == employer_profile.id
    )

    # =====================================================
    # Hanya Worker atau Employer terkait yang boleh melihat
    # =====================================================

    if not is_worker and not is_employer:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke evidence ini"
        )

    # =====================================================
    # Ambil semua evidence
    # =====================================================

    evidences = session.exec(
        select(WorkEvidence).where(
            WorkEvidence.assignment_id == assignment_id
        )
    ).all()

    return evidences