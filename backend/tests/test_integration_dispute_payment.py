"""Integration test: integrasi Notification & Activity Log ke alur Dispute dan
Payment (via HTTP / TestClient).

DB test terisolasi (SQLite file sementara per-test); TIDAK menyentuh Supabase.
File upload di-redirect ke tmp_path via monkeypatch agar tidak menulis ke repo.

Pemetaan penerima:
- Dispute dibuka (Employer)     -> notif ke Worker (entity: dispute)
- Dispute diselesaikan (Admin)  -> notif ke Worker & Employer (entity: dispute)
- Upload bukti transfer (Employer) -> notif ke semua Admin aktif (entity: payment)
- Verifikasi pembayaran (Admin) -> notif ke Employer pemilik task (entity: payment)
- Tolak pembayaran (Admin)      -> notif ke Employer + alasan (entity: payment)
- Pencairan (Admin)             -> notif ke Worker penerima pencairan (entity: payment)
- Settle payment (Employer)     -> Activity Log saja (tanpa notifikasi)
"""
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.models.employer_profile import EmployerProfile
from app.models.worker_profile import WorkerProfile
from app.models.category import Category
from app.models.task import Task


# ── Fixture: aktor dasar (worker, employer, admin) + kategori + task ────────

@pytest.fixture
def base(db_session, make_user):
    worker_user = make_user(name="Worker")
    employer_user = make_user(name="Employer")
    admin_user = make_user(name="Admin", is_admin=True)

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
        admin_user=admin_user,
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


def _accept(client_for, base, app_id):
    r = client_for(base.employer_user).put(
        f"/applications/{app_id}/status", json={"status": "accepted"}
    )
    assert r.status_code == 200, r.text


def _create_assignment(client_for, base, app_id):
    r = client_for(base.employer_user).post(
        "/assignments", json={"application_id": str(app_id)}
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _set_in_progress(client_for, base, assignment_id):
    r = client_for(base.worker_user).put(
        f"/assignments/{assignment_id}/status", json={"status": "in_progress"}
    )
    assert r.status_code == 200, r.text


def _upload_we(client_for, base, assignment_id, we_dir):
    we_dir.mkdir(parents=True, exist_ok=True)
    r = client_for(base.worker_user).post(
        f"/work-evidences/{assignment_id}",
        files=[("files", ("bukti.jpg", b"fakejpg", "image/jpeg"))],
    )
    assert r.status_code == 201, r.text


def _submit(client_for, base, assignment_id):
    r = client_for(base.worker_user).put(
        f"/assignments/{assignment_id}/status", json={"status": "submitted"}
    )
    assert r.status_code == 200, r.text


def _approve(client_for, base, assignment_id):
    r = client_for(base.employer_user).put(
        f"/assignments/{assignment_id}/status", json={"status": "approved"}
    )
    assert r.status_code == 200, r.text


def _to_submitted(client_for, base, we_dir):
    app_id = _apply(client_for, base)
    _accept(client_for, base, app_id)
    assignment_id = _create_assignment(client_for, base, app_id)
    _set_in_progress(client_for, base, assignment_id)
    _upload_we(client_for, base, assignment_id, we_dir)
    _submit(client_for, base, assignment_id)
    return assignment_id


def _to_approved(client_for, base, we_dir):
    assignment_id = _to_submitted(client_for, base, we_dir)
    _approve(client_for, base, assignment_id)
    return assignment_id


def _open_dispute(client_for, base, assignment_id, reason="Hasil pekerjaan tidak sesuai"):
    r = client_for(base.employer_user).post(
        "/disputes",
        json={"assignment_id": str(assignment_id), "reason": reason},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _settle(client_for, base, assignment_id):
    r = client_for(base.employer_user).post(
        f"/payments/settle/{assignment_id}", json={"method": "BANK_TRANSFER"}
    )
    assert r.status_code == 200, r.text
    return r.json()["work_payment"]["id"]


def _upload_proof(client_for, base, work_payment_id, tp_dir, content=b"fakejpg"):
    tp_dir.mkdir(parents=True, exist_ok=True)
    r = client_for(base.employer_user).post(
        f"/payments/{work_payment_id}/upload-proof",
        files=[("file", ("bukti.jpg", content, "image/jpeg"))],
    )
    assert r.status_code == 200, r.text


def _notifs(client_for, user):
    r = client_for(user).get("/notifications")
    assert r.status_code == 200, r.text
    return r.json()


def _logs(client_for, user):
    r = client_for(user).get("/activity-logs")
    assert r.status_code == 200, r.text
    return r.json()


def _assignment_status(client_for, base, assignment_id, as_user=None):
    u = as_user or base.worker_user
    r = client_for(u).get(f"/assignments/{assignment_id}")
    assert r.status_code == 200, r.text
    return r.json()["status"]


def _payment_status(client_for, base, payment_id, as_user):
    r = client_for(as_user).get(f"/payments/{payment_id}")
    assert r.status_code == 200, r.text
    return r.json()["status"]


# ── Dispute: dibuka oleh Employer ────────────────────────────────────────────

def test_open_dispute_notifies_worker(client_for, base, monkeypatch, tmp_path):
    we = tmp_path / "we"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    assignment_id = _to_submitted(client_for, base, we)

    dispute_id = _open_dispute(client_for, base, assignment_id)

    # Worker diberi tahu dispute diajukan.
    w_dispute_notifs = [n for n in _notifs(client_for, base.worker_user)
                        if n["entity_type"] == "dispute"]
    assert len(w_dispute_notifs) == 1
    assert w_dispute_notifs[0]["entity_id"] == dispute_id

    # Employer (pembuka) TIDAK diberi tahu oleh create_dispute.
    e_dispute_notifs = [n for n in _notifs(client_for, base.employer_user)
                        if n["entity_type"] == "dispute"]
    assert e_dispute_notifs == []

    # Employer mencatat log create_dispute (actor = employer).
    e_logs = _logs(client_for, base.employer_user)
    assert any(l["action"] == "create_dispute" and l["entity_id"] == dispute_id
               for l in e_logs)
    # Worker tidak mencatat create_dispute (itu aksi employer).
    assert not any(l["action"] == "create_dispute" for l in _logs(client_for, base.worker_user))

    # Status assignment berubah ke disputed.
    assert _assignment_status(client_for, base, assignment_id) == "disputed"


# ── Dispute: diselesaikan oleh Admin (tiap keputusan) ───────────────────────

def _resolve(client_for, base, dispute_id, decision, resolution="Admin meninjau bukti dan memutuskan sesuai aturan yang berlaku."):
    r = client_for(base.admin_user).put(
        f"/admin/disputes/{dispute_id}/resolve",
        json={"decision": decision, "resolution": resolution},
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_resolve_dispute_approve_work(client_for, base, monkeypatch, tmp_path):
    we = tmp_path / "we"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    assignment_id = _to_submitted(client_for, base, we)
    dispute_id = _open_dispute(client_for, base, assignment_id)

    w_before = len([n for n in _notifs(client_for, base.worker_user) if n["entity_type"] == "dispute"])
    e_before = len([n for n in _notifs(client_for, base.employer_user) if n["entity_type"] == "dispute"])

    result = _resolve(client_for, base, dispute_id, "approve_work")
    assert result["status"] == "resolved"
    assert result["decision"] == "approve_work"
    assert _assignment_status(client_for, base, assignment_id) == "approved"

    # Worker & Employer masing-masing +1 notif dispute (dari resolve).
    assert len([n for n in _notifs(client_for, base.worker_user)
                 if n["entity_type"] == "dispute"]) == w_before + 1
    assert len([n for n in _notifs(client_for, base.employer_user)
                 if n["entity_type"] == "dispute"]) == e_before + 1

    # Pesan terbaru ke worker menyebut "diterima".
    w_latest = [n for n in _notifs(client_for, base.worker_user)
                if n["entity_type"] == "dispute"][0]  # newest first
    assert "diterima" in w_latest["message"].lower()

    # Admin mencatat log resolve_dispute; worker tidak.
    assert any(l["action"] == "resolve_dispute" for l in _logs(client_for, base.admin_user))
    assert not any(l["action"] == "resolve_dispute" for l in _logs(client_for, base.worker_user))


def test_resolve_dispute_needs_revision(client_for, base, monkeypatch, tmp_path):
    we = tmp_path / "we"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    assignment_id = _to_submitted(client_for, base, we)
    dispute_id = _open_dispute(client_for, base, assignment_id)

    result = _resolve(client_for, base, dispute_id, "needs_revision")
    assert result["decision"] == "needs_revision"
    assert _assignment_status(client_for, base, assignment_id) == "in_progress"

    w_latest = [n for n in _notifs(client_for, base.worker_user)
                if n["entity_type"] == "dispute"][0]
    assert "revisi" in w_latest["message"].lower()
    e_latest = [n for n in _notifs(client_for, base.employer_user)
                if n["entity_type"] == "dispute"][0]
    assert "revisi" in e_latest["message"].lower()


def test_resolve_dispute_reject_work(client_for, base, monkeypatch, tmp_path):
    we = tmp_path / "we"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    assignment_id = _to_submitted(client_for, base, we)
    dispute_id = _open_dispute(client_for, base, assignment_id)

    result = _resolve(client_for, base, dispute_id, "reject_work")
    assert result["decision"] == "reject_work"
    assert _assignment_status(client_for, base, assignment_id) == "disputed_closed"

    w_latest = [n for n in _notifs(client_for, base.worker_user)
                if n["entity_type"] == "dispute"][0]
    assert "ditolak" in w_latest["message"].lower()


def test_resolve_dispute_invalid_decision_no_trace(client_for, base, monkeypatch, tmp_path):
    we = tmp_path / "we"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    assignment_id = _to_submitted(client_for, base, we)
    dispute_id = _open_dispute(client_for, base, assignment_id)

    w_before = len(_notifs(client_for, base.worker_user))
    a_logs_before = len(_logs(client_for, base.admin_user))

    r = client_for(base.admin_user).put(
        f"/admin/disputes/{dispute_id}/resolve",
        json={"decision": "bogus", "resolution": "keputusan tidak valid"},
    )
    assert r.status_code == 400

    # Tidak ada notifikasi/log baru.
    assert len(_notifs(client_for, base.worker_user)) == w_before
    assert len(_logs(client_for, base.admin_user)) == a_logs_before
    # Dispute tetap open, assignment tetap disputed.
    assert _assignment_status(client_for, base, assignment_id) == "disputed"


# ── Payment: upload bukti transfer -> Admin ──────────────────────────────────

def test_upload_transfer_proof_notifies_admin(client_for, base, monkeypatch, tmp_path):
    we = tmp_path / "we"
    tp = tmp_path / "tp"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    monkeypatch.setattr("app.routers.payment.TRANSFER_PROOF_DIR", tp)

    assignment_id = _to_approved(client_for, base, we)
    work_payment_id = _settle(client_for, base, assignment_id)
    _upload_proof(client_for, base, work_payment_id, tp)

    # Admin menerima notifikasi verifikasi.
    admin_pay_notifs = [n for n in _notifs(client_for, base.admin_user)
                        if n["entity_type"] == "payment"]
    assert len(admin_pay_notifs) == 1
    assert "verifikasi" in admin_pay_notifs[0]["title"].lower()
    assert admin_pay_notifs[0]["entity_id"] == work_payment_id

    # Employer tidak diberi notifikasi oleh upload proof (notif ditujukan ke admin).
    e_pay_notifs = [n for n in _notifs(client_for, base.employer_user)
                    if n["entity_type"] == "payment"]
    assert e_pay_notifs == []

    # Employer mencatat log upload_transfer_proof.
    assert any(l["action"] == "upload_transfer_proof" for l in _logs(client_for, base.employer_user))


# ── Payment: verifikasi & penolakan oleh Admin -> Employer ──────────────────

def test_verify_payment_notifies_employer(client_for, base, monkeypatch, tmp_path):
    we = tmp_path / "we"
    tp = tmp_path / "tp"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    monkeypatch.setattr("app.routers.payment.TRANSFER_PROOF_DIR", tp)

    assignment_id = _to_approved(client_for, base, we)
    work_payment_id = _settle(client_for, base, assignment_id)
    _upload_proof(client_for, base, work_payment_id, tp)

    r = client_for(base.admin_user).put(
        f"/admin/payments/{work_payment_id}/verify", json={"notes": "dana masuk"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "verified"

    # Employer diberi tahu diverifikasi.
    e_pay_notifs = [n for n in _notifs(client_for, base.employer_user)
                    if n["entity_type"] == "payment"]
    assert len(e_pay_notifs) == 1
    assert "diverifikasi" in e_pay_notifs[0]["title"].lower()

    # Admin mencatat log verify_payment.
    assert any(l["action"] == "verify_payment" for l in _logs(client_for, base.admin_user))


def test_reject_payment_notifies_employer_with_reason(client_for, base, monkeypatch, tmp_path):
    we = tmp_path / "we"
    tp = tmp_path / "tp"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    monkeypatch.setattr("app.routers.payment.TRANSFER_PROOF_DIR", tp)

    assignment_id = _to_approved(client_for, base, we)
    work_payment_id = _settle(client_for, base, assignment_id)
    _upload_proof(client_for, base, work_payment_id, tp)

    reason = "Bukti transfer tidak dapat diverifikasi"
    r = client_for(base.admin_user).put(
        f"/admin/payments/{work_payment_id}/reject", json={"rejection_reason": reason}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"

    # Employer diberi tahu ditolak, beserta alasan yang aman ditampilkan.
    e_pay_notifs = [n for n in _notifs(client_for, base.employer_user)
                    if n["entity_type"] == "payment"]
    assert len(e_pay_notifs) == 1
    msg = e_pay_notifs[0]["message"].lower()
    assert "ditolak" in msg
    assert reason.lower() in msg  # alasan aman ikut ditampilkan

    # Admin mencatat log reject_payment.
    assert any(l["action"] == "reject_payment" for l in _logs(client_for, base.admin_user))


def test_reject_payment_not_awaiting_status_fails_no_trace(client_for, base, monkeypatch, tmp_path):
    we = tmp_path / "we"
    tp = tmp_path / "tp"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    monkeypatch.setattr("app.routers.payment.TRANSFER_PROOF_DIR", tp)

    assignment_id = _to_approved(client_for, base, we)
    work_payment_id = _settle(client_for, base, assignment_id)
    # TANPA upload proof -> status masih "pending", reject harus ditolak (400).

    e_before = len(_notifs(client_for, base.employer_user))
    a_logs_before = len(_logs(client_for, base.admin_user))

    r = client_for(base.admin_user).put(
        f"/admin/payments/{work_payment_id}/reject",
        json={"rejection_reason": "Bukti tidak valid dan tidak terbaca"},
    )
    assert r.status_code == 400

    assert len(_notifs(client_for, base.employer_user)) == e_before
    assert len(_logs(client_for, base.admin_user)) == a_logs_before
    # get_payment memberi akses ke employer pemilik task / worker — bukan admin.
    assert _payment_status(client_for, base, work_payment_id, base.employer_user) == "pending"


# ── Payment: pencairan oleh Admin -> Worker ──────────────────────────────────

def test_disburse_notifies_worker(client_for, base, monkeypatch, tmp_path):
    we = tmp_path / "we"
    tp = tmp_path / "tp"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    monkeypatch.setattr("app.routers.payment.TRANSFER_PROOF_DIR", tp)

    assignment_id = _to_approved(client_for, base, we)
    work_payment_id = _settle(client_for, base, assignment_id)
    _upload_proof(client_for, base, work_payment_id, tp)
    client_for(base.admin_user).put(
        f"/admin/payments/{work_payment_id}/verify", json={"notes": "ok"}
    )

    r = client_for(base.admin_user).put(
        f"/admin/payments/{work_payment_id}/disburse",
        data={"disbursement_reference": "TESTREF-001"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "disbursed"

    # Worker diberi tahu pencairan diterima.
    w_pay_notifs = [n for n in _notifs(client_for, base.worker_user)
                    if n["entity_type"] == "payment"]
    assert len(w_pay_notifs) == 1
    assert "pencairan" in w_pay_notifs[0]["title"].lower()

    # Admin mencatat log disburse_payment.
    assert any(l["action"] == "disburse_payment" for l in _logs(client_for, base.admin_user))


# ── Settle mencatat Activity Log tanpa notifikasi ────────────────────────────

def test_settle_logs_without_notification(client_for, base, monkeypatch, tmp_path):
    we = tmp_path / "we"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    assignment_id = _to_approved(client_for, base, we)

    w_before = len(_notifs(client_for, base.worker_user))
    e_before = len(_notifs(client_for, base.employer_user))
    a_before = len(_notifs(client_for, base.admin_user))

    work_payment_id = _settle(client_for, base, assignment_id)

    # Tidak ada notifikasi baru untuk siapa pun.
    assert len(_notifs(client_for, base.worker_user)) == w_before
    assert len(_notifs(client_for, base.employer_user)) == e_before
    assert len(_notifs(client_for, base.admin_user)) == a_before

    # Employer mencatat log settle_payment.
    assert any(l["action"] == "settle_payment" and l["entity_id"] == work_payment_id
               for l in _logs(client_for, base.employer_user))


# ── Pengguna tidak terkait tidak menerima notifikasi ─────────────────────────

def test_unrelated_user_receives_nothing(client_for, base, monkeypatch, tmp_path, make_user):
    we = tmp_path / "we"
    monkeypatch.setattr("app.routers.work_evidence.UPLOAD_DIR", we)
    assignment_id = _to_submitted(client_for, base, we)
    _open_dispute(client_for, base, assignment_id)

    other = make_user(name="Lain")
    assert _notifs(client_for, other) == []
    assert _logs(client_for, other) == []
