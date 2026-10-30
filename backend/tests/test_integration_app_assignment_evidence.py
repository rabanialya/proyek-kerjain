"""Integration test: integrasi Notification & Activity Log ke alur
application, assignment, dan work evidence (via HTTP / TestClient).

DB test terisolasi (SQLite file sementara per-test); TIDAK menyentuh Supabase.
Aksi dilakukan lewat endpoint nyata; notifikasi & activity log divérifikasi
lewat endpoint read milik penerima/actor, sehingga sekaligus menguji scoping.

Pemetaan penerima:
- Worker apply        -> notif ke Employer pemilik task (entity: application)
- Employer terima/tolak -> notif ke Worker (entity: application)
- Employer buat assignment -> notif ke Worker ditugaskan (entity: assignment)
- Worker in_progress  -> log saja (tanpa notifikasi)
- Worker submit       -> notif ke Employer pemilik task (entity: assignment)
- Worker upload bukti -> log saja (entity: assignment), tanpa notifikasi
"""
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.models.employer_profile import EmployerProfile
from app.models.worker_profile import WorkerProfile
from app.models.category import Category
from app.models.task import Task


# ── Fixture: aktor dasar (worker, employer) + kategori + task published ──────

@pytest.fixture
def base(db_session, make_user):
    worker_user = make_user(name="Worker")
    employer_user = make_user(name="Employer")

    worker_profile = WorkerProfile(user_id=worker_user.id, nickname="WorkerNick")
    employer_profile = EmployerProfile(user_id=employer_user.id, display_name="EmpCorp")
    category = Category(name=f"Cat_{uuid4().hex[:6]}")

    db_session.add_all([worker_profile, employer_profile, category])
    db_session.commit()
    for obj in (worker_profile, employer_profile, category):
        db_session.refresh(obj)

    task = Task(
        employer_id=employer_profile.id,
        category_id=category.id,
        title="Bangun Meja",
        wage_amount=Decimal("500000"),
        payment_method="BANK_TRANSFER",
        status="published",
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)

    return SimpleNamespace(
        worker_user=worker_user,
        worker_profile=worker_profile,
        employer_user=employer_user,
        employer_profile=employer_profile,
        category=category,
        task=task,
    )


# ── Helper alur ──────────────────────────────────────────────────────────────

def _apply(client_for, base):
    r = client_for(base.worker_user).post(
        "/applications", json={"task_id": str(base.task.id)}
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _decide(client_for, base, app_id, status):
    r = client_for(base.employer_user).put(
        f"/applications/{app_id}/status", json={"status": status}
    )
    assert r.status_code == 200, r.text
    return r


def _create_assignment(client_for, base, app_id):
    r = client_for(base.employer_user).post(
        "/assignments", json={"application_id": str(app_id)}
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _flow_to_assigned(client_for, base):
    app_id = _apply(client_for, base)
    _decide(client_for, base, app_id, "accepted")
    return _create_assignment(client_for, base, app_id)


def _flow_to_in_progress(client_for, base):
    assignment_id = _flow_to_assigned(client_for, base)
    r = client_for(base.worker_user).put(
        f"/assignments/{assignment_id}/status", json={"status": "in_progress"}
    )
    assert r.status_code == 200, r.text
    return assignment_id


def _upload(client_for, base, assignment_id, upload_dir, filename="bukti.jpg", content=b"fakejpg"):
    upload_dir.mkdir(parents=True, exist_ok=True)
    r = client_for(base.worker_user).post(
        f"/work-evidences/{assignment_id}",
        files=[("files", (filename, content, "image/jpeg"))],
    )
    assert r.status_code == 201, r.text
    return r.json()


def _notifs(client_for, user):
    r = client_for(user).get("/notifications")
    assert r.status_code == 200, r.text
    return r.json()


def _logs(client_for, user):
    r = client_for(user).get("/activity-logs")
    assert r.status_code == 200, r.text
    return r.json()


# ── Event application ───────────────────────────────────────────────────────

def test_worker_apply_notifies_employer(client_for, base):
    app_id = _apply(client_for, base)

    # Employer menerima tepat satu notifikasi tentang lamaran baru.
    emp_notifs = _notifs(client_for, base.employer_user)
    assert len(emp_notifs) == 1
    assert emp_notifs[0]["entity_type"] == "application"
    assert emp_notifs[0]["entity_id"] == app_id
    assert emp_notifs[0]["is_read"] is False
    assert base.employer_user.id != base.worker_user.id  # penerima bukan actor

    # Worker mencatat activity log (actor = worker).
    worker_logs = _logs(client_for, base.worker_user)
    create_logs = [l for l in worker_logs if l["action"] == "create_application"]
    assert len(create_logs) == 1
    assert create_logs[0]["entity_type"] == "application"
    assert create_logs[0]["entity_id"] == app_id
    assert create_logs[0]["user_id"] == str(base.worker_user.id)

    # Employer tidak memiliki activity log (ia belum bertindak).
    assert _logs(client_for, base.employer_user) == []


def test_employer_accept_notifies_worker(client_for, base):
    app_id = _apply(client_for, base)
    _decide(client_for, base, app_id, "accepted")

    # Worker diberi tahu lamaran diterima.
    w_notifs = _notifs(client_for, base.worker_user)
    assert len(w_notifs) == 1
    assert "diterima" in w_notifs[0]["title"].lower()

    # Employer mencatat log keputusan (actor = employer), dengan old/new.
    e_logs = _logs(client_for, base.employer_user)
    decision = [l for l in e_logs if l["action"] == "update_application_status"]
    assert len(decision) == 1
    assert decision[0]["old_value"]["status"] == "pending"
    assert decision[0]["new_value"]["status"] == "accepted"
    assert decision[0]["user_id"] == str(base.employer_user.id)


def test_employer_reject_notifies_worker(client_for, base):
    app_id = _apply(client_for, base)
    _decide(client_for, base, app_id, "rejected")

    w_notifs = _notifs(client_for, base.worker_user)
    assert len(w_notifs) == 1
    assert "ditolak" in w_notifs[0]["title"].lower()

    e_logs = _logs(client_for, base.employer_user)
    decision = [l for l in e_logs if l["action"] == "update_application_status"]
    assert len(decision) == 1
    assert decision[0]["new_value"]["status"] == "rejected"


# ── Event assignment ─────────────────────────────────────────────────────────

def test_create_assignment_notifies_worker(client_for, base):
    app_id = _apply(client_for, base)
    _decide(client_for, base, app_id, "accepted")
    assignment_id = _create_assignment(client_for, base, app_id)

    # Worker diberi tahu ditugaskan (entity assignment).
    w_notifs = _notifs(client_for, base.worker_user)
    assignment_notifs = [n for n in w_notifs if n["entity_type"] == "assignment"]
    assert len(assignment_notifs) == 1
    assert "ditugaskan" in assignment_notifs[0]["title"].lower()
    assert assignment_notifs[0]["entity_id"] == assignment_id

    # Employer mencatat log (actor = employer).
    e_logs = _logs(client_for, base.employer_user)
    assert any(
        l["action"] == "create_assignment" and l["entity_type"] == "assignment"
        for l in e_logs
    )


def test_in_progress_logs_without_notification(client_for, base):
    assignment_id = _flow_to_assigned(client_for, base)

    # Snapshot sebelum in_progress (sudah ada notif dari apply/accept/create_assignment).
    emp_notif_before = len(_notifs(client_for, base.employer_user))
    worker_notif_before = len(_notifs(client_for, base.worker_user))

    r = client_for(base.worker_user).put(
        f"/assignments/{assignment_id}/status", json={"status": "in_progress"}
    )
    assert r.status_code == 200

    # in_progress tidak menambah notifikasi bagi siapa pun.
    assert len(_notifs(client_for, base.employer_user)) == emp_notif_before
    assert len(_notifs(client_for, base.worker_user)) == worker_notif_before

    # Worker mencatat log perubahan status in_progress.
    w_logs = _logs(client_for, base.worker_user)
    ip_logs = [
        l for l in w_logs
        if l["action"] == "update_assignment_status"
        and l["new_value"].get("status") == "in_progress"
    ]
    assert len(ip_logs) == 1
    assert ip_logs[0]["old_value"]["status"] == "assigned"
    assert ip_logs[0]["user_id"] == str(base.worker_user.id)


def test_worker_submit_notifies_employer(client_for, base, monkeypatch, tmp_path):
    assignment_id = _flow_to_in_progress(client_for, base)
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", tmp_path / "we")
    _upload(client_for, base, assignment_id, tmp_path / "we")

    r = client_for(base.worker_user).put(
        f"/assignments/{assignment_id}/status", json={"status": "submitted"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "submitted"

    # Employer diberi tahu hasil pekerjaan dikirim (entity assignment).
    e_notifs = _notifs(client_for, base.employer_user)
    sub_notifs = [n for n in e_notifs if n["entity_type"] == "assignment"]
    assert len(sub_notifs) == 1
    assert "hasil" in sub_notifs[0]["title"].lower() or "dikirim" in sub_notifs[0]["title"].lower()
    assert sub_notifs[0]["entity_id"] == assignment_id

    # Worker mencatat log in_progress dan submitted.
    w_logs = _logs(client_for, base.worker_user)
    statuses = [
        l["new_value"].get("status")
        for l in w_logs if l["action"] == "update_assignment_status"
    ]
    assert "in_progress" in statuses
    assert "submitted" in statuses


# ── Event work evidence ──────────────────────────────────────────────────────

def test_upload_evidence_logs_activity_without_sensitive_data(client_for, base, monkeypatch, tmp_path):
    assignment_id = _flow_to_in_progress(client_for, base)
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", tmp_path / "we")

    # Snapshot sebelum upload (sudah ada notif dari alur sebelumnya).
    emp_notif_before = len(_notifs(client_for, base.employer_user))
    worker_notif_before = len(_notifs(client_for, base.worker_user))

    _upload(
        client_for, base, assignment_id, tmp_path / "we",
        filename="bukti.png", content=b"SECRET_FILE_CONTENT_123",
    )

    # Upload bukti tidak menambah notifikasi bagi siapa pun.
    assert len(_notifs(client_for, base.employer_user)) == emp_notif_before
    assert len(_notifs(client_for, base.worker_user)) == worker_notif_before

    # Satu log untuk operasi upload (entity assignment).
    w_logs = _logs(client_for, base.worker_user)
    upload_logs = [l for l in w_logs if l["action"] == "upload_work_evidence"]
    assert len(upload_logs) == 1
    assert upload_logs[0]["entity_type"] == "assignment"
    assert upload_logs[0]["entity_id"] == assignment_id
    assert upload_logs[0]["user_id"] == str(base.worker_user.id)
    # Isi file / nama tidak ikut tercatat.
    assert upload_logs[0]["new_value"]["file_count"] == 1
    assert "SECRET_FILE_CONTENT_123" not in str(upload_logs[0]["new_value"])
    assert "bukti.png" not in str(upload_logs[0]["new_value"])


# ── Kegagalan tidak meninggalkan jejak sukses ─────────────────────────────────

def test_submit_without_evidence_fails_and_leaves_no_trace(client_for, base, monkeypatch, tmp_path):
    assignment_id = _flow_to_in_progress(client_for, base)
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", tmp_path / "we")

    emp_notif_before = len(
        [n for n in _notifs(client_for, base.employer_user) if n["entity_type"] == "assignment"]
    )
    worker_log_count_before = len(_logs(client_for, base.worker_user))

    r = client_for(base.worker_user).put(
        f"/assignments/{assignment_id}/status", json={"status": "submitted"}
    )
    assert r.status_code == 400  # validasi bukti tetap berfungsi

    emp_notif_after = len(
        [n for n in _notifs(client_for, base.employer_user) if n["entity_type"] == "assignment"]
    )
    worker_log_count_after = len(_logs(client_for, base.worker_user))

    assert emp_notif_after == emp_notif_before
    assert worker_log_count_after == worker_log_count_before
    # Status assignment tidak berubah.
    detail = client_for(base.worker_user).get(f"/assignments/{assignment_id}").json()
    assert detail["status"] == "in_progress"


# ── Otorisasi & ownership yang sudah ada tetap berlaku ────────────────────────

def test_other_employer_cannot_accept_application(client_for, base, db_session, make_user):
    app_id = _apply(client_for, base)

    other_emp_user = make_user(name="OtherEmp")
    db_session.add(EmployerProfile(user_id=other_emp_user.id, display_name="Other"))
    db_session.commit()

    r = client_for(other_emp_user).put(
        f"/applications/{app_id}/status", json={"status": "accepted"}
    )
    assert r.status_code == 403

    # Kegagalan tidak menghasilkan notifikasi ke worker.
    assert _notifs(client_for, base.worker_user) == []
    # Tidak ada log keputusan milik employer asing.
    assert _logs(client_for, other_emp_user) == []


def test_employer_cannot_set_in_progress(client_for, base):
    assignment_id = _flow_to_assigned(client_for, base)
    r = client_for(base.employer_user).put(
        f"/assignments/{assignment_id}/status", json={"status": "in_progress"}
    )
    assert r.status_code == 400  # hanya worker yang boleh in_progress


def test_worker_cannot_submit_other_users_assignment(client_for, base, make_user, db_session):
    assignment_id = _flow_to_in_progress(client_for, base)

    # Worker asing.
    other_worker_user = make_user(name="OtherWorker")
    db_session.add(WorkerProfile(user_id=other_worker_user.id, nickname="Other"))
    db_session.commit()

    r = client_for(other_worker_user).put(
        f"/assignments/{assignment_id}/status", json={"status": "submitted"}
    )
    assert r.status_code == 403


# ── Penerima yang tidak terkait tidak menerima notifikasi ─────────────────────

def test_unrelated_user_receives_nothing(client_for, base, make_user):
    _apply(client_for, base)

    other = make_user(name="Lain")
    assert _notifs(client_for, other) == []
    assert _logs(client_for, other) == []


def test_worker_activity_logs_scoped_to_self(client_for, base):
    _apply(client_for, base)
    w_logs = _logs(client_for, base.worker_user)
    # Semua log milik worker memuat user_id == worker (endpoint di-scope per user).
    assert all(l["user_id"] == str(base.worker_user.id) for l in w_logs)
    assert len(w_logs) == 1  # hanya create_application
