"""Unit test helper create_notification & log_activity (tanpa HTTP).

Memverifikasi kontrak: pakai session pemanggil, tidak commit sendiri, tidak
mengubah entitas bisnis, hanya menerima parameter terstruktur (tidak ada
data sensitif yang bisa ikut tersimpan).
"""
import inspect
from uuid import uuid4

from sqlmodel import select

from app.models.notification import Notification
from app.models.activity_log import ActivityLog
from app.services import create_notification, log_activity
from app.services import notifications, activity_logging


# ── create_notification ──────────────────────────────────────────────────────

def test_create_notification_sets_fields_and_defaults(db_session):
    user_id = uuid4()
    entity_id = uuid4()

    n = create_notification(
        db_session,
        user_id=user_id,
        title="Lamaran diterima",
        message="Employer menerima lamaran Anda",
        entity_type="application",
        entity_id=entity_id,
    )

    assert n.user_id == user_id
    assert n.title == "Lamaran diterima"
    assert n.message == "Employer menerima lamaran Anda"
    assert n.entity_type == "application"
    assert n.entity_id == entity_id
    assert n.is_read is False  # default model
    assert n.created_at is not None


def test_create_notification_minimal_without_entity(db_session):
    user_id = uuid4()

    n = create_notification(db_session, user_id=user_id, title="t", message="m")

    assert n.entity_type is None
    assert n.entity_id is None
    db_session.commit()

    rows = db_session.exec(
        select(Notification).where(Notification.user_id == user_id)
    ).all()
    assert len(rows) == 1


def test_create_notification_visible_in_same_session_via_autoflush(db_session):
    """Helper hanya session.add() (tanpa commit); autoflush membuat row terlihat
    dalam transaksi yang sama sebelum commit."""
    user_id = uuid4()

    create_notification(db_session, user_id=user_id, title="t", message="m")

    rows = db_session.exec(
        select(Notification).where(Notification.user_id == user_id)
    ).all()
    assert len(rows) == 1


def test_create_notification_does_not_commit_implicitly(db_session):
    """Rollback membuang notifikasi yang belum di-commit -> helper tidak commit."""
    user_id = uuid4()

    create_notification(db_session, user_id=user_id, title="t", message="m")
    db_session.rollback()

    rows = db_session.exec(
        select(Notification).where(Notification.user_id == user_id)
    ).all()
    assert rows == []


def test_create_notification_does_not_mutate_business_entity(db_session, make_user):
    user = make_user(name="Asli")
    original_name = user.full_name

    create_notification(db_session, user_id=user.id, title="t", message="m")
    db_session.commit()
    db_session.refresh(user)

    assert user.full_name == original_name  # entitas bisnis tak berubah


# ── log_activity ────────────────────────────────────────────────────────────

def test_log_activity_sets_fields(db_session, make_user):
    user = make_user()
    entity_id = uuid4()

    log = log_activity(
        db_session,
        user_id=user.id,
        entity_type="payment",
        entity_id=entity_id,
        action="verify_payment",
        old_value={"status": "awaiting_verification"},
        new_value={"status": "verified"},
    )

    assert log.user_id == user.id
    assert log.entity_type == "payment"
    assert log.entity_id == entity_id
    assert log.action == "verify_payment"
    assert log.old_value == {"status": "awaiting_verification"}
    assert log.new_value == {"status": "verified"}
    assert log.created_at is not None

    db_session.commit()

    rows = db_session.exec(
        select(ActivityLog).where(ActivityLog.user_id == user.id)
    ).all()
    assert len(rows) == 1


def test_log_activity_supports_nullable_actor_and_values(db_session):
    entity_id = uuid4()

    log = log_activity(
        db_session,
        user_id=None,
        entity_type="system",
        entity_id=entity_id,
        action="scheduled_cleanup",
    )

    assert log.user_id is None
    assert log.old_value is None
    assert log.new_value is None
    db_session.commit()

    rows = db_session.exec(
        select(ActivityLog).where(ActivityLog.action == "scheduled_cleanup")
    ).all()
    assert len(rows) == 1


def test_log_activity_does_not_commit_implicitly(db_session):
    entity_id = uuid4()

    log_activity(
        db_session,
        user_id=None,
        entity_type="x",
        entity_id=entity_id,
        action="will_be_rolled_back",
    )
    db_session.rollback()

    rows = db_session.exec(
        select(ActivityLog).where(ActivityLog.action == "will_be_rolled_back")
    ).all()
    assert rows == []


def test_log_activity_does_not_mutate_business_entity(db_session, make_user):
    user = make_user(name="Asli")
    original_name = user.full_name

    log_activity(
        db_session,
        user_id=user.id,
        entity_type="user",
        entity_id=user.id,
        action="login",
        new_value={"ip": "1.1.1.1"},
    )
    db_session.commit()
    db_session.refresh(user)

    assert user.full_name == original_name


# ── Kontrak signature (parameter terstruktur, tidak ada payload mentah) ─────

def test_helper_signatures_are_structured_only():
    """Cek statif: helper tidak menerima dict payload mentah sembarangan,
    sehingga tidak bisa tak sengaja menyeret data sensitif."""
    notif_params = set(inspect.signature(notifications.create_notification).parameters)
    assert notif_params == {
        "session", "user_id", "title", "message", "entity_type", "entity_id",
    }

    log_params = set(inspect.signature(activity_logging.log_activity).parameters)
    assert log_params == {
        "session", "user_id", "entity_type", "entity_id",
        "action", "old_value", "new_value",
    }
