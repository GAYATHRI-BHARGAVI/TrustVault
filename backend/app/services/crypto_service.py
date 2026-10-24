import os
import base64
import hashlib
import hmac
import secrets
from typing import Tuple
from app.config import settings

# If cryptography library is available, use AESGCM
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    HAS_CRYPTOGRAPHY = True
except ImportError:
    HAS_CRYPTOGRAPHY = False

class CryptoService:
    def __init__(self):
        # Derive 32-byte (256-bit) AES key deterministically from master secret key
        self.master_key = hashlib.sha256(settings.MASTER_ENCRYPTION_KEY.encode()).digest()
        self.audit_key = hashlib.sha256(settings.AUDIT_HMAC_KEY.encode()).digest()

    def generate_secure_token(self, length: int = 32) -> str:
        """Generate a cryptographically secure hex token for sessions or IDs."""
        return secrets.token_hex(length)

    def hash_password(self, password: str) -> str:
        """Hash password using PBKDF2-HMAC-SHA256 with 300,000 iterations and random salt."""
        salt = secrets.token_bytes(16)
        iterations = 300_000
        key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations, dklen=32)
        # Format: pbkdf2_sha256$iterations$salt_b64$key_b64
        return f"pbkdf2_sha256${iterations}${base64.b64encode(salt).decode('ascii')}${base64.b64encode(key).decode('ascii')}"

    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against stored hash with timing attack resistance."""
        try:
            algorithm, iterations_str, salt_b64, key_b64 = hashed_password.split('$')
            if algorithm != "pbkdf2_sha256":
                return False
            iterations = int(iterations_str)
            salt = base64.b64decode(salt_b64.encode('ascii'))
            expected_key = base64.b64decode(key_b64.encode('ascii'))
            actual_key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations, dklen=32)
            return hmac.compare_digest(actual_key, expected_key)
        except Exception:
            return False

    def compute_sha256(self, data: bytes) -> str:
        """Compute SHA256 hex digest for data integrity verification."""
        return hashlib.sha256(data).hexdigest()

    def encrypt_document(self, plaintext: bytes, associated_data: str = "") -> Tuple[bytes, str, str]:
        """
        Encrypt plaintext using AES-256-GCM.
        Returns:
            - ciphertext (bytes, with 16-byte authentication tag appended)
            - nonce_b64 (base64-encoded 96-bit nonce)
            - plaintext_sha256 (hex digest of original plaintext)
        """
        if not HAS_CRYPTOGRAPHY:
            raise RuntimeError("Cryptography library required for AES-256-GCM encryption.")

        # 96-bit (12 bytes) standard nonce for AES-GCM
        nonce = secrets.token_bytes(12)
        aad = associated_data.encode('utf-8') if associated_data else None

        aesgcm = AESGCM(self.master_key)
        # In python cryptography, AESGCM.encrypt appends 16-byte auth tag at the end
        ciphertext = aesgcm.encrypt(nonce, plaintext, aad)
        
        nonce_b64 = base64.b64encode(nonce).decode('ascii')
        plaintext_sha256 = self.compute_sha256(plaintext)

        return ciphertext, nonce_b64, plaintext_sha256

    def decrypt_document(self, ciphertext: bytes, nonce_b64: str, associated_data: str = "") -> bytes:
        """
        Decrypt AES-256-GCM ciphertext.
        Raises ValueError if authentication tag does not match or tampering is detected.
        """
        if not HAS_CRYPTOGRAPHY:
            raise RuntimeError("Cryptography library required for AES-256-GCM decryption.")

        try:
            nonce = base64.b64decode(nonce_b64.encode('ascii'))
            aad = associated_data.encode('utf-8') if associated_data else None
            aesgcm = AESGCM(self.master_key)
            plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
            return plaintext
        except Exception as e:
            raise ValueError(f"Decryption failed: integrity check or authentication tag failed. Possible ciphertext tampering. ({str(e)})")

    def compute_audit_hash(self, sequence: int, timestamp_iso: str, actor_email: str, 
                           action: str, resource_type: str, resource_id: str, 
                           outcome: str, previous_hash: str, details_canonical: str) -> str:
        """
        Compute HMAC-SHA256 for audit hash chain.
        Ensures tamper-evident sequence linking previous record hash to current.
        """
        message = f"{sequence}|{timestamp_iso}|{actor_email}|{action}|{resource_type}|{resource_id or ''}|{outcome}|{previous_hash}|{details_canonical}"
        return hmac.new(self.audit_key, message.encode('utf-8'), hashlib.sha256).hexdigest()

crypto_service = CryptoService()
