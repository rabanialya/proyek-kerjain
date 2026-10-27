"""
Secure File Serving Router — Kerjain

Semua file sensitif (bukti kerja, bukti transfer, bukti pencairan) dilayani
melalui endpoint ini. Tidak ada file yang dapat diakses langsung tanpa autentikasi.

Endpoint:
  GET /files/work-evidence/{evidence_id}
      → Worker pemilik assignment ATAU Employer pemilik task
      → Response: FileResponse (serve file langsung)

  GET /files/transfer-proof/{payment_id}
      → Employer pemilik task ATAU Admin
      → Response: FileResponse

  GET /files/disbursement-proof/{payment_id}
      → Worker terkait assignment ATAU Employer pemilik task ATAU Admin
      → Response: FileResponse

Keamanan:
  - Setiap request wajib menyertakan Bearer token yang valid.
  - Kepemilikan diverifikasi melalui database (bukan hanya token).
  - Path traversal dicegah: filename diambil dari DB, lalu divalidasi
    agar berada di dalam direktori yang diizinkan (resolve + prefix check).
  - File tidak pernah "di-redirect" — backend membaca dan mengirim file langsung.
  - Nama file asli client tidak pernah digunakan untuk mencari file.

Kompatibilitas file lama:
  - File lama tersimpan di uploads/{kategori}/
  - File baru tersimpan di _private_uploads/{kategori}/
  - Backend mencoba _private_uploads dulu, lalu fallback ke uploads/.
  - Kedua direktori TIDAK dapat diakses publik (static mount dihapus dari main.py).
"""

import mimetypes
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from app.models.application import Application
from app.models.assignment import Assignment
from app.models.employer_profile import EmployerProfile
from app.models.payment import Payment
from app.models.task import Task
from app.models.user import User
from app.models.work_evidence import WorkEvidence
from app.models.worker_profile import WorkerProfile
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/files",
    tags=["Files"],
)

# ---------------------------------------------------------------------------
# Direktori penyimpanan file
# ---------------------------------------------------------------------------

# Direktori BARU (privat, tidak dapat ditebak)
_PRIVATE_BASE = Path("_private_uploads")
_PRIVATE_WORK_EVIDENCE_DIR = _PRIVATE_BASE / "work-evidence"
_PRIVATE_TRANSFER_PROOF_DIR = _PRIVATE_BASE / "transfer-proof"
_PRIVATE_DISBURSEMENT_PROOF_DIR = _PRIVATE_BASE / "disbursement-proof"

# Direktori LAMA (fallback untuk file yang sudah ada)
_LEGACY_BASE = Path("uploads")
_LEGACY_WORK_EVIDENCE_DIR = _LEGACY_BASE / "work-evidence"
_LEGACY_TRANSFER_PROOF_DIR = _LEGACY_BASE / "transfer-proof"
_LEGACY_DISBURSEMENT_PROOF_DIR = _LEGACY_BASE / "disbursement-proof"

# Buat direktori privat jika belum ada
for _d in (
    _PRIVATE_WORK_EVIDENCE_DIR,
    _PRIVATE_TRANSFER_PROOF_DIR,
    _PRIVATE_DISBURSEMENT_PROOF_DIR,
):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Tipe MIME yang diizinkan untuk disajikan
# ---------------------------------------------------------------------------

_ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}

# ---------------------------------------------------------------------------
# Helper: resolve path aman
# ---------------------------------------------------------------------------

def _resolve_safe_path(stored_url: str, new_dir: Path, legacy_dir: Path) -> Path:
    """
    Mengambil nama file dari URL yang tersimpan di database, lalu mencari
    file tersebut di direktori privat (baru) atau direktori lama (fallback).

    Keamanan:
      - Nama file diambil dari DB, bukan dari input user.
      - Path.resolve() mengembangkan semua '..' dan symlink.
      - Setelah resolve, path HARUS berada di dalam direktori yang diizinkan.
        Jika tidak (path traversal), raise 404 tanpa detail.
      - Mengembalikan path absolut yang sudah divalidasi.

    Raise:
      HTTPException(404) jika file tidak ditemukan atau path tidak aman.
    """
    # Ambil hanya nama file dari URL yang disimpan di DB.
    # DB menyimpan format: "uploads/work-evidence/uuid.ext"
    # atau "_private_uploads/work-evidence/uuid.ext"
    filename = Path(stored_url).name

    # Hanya izinkan karakter yang aman untuk nama file
    # (UUID + ekstensi: huruf, angka, tanda hubung, underscore, titik)
    if not _is_safe_filename(filename):
        raise HTTPException(status_code=404, detail="File tidak ditemukan.")

    # Coba direktori baru dulu, lalu fallback ke lama
    for base_dir in (new_dir, legacy_dir):
        candidate = (base_dir / filename).resolve()
        allowed_prefix = base_dir.resolve()

        # Path traversal check: pastikan file berada di dalam direktori yang diizinkan
        if not str(candidate).startswith(str(allowed_prefix)):
            # Path traversal attempt — jangan bocorkan detail
            raise HTTPException(status_code=404, detail="File tidak ditemukan.")

        if candidate.is_file():
            return candidate

    raise HTTPException(status_code=404, detail="File tidak ditemukan.")


def _is_safe_filename(filename: str) -> bool:
    """
    Memvalidasi bahwa nama file hanya mengandung karakter yang aman.
    Menolak: path separator, null byte, spasi, karakter khusus.
    Mengizinkan: huruf, angka, tanda hubung, underscore, titik.
    """
    if not filename:
        return False
    # Tolak jika ada path separator atau karakter berbahaya
    forbidden = set('/\\:*?"<>|\x00 ')
    if any(c in forbidden for c in filename):
        return False
    # Tolak double-dot (updir)
    if ".." in filename:
        return False
    # Minimal ada satu titik untuk ekstensi
    if "." not in filename:
        return False
    return True


def _safe_content_type(file_path: Path) -> str:
    """
    Tentukan Content-Type berdasarkan ekstensi file.
    Fallback ke application/octet-stream jika tidak dikenal.
    Tidak mempercayai Content-Type dari client.
    """
    mime, _ = mimetypes.guess_type(str(file_path))
    if mime in _ALLOWED_MIME_TYPES:
        return mime
    return "application/octet-stream"


# ---------------------------------------------------------------------------
# Endpoint 1: Bukti Kerja Worker
# ---------------------------------------------------------------------------

@router.get(
    "/work-evidence/{evidence_id}",
    summary="Akses bukti kerja Worker (terlindungi)",
    response_class=FileResponse,
)
def serve_work_evidence(
    evidence_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Melayani file bukti kerja setelah memverifikasi bahwa:
      - User sudah login (Bearer token valid).
      - User adalah Worker pemilik assignment ATAU Employer pemilik task.
      - Admin dapat mengakses semua.

    File dibaca langsung dari filesystem oleh backend — tidak ada redirect.
    """
    # Ambil record evidence dari DB
    evidence = session.get(WorkEvidence, evidence_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="Bukti kerja tidak ditemukan.")

    # Ambil chain: evidence → assignment → application → task
    assignment = session.get(Assignment, evidence.assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment tidak ditemukan.")

    application = session.get(Application, assignment.application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application tidak ditemukan.")

    task = session.get(Task, application.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan.")

    # Admin: akses penuh
    if current_user.is_admin:
        file_path = _resolve_safe_path(
            evidence.file_url,
            _PRIVATE_WORK_EVIDENCE_DIR,
            _LEGACY_WORK_EVIDENCE_DIR,
        )
        return FileResponse(
            path=str(file_path),
            media_type=_safe_content_type(file_path),
            filename=file_path.name,
        )

    has_access = False

    # Worker: hanya assignment miliknya
    worker_profile = session.exec(
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    ).first()
    if worker_profile and application.worker_id == worker_profile.id:
        has_access = True

    # Employer: hanya task miliknya
    if not has_access:
        employer_profile = session.exec(
            select(EmployerProfile).where(EmployerProfile.user_id == current_user.id)
        ).first()
        if employer_profile and task.employer_id == employer_profile.id:
            has_access = True

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke bukti kerja ini.",
        )

    file_path = _resolve_safe_path(
        evidence.file_url,
        _PRIVATE_WORK_EVIDENCE_DIR,
        _LEGACY_WORK_EVIDENCE_DIR,
    )
    return FileResponse(
        path=str(file_path),
        media_type=_safe_content_type(file_path),
        filename=file_path.name,
    )


# ---------------------------------------------------------------------------
# Endpoint 2: Bukti Transfer Masuk (Employer → Platform)
# ---------------------------------------------------------------------------

@router.get(
    "/transfer-proof/{payment_id}",
    summary="Akses bukti transfer masuk (terlindungi)",
    response_class=FileResponse,
)
def serve_transfer_proof(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Melayani file bukti transfer yang diunggah Employer setelah memverifikasi:
      - User sudah login.
      - User adalah Employer pemilik task ATAU Admin.
      - Worker TIDAK dapat mengakses bukti transfer masuk (hanya bisa lihat status).
    """
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan.")

    if not payment.transfer_proof_url:
        raise HTTPException(
            status_code=404,
            detail="Bukti transfer belum diunggah.",
        )

    # Admin: akses penuh
    if current_user.is_admin:
        file_path = _resolve_safe_path(
            payment.transfer_proof_url,
            _PRIVATE_TRANSFER_PROOF_DIR,
            _LEGACY_TRANSFER_PROOF_DIR,
        )
        return FileResponse(
            path=str(file_path),
            media_type=_safe_content_type(file_path),
            filename=file_path.name,
        )

    # Employer: hanya task miliknya
    if not payment.task_id:
        raise HTTPException(status_code=403, detail="Akses ditolak.")

    task = session.get(Task, payment.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task tidak ditemukan.")

    employer_profile = session.exec(
        select(EmployerProfile).where(EmployerProfile.user_id == current_user.id)
    ).first()
    if not employer_profile or task.employer_id != employer_profile.id:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke bukti transfer ini.",
        )

    file_path = _resolve_safe_path(
        payment.transfer_proof_url,
        _PRIVATE_TRANSFER_PROOF_DIR,
        _LEGACY_TRANSFER_PROOF_DIR,
    )
    return FileResponse(
        path=str(file_path),
        media_type=_safe_content_type(file_path),
        filename=file_path.name,
    )


# ---------------------------------------------------------------------------
# Endpoint 3: Bukti Pencairan (Platform → Worker)
# ---------------------------------------------------------------------------

@router.get(
    "/disbursement-proof/{payment_id}",
    summary="Akses bukti pencairan ke Worker (terlindungi)",
    response_class=FileResponse,
)
def serve_disbursement_proof(
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Melayani file bukti pencairan setelah memverifikasi:
      - User sudah login.
      - User adalah Worker terkait assignment ATAU Employer pemilik task ATAU Admin.
    """
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment tidak ditemukan.")

    if not payment.disbursement_proof_url:
        raise HTTPException(
            status_code=404,
            detail="Bukti pencairan belum tersedia.",
        )

    # Admin: akses penuh
    if current_user.is_admin:
        file_path = _resolve_safe_path(
            payment.disbursement_proof_url,
            _PRIVATE_DISBURSEMENT_PROOF_DIR,
            _LEGACY_DISBURSEMENT_PROOF_DIR,
        )
        return FileResponse(
            path=str(file_path),
            media_type=_safe_content_type(file_path),
            filename=file_path.name,
        )

    has_access = False

    # Employer: pemilik task
    if payment.task_id:
        task = session.get(Task, payment.task_id)
        if task:
            employer_profile = session.exec(
                select(EmployerProfile).where(EmployerProfile.user_id == current_user.id)
            ).first()
            if employer_profile and task.employer_id == employer_profile.id:
                has_access = True

    # Worker: hanya WORK_PAYMENT assignment mereka
    if not has_access and payment.assignment_id and payment.type == "WORK_PAYMENT":
        assignment = session.get(Assignment, payment.assignment_id)
        if assignment:
            application = session.get(Application, assignment.application_id)
            if application:
                worker_profile = session.exec(
                    select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
                ).first()
                if worker_profile and application.worker_id == worker_profile.id:
                    has_access = True

    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="Anda tidak memiliki akses ke bukti pencairan ini.",
        )

    file_path = _resolve_safe_path(
        payment.disbursement_proof_url,
        _PRIVATE_DISBURSEMENT_PROOF_DIR,
        _LEGACY_DISBURSEMENT_PROOF_DIR,
    )
    return FileResponse(
        path=str(file_path),
        media_type=_safe_content_type(file_path),
        filename=file_path.name,
    )
