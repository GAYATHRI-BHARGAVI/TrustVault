import io
import pytest
from datetime import timedelta, datetime, timezone
from app.models import User, Document, DocumentGrant, AuditLog, AppRole
from app.services.crypto_service import crypto_service
from app.services.storage_service import storage_service
from app.services.audit_service import audit_service

def get_auth_token(client, email, password):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["session_token"]

def test_unauthorized_user_cannot_read_private_document(client, db_session):
    """
    Test 1: Charlie has no grant for Alice's document and must be denied access.
    """
    doc = db_session.query(Document).first()
    assert doc is not None

    charlie_token = get_auth_token(client, "charlie@trustvault.internal", "CharliePass123!#")

    # Attempt to view metadata
    resp = client.get(f"/api/documents/{doc.id}", headers={"Authorization": f"Bearer {charlie_token}"})
    assert resp.status_code == 404, "Unauthorized document access must return 404/denial"

    # Attempt to view raw decrypted stream
    resp_stream = client.get(f"/api/documents/{doc.id}/view", headers={"Authorization": f"Bearer {charlie_token}"})
    assert resp_stream.status_code in (403, 404)

def test_knowledge_of_document_id_does_not_grant_access(client, db_session):
    """
    Test 2: Knowing valid UUID of private document does not allow reading or downloading it.
    """
    doc = db_session.query(Document).first()
    charlie_token = get_auth_token(client, "charlie@trustvault.internal", "CharliePass123!#")

    resp_download = client.get(f"/api/documents/{doc.id}/download", headers={"Authorization": f"Bearer {charlie_token}"})
    assert resp_download.status_code in (403, 404)

def test_expired_and_revoked_grants_are_denied(client, db_session):
    """
    Test 3: Expired grants and explicitly revoked grants must immediately block access.
    """
    doc = db_session.query(Document).first()
    alice = db_session.query(User).filter(User.email == "alice@trustvault.internal").first()
    bob = db_session.query(User).filter(User.email == "bob@trustvault.internal").first()
    bob_token = get_auth_token(client, "bob@trustvault.internal", "BobPass123!#")

    # 1. Grant that is already expired
    expired_grant = DocumentGrant(
        document_id=doc.id,
        granted_by_id=alice.id,
        recipient_email=bob.email,
        recipient_id=bob.id,
        permission_level="VIEW",
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        is_revoked=False
    )
    db_session.add(expired_grant)
    db_session.commit()

    resp = client.get(f"/api/documents/{doc.id}/view", headers={"Authorization": f"Bearer {bob_token}"})
    assert resp.status_code == 403
    assert "expired" in resp.json()["detail"].lower()

    # 2. Grant that is revoked
    expired_grant.expires_at = datetime.now(timezone.utc) + timedelta(days=5)
    expired_grant.is_revoked = True
    expired_grant.revoked_at = datetime.now(timezone.utc)
    db_session.commit()

    resp_revoked = client.get(f"/api/documents/{doc.id}/view", headers={"Authorization": f"Bearer {bob_token}"})
    assert resp_revoked.status_code == 403
    assert "revoked" in resp_revoked.json()["detail"].lower()

def test_viewers_cannot_grant_themselves_or_others_access(client, db_session):
    """
    Test 4: Users with only VIEW permission cannot create grants or escalate privileges.
    """
    doc = db_session.query(Document).first()
    alice = db_session.query(User).filter(User.email == "alice@trustvault.internal").first()
    bob = db_session.query(User).filter(User.email == "bob@trustvault.internal").first()

    # Give Bob VIEW permission
    view_grant = DocumentGrant(
        document_id=doc.id,
        granted_by_id=alice.id,
        recipient_email=bob.email,
        recipient_id=bob.id,
        permission_level="VIEW",
        is_revoked=False
    )
    db_session.add(view_grant)
    db_session.commit()

    bob_token = get_auth_token(client, "bob@trustvault.internal", "BobPass123!#")

    # Bob attempts to grant Charlie access or escalate his own
    resp = client.post(
        f"/api/documents/{doc.id}/grants",
        json={"recipient_email": "charlie@trustvault.internal", "permission_level": "MANAGE"},
        headers={"Authorization": f"Bearer {bob_token}"}
    )
    assert resp.status_code == 403, "Viewer must not be permitted to issue grants"

def test_old_sessions_are_rejected_after_revocation_or_single_session_policy(client, db_session):
    """
    Test 5: When a user logs in again under single-active-session policy, or explicitly logs out,
    the old session token is permanently rejected.
    """
    token_1 = get_auth_token(client, "alice@trustvault.internal", "AlicePass123!#")
    
    # Alice accesses endpoint with token_1 -> OK
    resp1 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_1}"})
    assert resp1.status_code == 200

    # Alice logs in again -> creates token_2
    token_2 = get_auth_token(client, "alice@trustvault.internal", "AlicePass123!#")

    # token_1 must now be rejected due to single active session policy
    resp_old = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_1}"})
    assert resp_old.status_code == 401, "Old session token must be rejected"

    # token_2 must be active
    resp_new = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_2}"})
    assert resp_new.status_code == 200

    # Alice logs out token_2
    resp_logout = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token_2}"})
    assert resp_logout.status_code == 200

    # token_2 is now also rejected
    resp_after_logout = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_2}"})
    assert resp_after_logout.status_code == 401

def test_ciphertext_tampering_is_detected_by_aes_gcm(client, db_session):
    """
    Test 6: Bit-flipping ciphertext causes AES-256-GCM authentication tag failure.
    """
    doc = db_session.query(Document).first()
    alice_token = get_auth_token(client, "alice@trustvault.internal", "AlicePass123!#")

    # Tamper with storage file
    file_path = storage_service.storage_dir / doc.storage_path
    with open(file_path, "rb") as f:
        data = bytearray(f.read())
    
    # Flip byte in ciphertext body
    data[10] ^= 0x55
    with open(file_path, "wb") as f:
        f.write(bytes(data))

    # Attempt to decrypt and view
    resp = client.get(f"/api/documents/{doc.id}/view", headers={"Authorization": f"Bearer {alice_token}"})
    assert resp.status_code == 500
    assert "tamper" in resp.json()["detail"].lower() or "decryption" in resp.json()["detail"].lower()

def test_audit_tampering_is_detected_by_hash_chain(client, db_session):
    """
    Test 7: Any modification to audit records or previous hash links breaks the HMAC chain.
    """
    alice_token = get_auth_token(client, "alice@trustvault.internal", "AlicePass123!#")

    # 1. Chain must be valid initially
    verify_resp = client.get("/api/audit/verify", headers={"Authorization": f"Bearer {alice_token}"})
    assert verify_resp.status_code == 200
    assert verify_resp.json()["is_valid"] is True

    # 2. Tamper with an audit record in the database directly
    audit_entry = db_session.query(AuditLog).first()
    audit_entry.action = "TAMPERED_ACTION_UNAUTHORIZED"
    db_session.commit()

    # 3. Verification must immediately detect the HMAC mismatch
    verify_after = client.get("/api/audit/verify", headers={"Authorization": f"Bearer {alice_token}"})
    assert verify_after.status_code == 200
    result = verify_after.json()
    assert result["is_valid"] is False
    assert result["tampered_sequence"] == audit_entry.sequence_number
    assert "HMAC cryptographic verification failed" in result["failure_reason"]

def test_oversized_uploads_and_path_traversal_are_rejected(client, db_session):
    """
    Test 8: Rejects uploads that exceed size limit or contain path traversal characters.
    """
    alice_token = get_auth_token(client, "alice@trustvault.internal", "AlicePass123!#")

    # 1. Path traversal in filename
    traversal_file = io.BytesIO(b"malicious payload content")
    resp_traversal = client.post(
        "/api/documents/upload",
        files={"file": ("../../etc/passwd.txt", traversal_file, "text/plain")},
        data={"title": "Path Traversal Test"},
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert resp_traversal.status_code == 400
    assert "path traversal" in resp_traversal.json()["detail"].lower()

    # 2. Oversized payload (26MB exceeds 25MB max)
    large_payload = b"X" * (26 * 1024 * 1024)
    resp_large = client.post(
        "/api/documents/upload",
        files={"file": ("large_dump.txt", io.BytesIO(large_payload), "text/plain")},
        data={"title": "Large File Test"},
        headers={"Authorization": f"Bearer {alice_token}"}
    )
    assert resp_large.status_code == 400
    assert "exceeds" in resp_large.json()["detail"].lower()

def test_security_events_are_logged_appropriately(client, db_session):
    """
    Test 9: Access denials and critical security actions are properly recorded in the audit log.
    """
    charlie_token = get_auth_token(client, "charlie@trustvault.internal", "CharliePass123!#")
    doc = db_session.query(Document).first()

    # Charlie triggers a denied access
    client.get(f"/api/documents/{doc.id}/view", headers={"Authorization": f"Bearer {charlie_token}"})

    # Verify audit log contains entry for charlie with outcome DENIED
    latest_denial = db_session.query(AuditLog).filter(
        AuditLog.actor_email == "charlie@trustvault.internal",
        AuditLog.outcome == "DENIED"
    ).first()

    assert latest_denial is not None
    assert latest_denial.action == "ACCESS_DENIED_READ"

def test_registration_flow_and_duplicate_rejection(client, db_session):
    """
    Test 10: New user registers, receives default OWNER role, and duplicate registrations are rejected.
    """
    # 1. Successful registration
    reg_resp = client.post("/api/auth/register", json={
        "email": "david@trustvault.internal",
        "full_name": "David Bowie",
        "password": "SecurePassword123!#"
    })
    assert reg_resp.status_code == 200
    data = reg_resp.json()
    assert data["user"]["role"] == AppRole.OWNER
    assert data["session_token"] is not None

    # 2. Reject duplicate account
    dup_resp = client.post("/api/auth/register", json={
        "email": "david@trustvault.internal",
        "full_name": "David Imposter",
        "password": "DifferentPassword456!#"
    })
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"].lower()

def test_viewer_role_cannot_upload_or_delete_document(client, db_session):
    """
    Test 11: Users with VIEWER role cannot upload documents or delete documents.
    """
    bob_token = get_auth_token(client, "bob@trustvault.internal", "BobPass123!#")
    doc = db_session.query(Document).first()

    # Bob (VIEWER) attempts upload -> 403 Forbidden
    upload_resp = client.post(
        "/api/documents/upload",
        files={"file": ("viewer_test.txt", io.BytesIO(b"Hello from viewer"), "text/plain")},
        data={"title": "Viewer Upload Attempt"},
        headers={"Authorization": f"Bearer {bob_token}"}
    )
    assert upload_resp.status_code == 403
    assert "viewers" in upload_resp.json()["detail"].lower()

    # Bob (VIEWER) attempts delete -> 403 Forbidden
    del_resp = client.delete(f"/api/documents/{doc.id}", headers={"Authorization": f"Bearer {bob_token}"})
    assert del_resp.status_code == 403

def test_owner_cannot_manage_another_owners_document(client, db_session):
    """
    Test 12: An owner cannot grant or revoke access to another owner's document by changing the document ID.
    """
    # Register a second owner, Frank
    client.post("/api/auth/register", json={
        "email": "frank@trustvault.internal",
        "full_name": "Frank Castle",
        "password": "FrankPassword123!#"
    })
    frank_token = get_auth_token(client, "frank@trustvault.internal", "FrankPassword123!#")

    # Alice's document
    doc = db_session.query(Document).first()

    # Frank attempts to grant Bob access to Alice's document -> 403 Forbidden
    grant_resp = client.post(
        f"/api/documents/{doc.id}/grants",
        json={"recipient_email": "bob@trustvault.internal", "permission_level": "VIEW"},
        headers={"Authorization": f"Bearer {frank_token}"}
    )
    assert grant_resp.status_code == 403

def test_account_deactivation_blocks_login_and_invalidates_sessions(client, db_session):
    """
    Test 13: Deactivating an account terminates active sessions and blocks future login attempts.
    """
    alice_token = get_auth_token(client, "alice@trustvault.internal", "AlicePass123!#")
    admin_token = get_auth_token(client, "admin@trustvault.internal", "AdminPass123!#")
    alice = db_session.query(User).filter(User.email == "alice@trustvault.internal").first()

    # 1. Admin deactivates Alice
    status_resp = client.put(
        f"/api/admin/users/{alice.id}/status",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert status_resp.status_code == 200

    # 2. Alice's active session is now rejected
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {alice_token}"})
    assert me_resp.status_code == 401

    # 3. Future login attempts are rejected with account deactivated error
    login_resp = client.post("/api/auth/login", json={
        "email": "alice@trustvault.internal",
        "password": "AlicePass123!#"
    })
    assert login_resp.status_code == 401
    assert "deactivated" in login_resp.json()["detail"].lower()
