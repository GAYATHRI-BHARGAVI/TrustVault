import os
import secrets
from pathlib import Path
from typing import Tuple
from app.config import settings

class StorageService:
    def __init__(self):
        self.storage_dir = Path(settings.STORAGE_DIR)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def validate_file(self, filename: str, content_type: str, file_size: int) -> Tuple[bool, str]:
        """
        Validate file size, extension, and content type.
        Prevent path traversal attacks.
        """
        # Check size
        if file_size <= 0:
            return False, "File is empty."
        if file_size > settings.MAX_FILE_SIZE_BYTES:
            max_mb = settings.MAX_FILE_SIZE_BYTES / (1024 * 1024)
            return False, f"File exceeds maximum allowed size of {max_mb:.1f} MB."

        # Check path traversal in filename
        if ".." in filename or "/" in filename or "\\" in filename or "\x00" in filename:
            return False, "Invalid filename: path traversal sequences detected."

        # Check extension
        ext = os.path.splitext(filename)[1].lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            return False, f"File extension '{ext}' is not permitted. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"

        # Validate MIME type
        if content_type.lower() not in settings.ALLOWED_MIME_TYPES and content_type.lower() != "application/octet-stream":
            return False, f"MIME type '{content_type}' is not supported."

        return True, ""

    def save_encrypted_file(self, ciphertext: bytes) -> str:
        """
        Store encrypted payload with an opaque cryptographically secure random filename.
        Returns relative storage filename.
        """
        random_name = f"enc_{secrets.token_hex(24)}.vault"
        file_path = self.storage_dir / random_name
        
        with open(file_path, "wb") as f:
            f.write(ciphertext)

        return random_name

    def read_encrypted_file(self, storage_filename: str) -> bytes:
        """
        Safely read ciphertext from vault, preventing path traversal.
        """
        # Strict security check: filename must be pure basename
        if ".." in storage_filename or "/" in storage_filename or "\\" in storage_filename:
            raise PermissionError("Path traversal violation on storage access.")

        file_path = (self.storage_dir / storage_filename).resolve()
        
        # Verify file resides inside storage_dir
        if not str(file_path).startswith(str(self.storage_dir.resolve())):
            raise PermissionError("Access outside vault root is forbidden.")

        if not file_path.exists():
            raise FileNotFoundError("Encrypted file payload missing from vault.")

        with open(file_path, "rb") as f:
            return f.read()

    def delete_encrypted_file(self, storage_filename: str) -> bool:
        """Safely delete encrypted file payload from vault."""
        if ".." in storage_filename or "/" in storage_filename or "\\" in storage_filename:
            raise PermissionError("Path traversal violation on storage deletion.")

        file_path = (self.storage_dir / storage_filename).resolve()
        if file_path.exists() and str(file_path).startswith(str(self.storage_dir.resolve())):
            file_path.unlink()
            return True
        return False

storage_service = StorageService()
