import os
import sys
import tempfile
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Create a temporary file for test database
test_db_file = os.path.join(tempfile.gettempdir(), "test_trustvault.db")
if os.path.exists(test_db_file):
    try:
        os.remove(test_db_file)
    except Exception:
        pass

os.environ["DATABASE_URL"] = f"sqlite:///{test_db_file}"
os.environ["ENVIRONMENT"] = "testing"
os.environ["MASTER_ENCRYPTION_KEY"] = "test_master_encryption_key_32_bytes_len!"
os.environ["AUDIT_HMAC_KEY"] = "test_audit_hmac_key_32_bytes_len!"
os.environ["SINGLE_ACTIVE_SESSION"] = "true"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
settings.DATABASE_URL = f"sqlite:///{test_db_file}"
settings.SINGLE_ACTIVE_SESSION = True

from app.database import Base, engine, SessionLocal, get_db
from app.main import app
from app.models import User, Document, DocumentGrant, AppRole
from app.services.crypto_service import crypto_service
from app.services.storage_service import storage_service
from app.services.audit_service import audit_service

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    storage_service.storage_dir.mkdir(parents=True, exist_ok=True)
    yield
    # Cleanup test db file after session
    try:
        if os.path.exists(test_db_file):
            os.remove(test_db_file)
    except Exception:
        pass

@pytest.fixture
def db_session():
    # Fresh tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_test_database(db)
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def seed_test_database(db):
    # Ensure fresh seed with standard 3 roles: ADMIN, OWNER, VIEWER
    admin = User(
        email="admin@trustvault.internal",
        full_name="Chief Admin",
        hashed_password=crypto_service.hash_password("AdminPass123!#"),
        role=AppRole.ADMIN,
        is_active=True
    )
    alice = User(
        email="alice@trustvault.internal",
        full_name="Alice Chen",
        hashed_password=crypto_service.hash_password("AlicePass123!#"),
        role=AppRole.OWNER,
        is_active=True
    )
    bob = User(
        email="bob@trustvault.internal",
        full_name="Bob Martinez",
        hashed_password=crypto_service.hash_password("BobPass123!#"),
        role=AppRole.VIEWER,
        is_active=True
    )
    charlie = User(
        email="charlie@trustvault.internal",
        full_name="Charlie Vance",
        hashed_password=crypto_service.hash_password("CharliePass123!#"),
        role=AppRole.VIEWER,
        is_active=True
    )
    db.add_all([admin, alice, bob, charlie])
    db.commit()

    content = b"TOP SECRET: Project Titan High-Security Architecture Spec"
    ct, nonce, sha = crypto_service.encrypt_document(content, associated_data=f"doc:Project Titan Spec.pdf:{alice.id}")
    storage_name = storage_service.save_encrypted_file(ct)

    doc = Document(
        title="Project Titan Spec.pdf",
        original_filename="titan_spec.pdf",
        storage_path=storage_name,
        mime_type="application/pdf",
        file_size_bytes=len(content),
        nonce_b64=nonce,
        sha256_plaintext_digest=sha,
        owner_id=alice.id,
        classification_level="CONFIDENTIAL"
    )
    db.add(doc)
    db.commit()

    audit_service.record_event(
        db=db,
        actor_email=alice.email,
        action="DOC_UPLOAD",
        resource_type="DOCUMENT",
        resource_id=doc.id,
        outcome="SUCCESS",
        details={"title": doc.title}
    )
