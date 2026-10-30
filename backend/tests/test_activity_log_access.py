"""Integration test kebijakan akses Activity Log via HTTP (TestClient).

DB test terisolasi (SQLite file sementara); TIDAK menyentuh Supabase.

Kebijakan yang diuji (lihat routers/activity_log.py):
- Pengguna biasa hanya melihat log miliknya (scoping user_id == current_user.id).
- Detail log milik pengguna lain -> 403; log tak ada -> 404.
- Admin melihat semua log via /admin/activity-logs; non-admin diblokir (403).
"""
from uuid import uuid4

from sqlmodel import select

from app.models.activity_log import ActivityLog
from app.services import log_activity


def _seed_three_logs(session, user_a, user_b, admin):
    """user_a, user_b, admin masing-masing punya 1 log."""
    log_activity(
        session,
        user_id=user_a.id,
        entity_type="user",
        entity_id=user_a.id,
        action="login",
        new_value={"ip": "10.0.0.1"},
    )
    log_activity(
        session,
        user_id=user_b.id,
        entity_type="user",
        entity_id=user_b.id,
        action="login",
        new_value={"ip": "10.0.0.2"},
    )
    log_activity(
        session,
        user_id=admin.id,
        entity_type="payment",
        entity_id=uuid4(),
        action="verify_payment",
        old_value={"status": "awaiting_verification"},
        new_value={"status": "verified"},
    )
    session.commit()


def _log_id_for(session, user_id):
    return session.exec(
        select(ActivityLog).where(ActivityLog.user_id == user_id)
    ).one().id


# ── Pengguna biasa ───────────────────────────────────────────────────────────

def test_regular_user_sees_only_own_logs(client_for, make_user, db_session):
    a = make_user(name="A")
    b = make_user(name="B")
    admin = make_user(name="Admin", is_admin=True)
    _seed_three_logs(db_session, a, b, admin)

    client = client_for(a)
    r = client.get("/activity-logs")

    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["user_id"] == str(a.id)
    assert data[0]["action"] == "login"


def test_regular_user_cannot_read_others_log_by_id(client_for, make_user, db_session):
    a = make_user(name="A")
    b = make_user(name="B")
    admin = make_user(name="Admin", is_admin=True)
    _seed_three_logs(db_session, a, b, admin)

    client = client_for(a)
    assert client.get(f"/activity-logs/{_log_id_for(db_session, b.id)}").status_code == 403
    assert client.get(f"/activity-logs/{_log_id_for(db_session, admin.id)}").status_code == 403


def test_nonexistent_log_returns_404(client_for, make_user):
    a = make_user(name="A")
    client = client_for(a)
    assert client.get(f"/activity-logs/{uuid4()}").status_code == 404


def test_user_with_no_logs_gets_empty_list(client_for, make_user):
    a = make_user(name="A")
    client = client_for(a)
    r = client.get("/activity-logs")
    assert r.status_code == 200
    assert r.json() == []


# ── Batas admin ──────────────────────────────────────────────────────────────

def test_regular_user_blocked_from_admin_endpoint(client_for, make_user, db_session):
    a = make_user(name="A")
    b = make_user(name="B")
    admin = make_user(name="Admin", is_admin=True)
    _seed_three_logs(db_session, a, b, admin)

    client = client_for(a)
    r = client.get("/admin/activity-logs")
    assert r.status_code == 403  # get_current_admin menolak non-admin


def test_admin_sees_all_logs_via_admin_endpoint(client_for, make_user, db_session):
    a = make_user(name="A")
    b = make_user(name="B")
    admin = make_user(name="Admin", is_admin=True)
    _seed_three_logs(db_session, a, b, admin)

    client = client_for(admin)
    r = client.get("/admin/activity-logs")
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_admin_can_read_any_log_detail(client_for, make_user, db_session):
    a = make_user(name="A")
    b = make_user(name="B")
    admin = make_user(name="Admin", is_admin=True)
    _seed_three_logs(db_session, a, b, admin)

    client = client_for(admin)
    b_log_id = _log_id_for(db_session, b.id)
    r = client.get(f"/admin/activity-logs/{b_log_id}")
    assert r.status_code == 200
    assert r.json()["id"] == str(b_log_id)
