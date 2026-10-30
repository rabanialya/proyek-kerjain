"""Pytest fixtures untuk backend Kerjain.

Prinsip:
- TIDAK menyentuh database produksi/Supabase. Setiap test memakai SQLite
  berbasis file sementara (``tmp_path``) yang terisolasi dan dibuat dari
  SQLModel metadata. File dihapus otomatis oleh pytest.
- ``app.main`` diimpor sekali untuk mendapatkan instance FastAPI ``app``.
  Engine Postgres asli (dari ``app.database``) bersifat lazy — TIDAK pernah
  dipakai karena dependency ``get_session`` di-override dengan session SQLite
  test di setiap test.
"""
import pytest
from uuid import uuid4

from sqlmodel import Session, SQLModel, create_engine

# Mengimpor app.main mendaftarkan semua model ke SQLModel.metadata dan
# menyediakan instance ``app``. Engine Postgres asli dibuat (lazy) tapi tidak
# pernah dipakai karena get_session di-override.
from app.main import app
from app.utils.dependencies import get_current_user, get_session
from app.models.user import User
from app.models.activity_log import ActivityLog  # noqa: F401  (regstrasi tabel)
from app.models.notification import Notification  # noqa: F401  (regstrasi tabel)


@pytest.fixture(name="test_engine")
def test_engine_fixture(tmp_path):
    """Engine SQLite file sementara per-test, tabel dibuat dari metadata."""
    db_file = tmp_path / "kerjain_test.db"
    eng = create_engine(
        f"sqlite:///{db_file.as_posix()}",
        connect_args={"check_same_thread": False},
    )
    SQLModel.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def db_session(test_engine):
    """Session SQLite terisolasi untuk unit test helper & seeding data."""
    with Session(test_engine) as s:
        yield s


def _make_user(session, *, is_admin=False, name=None):
    user = User(
        email=f"user_{uuid4().hex[:8]}@test.local",
        password_hash="x",  # tidak dipakai; test tidak login via password
        full_name=name or "Test User",
        is_admin=is_admin,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def make_user(db_session):
    """Factory membuat User persisten di DB test."""
    return lambda **kw: _make_user(db_session, **kw)


@pytest.fixture
def client_for(test_engine):
    """Factory TestClient dengan get_session & get_current_user di-override.

    Penggunaan: ``client = client_for(some_user); client.get("/activity-logs")``.

    ``get_current_admin`` sengaja TIDAK di-override sehingga guard admin asli
    tetap berlaku (mengandalkan override ``get_current_user``).
    """
    from fastapi.testclient import TestClient

    def get_test_session():
        with Session(test_engine) as s:
            yield s

    app.dependency_overrides[get_session] = get_test_session

    def _build(user):
        app.dependency_overrides[get_current_user] = lambda: user
        return TestClient(app)

    yield _build
    app.dependency_overrides.clear()
