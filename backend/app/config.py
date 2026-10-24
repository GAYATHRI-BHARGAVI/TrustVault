import os
from pydantic import BaseModel
from typing import List

class Settings(BaseModel):
    APP_NAME: str = "TrustVault"
    TAGLINE: str = "Secure Document Sharing. Verifiable Trust."
    DEBUG: bool = False
    ENV: str = os.getenv("ENVIRONMENT", "development")

    # Security & Crypto
    SECRET_KEY: str = os.getenv("SECRET_KEY", "trustvault_super_secret_jwt_master_key_32_bytes_min!")
    AUDIT_HMAC_KEY: str = os.getenv("AUDIT_HMAC_KEY", "trustvault_audit_hmac_integrity_chain_key_2026!")
    MASTER_ENCRYPTION_KEY: str = os.getenv("MASTER_ENCRYPTION_KEY", "trustvault_aes_256_gcm_master_storage_key_32b!")
    
    # Session policy
    SINGLE_ACTIVE_SESSION: bool = os.getenv("SINGLE_ACTIVE_SESSION", "true").lower() in ("true", "1", "yes")
    SESSION_EXPIRE_MINUTES: int = int(os.getenv("SESSION_EXPIRE_MINUTES", "120")) # 2 hours
    
    # File Storage
    MAX_FILE_SIZE_BYTES: int = int(os.getenv("MAX_FILE_SIZE_BYTES", str(25 * 1024 * 1024))) # 25 MB
    ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf",
        "text/plain",
        "text/markdown",
        "text/csv",
        "application/json",
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", # docx
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", # xlsx
    ]
    ALLOWED_EXTENSIONS: List[str] = [
        ".pdf", ".txt", ".md", ".csv", ".json", ".png", ".jpg", ".jpeg", ".webp", ".docx", ".xlsx"
    ]
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "encrypted_vault"))
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'trustvault.db')}")

    # Risk Engine Thresholds
    RISK_DENIAL_THRESHOLD: int = 3
    RISK_RAPID_DOWNLOAD_WINDOW_SEC: int = 60
    RISK_RAPID_DOWNLOAD_THRESHOLD: int = 5

settings = Settings()
