<<<<<<< HEAD
# TrustVault: Secure Document Sharing. Verifiable Trust.

> **Enterprise Confidential Document Enclave with AES-256-GCM Encryption, Centralized Server Authorization, and HMAC-SHA256 Cryptographic Audit Hash Chains.**

---

## 1. System Architecture & Security Invariants

TrustVault is an application security platform designed for confidential document distribution, fine-grained access delegation, and non-repudiable audit verification.

```
                           +---------------------------+
                           |  Next.js 16 App Router    |
                           |  (Tailwind + Lucide)      |
                           +-------------+-------------+
                                         | Bearer Auth Token (Session)
                                         v
+---------------------------------------------------------------------------------+
|                               FastAPI Enclave Engine                            |
|                                                                                 |
|  [ Auth & Sessions ]      [ Server Authorization ]       [ AES-256-GCM Vault ]  |
|  - PBKDF2 300k rounds     - Non-delegated checks         - 96-bit random nonces |
|  - Single-active-session  - Immediate revocation         - AAD metadata binding |
|  - Invalidation on login  - Expiration enforcement       - Opaque storage names |
+----------------------------------------+----------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                       HMAC-SHA256 Cryptographic Audit Chain                     |
|                                                                                 |
|  Block #1 [Genesis]  <--  Block #2 [Upload]  <--  Block #3 [Grant]  <-- Head    |
|  HMAC(K, data1)           HMAC(K, d2|prev1)       HMAC(K, d3|prev2)             |
+---------------------------------------------------------------------------------+
```

### Security Invariants Enforced by TrustVault:

1. **Zero-Trust Server-Side Authorization:** Every document metadata lookup, inline stream, download, and permission change is authorized on the backend. Frontend roles, user IDs, and client flags are strictly untrusted.
2. **Private Encrypted File Storage:** All document contents are encrypted at rest using **AES-256-GCM** with a distinct 96-bit cryptographically secure random nonce (`secrets.token_bytes(12)`). Plaintext never touches disk storage; decrypted files are streamed directly in-memory to authenticated clients.
3. **Associated Authenticated Data (AAD):** Document titles and owner identities are bound directly into the AES-GCM authentication tag, detecting any unauthorized relocation or attribute tampering.
4. **Opaque Storage Identifiers:** Storage filenames are generated as cryptographically isolated random hex tokens (`enc_<token_hex(24)>.vault`). Real file basenames and directory hierarchies are never exposed or stored in the filesystem.
5. **Path Traversal & Payload Filtering:** Uploads are strictly validated against directory traversal patterns (`..`, null bytes, slashes), maximum file sizes (25MB limit), and whitelist MIME types.
6. **Time-Bound Grants & Immediate Revocation:** Grants can include hard expirations or be immediately revoked. Subsequent access queries receive immediate HTTP 403 / 404 denial responses without cache delays.
7. **Single-Active-Session Policy:** Establishing a new session immediately revokes older active sessions for that user account. Stolen tokens are neutralized on the next authorized login.
8. **Cryptographic Audit Hash Chain:** Every authentication attempt, document read, download, upload, and grant modification is recorded in a monotonic sequence where each block's HMAC-SHA256 seal depends directly on the previous block's hash.

---

## 2. Technology Stack

- **Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Lucide React.
- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy.
- **Database:** SQLite (local development) with standard migration path to PostgreSQL via SQLAlchemy.
- **Encryption:** AES-256-GCM (`cryptography` library / `hazmat.primitives.ciphers.aead.AESGCM`).
- **Integrity Chain:** HMAC-SHA256 with canonical JSON determinism.
- **Testing:** `pytest` security test suite (9 security-focused verification tests).

---

## 3. Cryptographic Audit Chain & Tamper Evidence

Each audit event record is calculated canonically:

$$\text{Canonical Message} = \text{sequence} \parallel \text{timestamp} \parallel \text{actor} \parallel \text{action} \parallel \text{resource\_type} \parallel \text{resource\_id} \parallel \text{outcome} \parallel \text{previous\_hash} \parallel \text{canonical\_details}$$

$$\text{Current Hash} = \text{HMAC-SHA256}(\text{AuditKey}, \text{Canonical Message})$$

### Verification Algorithm (`GET /api/audit/verify`):
1. Traverses the audit log strictly ordered by monotonic `sequence_number`.
2. Verifies sequence continuity ($S_i = S_{i-1} + 1$). Detects event deletion and reordering.
3. Verifies previous hash linking ($\text{PrevHash}_i = \text{CurrentHash}_{i-1}$). Detects broken chain insertions.
4. Recomputes HMAC-SHA256 using timing-safe comparison (`hmac.compare_digest`). Detects any field tampering or retro-active edits.

---

## 4. Deterministic Risk-Scoring Engine

TrustVault features an explainable risk scoring engine (range: 0–100) based on real-time audit telemetry:

- **Signal 1 (Access Denials):** 1–2 denials (+10 pts), 3–5 denials (+35 pts), >5 denials (+55 pts).
- **Signal 2 (Revoked Grants):** Access attempts against explicitly revoked documents (+20 pts/attempt, up to +40 pts).
- **Signal 3 (Download Velocity Spike):** Rapid burst of downloads exceeding 5 files/min (+20 pts) or 10 files/5 min (+40 pts).
- **Signal 4 (Disparate IP Sessions):** Active sessions across multiple distinct IP addresses (+25 pts).

**Severity Categories:**
- `LOW` (0–24): Normal baseline operation.
- `MEDIUM` (25–49): Review recent grant revocations and unauthorized access queries.
- `HIGH` (50–74): Require immediate re-authentication; alert Security Operations.
- `CRITICAL` (75–100): Trigger emergency kill-switch; revoke all active sessions immediately.

> **Zero Trust Rule:** Risk scoring is an observability and threat alerting mechanism. It **never replaces or relaxes server-side authorization**.

---

## 5. Pre-Seeded Demo Personas (Local Development)

The database includes pre-configured personas for testing permissions and security boundaries:

| Persona | Email | Password | Role / Purpose |
|---|---|---|---|
| **Alice Chen** | `alice@trustvault.internal` | `AlicePass123!#` | Document Owner (Restricted architecture specs) |
| **Bob Martinez** | `bob@trustvault.internal` | `BobPass123!#` | Collaborator (Active VIEW & DOWNLOAD grant) |
| **Charlie Vance** | `charlie@trustvault.internal` | `CharliePass123!#` | Contractor (Explicitly REVOKED grant for test denial) |
| **Chief Security Officer** | `admin@trustvault.internal` | `AdminPass123!#` | Admin (System oversight & emergency kill switch) |
| **SOC Lead Analyst** | `security@trustvault.internal` | `SecOfficer123!#` | Security Officer (Fleet risk monitoring & alerts) |
| **Compliance Officer** | `auditor@trustvault.internal` | `AuditorPass123!#` | Auditor (HMAC-SHA256 chain verification) |

---

## 6. Security Test Suite (Executed & Verified)

All security invariants are verified by the automated pytest suite in `backend/tests/test_security.py`:

```bash
python -m pytest backend/tests -v
```

### Verified Test Results:
- `test_unauthorized_user_cannot_read_private_document` -> **PASSED**
- `test_knowledge_of_document_id_does_not_grant_access` -> **PASSED**
- `test_expired_and_revoked_grants_are_denied` -> **PASSED**
- `test_viewers_cannot_grant_themselves_or_others_access` -> **PASSED**
- `test_old_sessions_are_rejected_after_revocation_or_single_session_policy` -> **PASSED**
- `test_ciphertext_tampering_is_detected_by_aes_gcm` -> **PASSED**
- `test_audit_tampering_is_detected_by_hash_chain` -> **PASSED**
- `test_oversized_uploads_and_path_traversal_are_rejected` -> **PASSED**
- `test_security_events_are_logged_appropriately` -> **PASSED**

---

## 7. Documented Production Limitations & Threat Model

1. **Hash Chain Threat Boundary:**
   An HMAC-SHA256 hash chain reliably detects database tampering by an attacker who lacks access to the secret HMAC key. However, if a privileged adversary simultaneously gains access to the database AND the `AUDIT_HMAC_KEY`, they could re-sign a forged chain. In enterprise production, TrustVault should be paired with:
   - Hardware Security Modules (HSM) / KMS with asymmetric signatures (e.g. Ed25519).
   - Write-Once-Read-Many (WORM) storage.
   - Remote streaming syslog/SIEM (Splunk, Chronicle) or public transparency ledgers (e.g., Sigstore / Rekor).

2. **Client-Side Viewer Watermarks:**
   The viewer displays dynamic user, IP, and timestamp watermarks as a psychological deterrent against leaks. However, as with all web applications, browser-level controls cannot prevent out-of-band capture (e.g., physical camera photography or OS-level display capturing).

3. **Single Active Session Across Replicas:**
   For multi-instance distributed deployments, local in-memory session checks should be backed by a distributed cache (e.g., Redis cluster) to guarantee sub-millisecond session invalidation across global regions.

---

## 8. Quickstart & Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ / npm

### Step 1: Install Backend Dependencies
```bash
python -m pip install fastapi uvicorn sqlalchemy cryptography pytest passlib bcrypt python-multipart
```

### Step 2: Initialize Database and Run Tests
```bash
python backend/app/seed.py
python -m pytest backend/tests -v
```

### Step 3: Run Full-Stack Development
On Windows PowerShell:
```powershell
.\start.ps1
```

Or run manually:
```bash
# Terminal 1 (Backend):
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 (Frontend):
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.
Interactive OpenAPI documentation is available at **http://127.0.0.1:8000/docs**.
=======
# TrustVault
TrustVault — Secure Document Sharing with a Verifiable Audit Trail. A security-focused document management platform featuring role-based access control, encrypted file storage, per-document permissions, immediate access revocation, and tamper-evident audit logging.
>>>>>>> 65e3aa63b0d8802497d3b4cdb48601cde517853b
