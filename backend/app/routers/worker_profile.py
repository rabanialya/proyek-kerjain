from datetime import datetime, timezone
from pathlib import Path
import uuid as _uuid_module

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session as SQLModelSession, select

from app.models.user import User
from app.models.worker_profile import WorkerProfile
from app.schemas.worker_profile import (
    WorkerProfileCreate,
    WorkerProfileResponse,
    WorkerProfileUpdate,
    dict_to_json,
    list_to_json,
)
from app.utils.dependencies import get_current_user, get_session


router = APIRouter(
    prefix="/profiles/worker",
    tags=["Worker Profile"]
)

# Field yang disimpan sebagai JSON string di DB (input: list[str] | None)
_JSON_LIST_FIELDS = frozenset(
    {"skills", "preferensi_shift", "hari_tersedia", "accepted_payment_methods"}
)

# Field yang disimpan sebagai JSON string di DB (input: dict | None)
_JSON_DICT_FIELDS = frozenset({"bank_details", "ewallet_details"})


def _apply_data_to_profile(profile: WorkerProfile, data: dict) -> None:
    """
    Terapkan dict data ke atribut model WorkerProfile.

    Field multi-select (list) dan detail pembayaran (dict) dikonversi ke JSON
    string sebelum disimpan. Field lain diset langsung.
    """
    for field, value in data.items():
        if field in _JSON_LIST_FIELDS:
            setattr(profile, field, list_to_json(value))
        elif field in _JSON_DICT_FIELDS:
            # Pydantic model (BankDetails/EwalletDetails) → dict → JSON string
            if hasattr(value, 'model_dump'):
                value = value.model_dump()
            setattr(profile, field, dict_to_json(value))
        else:
            setattr(profile, field, value)
    profile.updated_at = datetime.now(timezone.utc)


# ── GET — baca profil ─────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=WorkerProfileResponse,
    summary="Ambil profil Worker milik user yang sedang login",
)
def get_worker_profile(
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    profile = session.exec(
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Worker profile belum dibuat")

    return profile


# ── POST — buat profil baru ───────────────────────────────────────────────────

@router.post(
    "",
    response_model=WorkerProfileResponse,
    status_code=201,
    summary="Buat profil Worker baru",
)
def create_worker_profile(
    data: WorkerProfileCreate,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    existing = session.exec(
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Worker profile sudah ada. Gunakan PUT untuk memperbarui.",
        )

    profile = WorkerProfile(user_id=current_user.id)
    _apply_data_to_profile(profile, data.model_dump(exclude_unset=False))

    session.add(profile)
    session.commit()
    session.refresh(profile)

    return profile


# ── PUT — perbarui profil (partial update) ────────────────────────────────────

@router.put(
    "",
    response_model=WorkerProfileResponse,
    summary="Perbarui profil Worker (partial update — hanya field yang dikirim yang berubah)",
)
def update_worker_profile(
    data: WorkerProfileUpdate,
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    profile = session.exec(
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Worker profile belum dibuat. Gunakan POST untuk membuat profil baru.",
        )

    # exclude_unset=True: field yang tidak dikirim dalam request tidak disentuh
    _apply_data_to_profile(profile, data.model_dump(exclude_unset=True))

    session.commit()
    session.refresh(profile)

    return profile

# ── Dokumen Upload ────────────────────────────────────────────────────────────

_WORKER_DOCS_DIR = Path("_private_uploads") / "worker-docs"
_WORKER_DOCS_DIR.mkdir(parents=True, exist_ok=True)

_ALLOWED_DOC_TYPES: set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}
_MAX_DOC_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB

_DOC_EXT_MAP: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}

# Tipe dokumen yang diizinkan sebagai path parameter
_VALID_DOC_KINDS = frozenset({"cv", "id"})


class DocumentUploadResponse(BaseModel):
    doc_type: str
    message: str


@router.post(
    "/documents/{doc_type}",
    response_model=DocumentUploadResponse,
    summary="Upload CV/Resume (doc_type=cv) atau KTP/KTM (doc_type=id) milik Worker",
)
def upload_worker_document(
    doc_type: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: SQLModelSession = Depends(get_session),
):
    """
    Upload dokumen Worker.

    - `doc_type` harus `cv` (CV/Resume) atau `id` (KTP/KTM).
    - Format yang diterima: JPEG, PNG, WEBP, PDF.
    - Ukuran maksimal: 10 MB.
    - File disimpan di `_private_uploads/worker-docs/` dan dilayani via
      `GET /files/worker-docs/{doc_type}`.
    - Worker harus sudah memiliki profil (POST /profiles/worker terlebih dahulu).
    """
    if doc_type not in _VALID_DOC_KINDS:
        raise HTTPException(
            status_code=400,
            detail="doc_type tidak valid. Gunakan 'cv' atau 'id'.",
        )

    if file.content_type not in _ALLOWED_DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.",
        )

    contents = file.file.read()
    if len(contents) > _MAX_DOC_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Ukuran file melebihi 10 MB.",
        )

    profile = session.exec(
        select(WorkerProfile).where(WorkerProfile.user_id == current_user.id)
    ).first()

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Worker profile belum dibuat. Buat profil terlebih dahulu.",
        )

    ext = _DOC_EXT_MAP.get(file.content_type, ".bin")
    filename = f"{_uuid_module.uuid4()}{ext}"
    file_path = _WORKER_DOCS_DIR / filename

    with open(file_path, "wb") as f:
        f.write(contents)

    stored_url = f"_private_uploads/worker-docs/{filename}"

    if doc_type == "cv":
        profile.cv_url = stored_url
        label = "CV/Resume"
    else:
        profile.id_document_url = stored_url
        label = "KTP/KTM"

    profile.updated_at = datetime.now(timezone.utc)
    session.add(profile)
    session.commit()

    return DocumentUploadResponse(
        doc_type=doc_type,
        message=f"{label} berhasil diunggah.",
    )
