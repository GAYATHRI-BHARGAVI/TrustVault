import os
import sys

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from datetime import timedelta
from app.database import SessionLocal, Base, engine
from app.models import User, Document, DocumentGrant, AppRole, utc_now
from app.services.crypto_service import crypto_service
from app.services.storage_service import storage_service
from app.services.audit_service import audit_service

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if users already exist
        if db.query(User).count() > 0:
            print("[SEED] Database already populated. Skipping initial seed.")
            return

        print("[SEED] Seeding demo users with 3 standard roles (ADMIN, OWNER, VIEWER)...")
        demo_users = [
            {
                "email": "admin@trustvault.internal",
                "full_name": "Chief Security Officer",
                "password": "AdminPass123!#",
                "role": AppRole.ADMIN
            },
            {
                "email": "alice@trustvault.internal",
                "full_name": "Alice Chen (Principal Architect)",
                "password": "AlicePass123!#",
                "role": AppRole.OWNER
            },
            {
                "email": "bob@trustvault.internal",
                "full_name": "Bob Martinez (DevOps Lead)",
                "password": "BobPass123!#",
                "role": AppRole.VIEWER
            },
            {
                "email": "charlie@trustvault.internal",
                "full_name": "Charlie Vance (External Contractor)",
                "password": "CharliePass123!#",
                "role": AppRole.VIEWER
            },
            {
                "email": "security@trustvault.internal",
                "full_name": "SOC Lead Analyst",
                "password": "SecOfficer123!#",
                "role": AppRole.ADMIN
            },
            {
                "email": "auditor@trustvault.internal",
                "full_name": "Compliance Officer",
                "password": "AuditorPass123!#",
                "role": AppRole.VIEWER
            }
        ]

        created_users = {}
        for u in demo_users:
            user = User(
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=crypto_service.hash_password(u["password"]),
                role=u["role"],
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            created_users[u["email"]] = user

            # Record initial registration in audit chain
            audit_service.record_event(
                db=db,
                actor_email="system@trustvault.internal",
                action="USER_PROVISIONED",
                resource_type="USER",
                resource_id=user.id,
                outcome="SUCCESS",
                details={"email": user.email, "role": user.role, "full_name": user.full_name}
            )

        print("[SEED] Creating sample encrypted documents...")
        alice = created_users["alice@trustvault.internal"]
        admin = created_users["admin@trustvault.internal"]
        bob = created_users["bob@trustvault.internal"]
        charlie = created_users["charlie@trustvault.internal"]

        # Document 1: Project Titan
        doc1_content = (
            b"%PDF-1.4\n1 0 obj\n<< /Title (Project Titan Architecture Spec) /Author (Alice Chen) >>\n"
            b"stream\nCONFIDENTIAL HIGH-SECURITY ARCHITECTURE DESIGN DOCUMENT.\n"
            b"Classification: Restricted. AES-256-GCM Hardware Security Module specs.\n"
            b"endstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
        )
        ct1, nonce1, sha1 = crypto_service.encrypt_document(doc1_content, associated_data="Project Titan")
        storage1 = storage_service.save_encrypted_file(ct1)

        doc1 = Document(
            title="Project Titan - Architecture Spec v2.pdf",
            original_filename="project_titan_spec_v2.pdf",
            storage_path=storage1,
            mime_type="application/pdf",
            file_size_bytes=len(doc1_content),
            nonce_b64=nonce1,
            sha256_plaintext_digest=sha1,
            owner_id=alice.id,
            classification_level="CONFIDENTIAL"
        )
        db.add(doc1)
        db.commit()
        db.refresh(doc1)

        audit_service.record_event(
            db=db,
            actor_email=alice.email,
            actor_id=alice.id,
            action="DOC_UPLOAD",
            resource_type="DOCUMENT",
            resource_id=doc1.id,
            outcome="SUCCESS",
            details={"title": doc1.title, "size": len(doc1_content), "sha256": sha1, "storage": storage1}
        )

        # Document 2: SOC2 Type II Audit
        doc2_content = (
            b"# SOC2 Type II Independent Audit Report 2026\n\n"
            b"Audit Period: Q1-Q3 2026\nStatus: FULLY COMPLIANT\n"
            b"All 17 trust criteria satisfied without material deviations.\n"
            b"Hash chain audit trails and AES-GCM data at rest verified."
        )
        ct2, nonce2, sha2 = crypto_service.encrypt_document(doc2_content, associated_data="SOC2 Audit")
        storage2 = storage_service.save_encrypted_file(ct2)

        doc2 = Document(
            title="SOC2 Type II Audit Report 2026.md",
            original_filename="soc2_type2_audit_2026.md",
            storage_path=storage2,
            mime_type="text/markdown",
            file_size_bytes=len(doc2_content),
            nonce_b64=nonce2,
            sha256_plaintext_digest=sha2,
            owner_id=admin.id,
            classification_level="RESTRICTED"
        )
        db.add(doc2)
        db.commit()
        db.refresh(doc2)

        audit_service.record_event(
            db=db,
            actor_email=admin.email,
            actor_id=admin.id,
            action="DOC_UPLOAD",
            resource_type="DOCUMENT",
            resource_id=doc2.id,
            outcome="SUCCESS",
            details={"title": doc2.title, "size": len(doc2_content), "sha256": sha2}
        )

        # Document 3: Zero Trust Roadmap
        doc3_content = (
            b"TrustVault Zero-Trust Roadmap 2026-2027\n"
            b"1. Ephemeral cryptographic credentials\n"
            b"2. Hardware Security Module (HSM) PKCS#11 key storage\n"
            b"3. Distributed Byzantine-fault-tolerant audit consensus"
        )
        ct3, nonce3, sha3 = crypto_service.encrypt_document(doc3_content, associated_data="Zero Trust")
        storage3 = storage_service.save_encrypted_file(ct3)

        doc3 = Document(
            title="Zero-Trust Infrastructure Roadmap.txt",
            original_filename="zero_trust_roadmap.txt",
            storage_path=storage3,
            mime_type="text/plain",
            file_size_bytes=len(doc3_content),
            nonce_b64=nonce3,
            sha256_plaintext_digest=sha3,
            owner_id=alice.id,
            classification_level="INTERNAL"
        )
        db.add(doc3)
        db.commit()
        db.refresh(doc3)

        audit_service.record_event(
            db=db,
            actor_email=alice.email,
            actor_id=alice.id,
            action="DOC_UPLOAD",
            resource_type="DOCUMENT",
            resource_id=doc3.id,
            outcome="SUCCESS",
            details={"title": doc3.title, "size": len(doc3_content), "sha256": sha3}
        )

        print("[SEED] Creating initial grants...")
        # Alice grants Bob DOWNLOAD on Project Titan
        grant_bob = DocumentGrant(
            document_id=doc1.id,
            granted_by_id=alice.id,
            recipient_email=bob.email,
            recipient_id=bob.id,
            permission_level="DOWNLOAD",
            expires_at=utc_now() + timedelta(days=7),
            is_revoked=False
        )
        db.add(grant_bob)
        db.commit()
        db.refresh(grant_bob)

        audit_service.record_event(
            db=db,
            actor_email=alice.email,
            actor_id=alice.id,
            action="GRANT_CREATE",
            resource_type="GRANT",
            resource_id=grant_bob.id,
            outcome="SUCCESS",
            details={"recipient": bob.email, "permission": "DOWNLOAD", "document": doc1.title}
        )

        # Alice grants Charlie VIEW, which is then explicitly revoked (to demonstrate revocation audit)
        grant_charlie = DocumentGrant(
            document_id=doc1.id,
            granted_by_id=alice.id,
            recipient_email=charlie.email,
            recipient_id=charlie.id,
            permission_level="VIEW",
            expires_at=utc_now() + timedelta(days=1),
            is_revoked=True,
            revoked_at=utc_now(),
            revoked_by_id=alice.id,
            revocation_reason="Contractor engagement concluded; permissions withdrawn."
        )
        db.add(grant_charlie)
        db.commit()
        db.refresh(grant_charlie)

        audit_service.record_event(
            db=db,
            actor_email=alice.email,
            actor_id=alice.id,
            action="GRANT_CREATE",
            resource_type="GRANT",
            resource_id=grant_charlie.id,
            outcome="SUCCESS",
            details={"recipient": charlie.email, "permission": "VIEW", "document": doc1.title}
        )

        audit_service.record_event(
            db=db,
            actor_email=alice.email,
            actor_id=alice.id,
            action="GRANT_REVOKE",
            resource_type="GRANT",
            resource_id=grant_charlie.id,
            outcome="SUCCESS",
            details={"recipient": charlie.email, "reason": grant_charlie.revocation_reason, "document": doc1.title}
        )

        # Initial chain integrity check recorded
        integrity = audit_service.verify_chain_integrity(db)
        audit_service.record_event(
            db=db,
            actor_email="system@trustvault.internal",
            action="INTEGRITY_CHECK",
            resource_type="SYSTEM",
            outcome="SUCCESS",
            details={"status": "CHAIN_VERIFIED_VALID", "head_hash": integrity["chain_head_hash"]}
        )

        print("[SEED] TrustVault demo database initialized successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
