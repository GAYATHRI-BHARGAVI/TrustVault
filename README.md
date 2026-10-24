# TrustVault: Secure Document Sharing. Verifiable Trust.

**[🚀 Live Application — Open TrustVault](https://0nl0b7jl-3000.inc1.devtunnels.ms/)**

**Enterprise Confidential Document Enclave with AES-256-GCM Encryption, Centralized Server Authorization, and HMAC-SHA256 Cryptographic Audit Hash Chains.**

---

## 1. System Architecture & Security Invariants

TrustVault is an application security platform designed for confidential document distribution, fine-grained access delegation, and non-repudiable audit verification.

```text
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

### Security Invariants Enforced by TrustVault

1. **Zero-Trust Server-Side Authorization:** Every document metadata lookup, inline stream, download, and permission change is authorized on the backend. Frontend roles, user IDs, and client flags are strictly untrusted.

2. **Private Encrypted File Storage:** Document contents are encrypted at rest using **AES-256-GCM** with a distinct 96-bit cryptographically secure random nonce (`secrets.token_bytes(12)`). Plaintext never touches disk storage; decrypted files are streamed directly in-memory to authenticated clients.

3. **Associated Authenticated Data (AAD):** Document titles and owner identities are bound directly into the AES-GCM authentication tag, detecting unauthorized relocation or attribute tampering.

4. **Opaque Storage Identifiers:** Storage filenames are generated as cryptographically random hex tokens (`enc_<token_hex(24)>.vault`). Real file basenames and directory hierarchies are never exposed or stored in the filesystem.

5. **Path Traversal & Payload Filtering:** Uploads are validated against directory traversal patterns (`..`, null bytes, slashes), maximum file sizes (25 MB limit), and whitelisted MIME types.

6. **Time-Bound Grants & Immediate Revocation:** Grants can include expiration times or be immediately revoked. Subsequent access queries receive HTTP 403/404 denial responses without cache delays.

7. **Single-Active-Session Policy:** Establishing a new session immediately revokes older active sessions for that user account. Stolen tokens are neutralized on the next authorized login.

8. **Cryptographic Audit Hash Chain:** Authentication attempts, document reads, downloads, uploads, and grant modifications are recorded in a monotonic sequence where each block's HMAC-SHA256 seal depends directly on the previous block's hash.

---

## 2. Technology Stack

- **Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Lucide React.
- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy.
- **Database:** SQLite (local development) with a migration path to PostgreSQL via SQLAlchemy.
- **Encryption:** AES-256-GCM (`cryptography` library / `hazmat.primitives.ciphers.aead.AESGCM`).
- **Integrity Chain:** HMAC-SHA256 with canonical JSON determinism.
- **Testing:** pytest security test suite.

---

## 3. Cryptographic Audit Chain & Tamper Evidence

Each audit event record is calculated canonically:

\[
\begin{aligned}
\text{Canonical Message} ={}&
\text{sequence} \parallel \text{timestamp} \parallel \text{actor}\\
&\parallel \text{action} \parallel \text{resource\_type}\\
&\parallel \text{resource\_id} \parallel \text{outcome}\\
&\parallel \text{previous\_hash} \parallel \text{canonical\_details}
\end{aligned}
\]

\[
\text{Current Hash} =
\text{HMAC-SHA256}(\text{AuditKey},\text{Canonical Message})
\]

### Verification Algorithm (`GET /api/audit/verify`)

1. Traverses the audit log strictly ordered by monotonic `sequence_number`.
2. Verifies sequence continuity (\(S_i = S_{i-1} + 1\)). Detects event deletion and reordering.
3. Verifies previous-hash linking (\(\text{PrevHash}_i = \text{CurrentHash}_{i-1}\)). Detects broken chain insertions.
4. Recomputes HMAC-SHA256 using timing-safe comparison (`hmac.compare_digest`). Detects field tampering and retroactive edits.

---

## 4. Deterministic Risk-Scoring Engine

TrustVault features an explainable risk-scoring engine (range: 0–100) based on audit telemetry.

### Risk Signals

- **Signal 1 — Access Denials:** 1–2 denials (+10 points), 3–5 denials (+35 points), more than 5 denials (+55 points).
- **Signal 2 — Revoked Grants:** Access attempts against explicitly revoked documents (+20 points per attempt, up to +40 points).
- **Signal 3 — Download Velocity Spike:** Rapid bursts exceeding 5 files/minute (+20 points) or 10 files/5 minutes (+40 points).
- **Signal 4 — Disparate IP Sessions:** Active sessions across multiple distinct IP addresses (+25 points).

### Severity Categories

- `LOW` (0–24): Normal baseline operation.
- `MEDIUM` (25–49): Review recent grant revocations and unauthorized access queries.
- `HIGH` (50–74): Require immediate re-authentication and alert Security Operations.
- `CRITICAL` (75–100): Trigger the configured emergency response and revoke active sessions where implemented.

> **Zero Trust Rule:** Risk scoring is an observability and threat-alerting mechanism. It never replaces or relaxes server-side authorization.

---

## 5. Pre-Seeded Demo Personas (Local Development)

The database includes pre-configured personas for testing permissions and security boundaries.

| Persona | Email | Role / Purpose |
|---|---|---|
| **Alice Chen** | `alice@trustvault.internal` | Document Owner — restricted architecture specifications |
| **Bob Martinez** | `bob@trustvault.internal` | Collaborator — active VIEW and DOWNLOAD grant |
| **Charlie Vance** | `charlie@trustvault.internal` | Contractor — revoked grant for access-denial testing |
| **Chief Security Officer** | `admin@trustvault.internal` | Admin — system oversight and emergency controls |
| **SOC Lead Analyst** | `security@trustvault.internal` | Security Officer — risk monitoring and alerts |
| **Compliance Officer** | `auditor@trustvault.internal` | Auditor — HMAC-SHA256 chain verification |

**Demo passwords are intentionally excluded from this public README.** Use the local seed script and private development instructions to obtain or configure demo credentials. Never publish production credentials, access tokens, or secrets.

---

## 6. Security Test Suite

The automated security test suite is located in `backend/tests/test_security.py`.

Run it from the project root:

```bash
python -m pytest backend/tests -v
```

The suite includes tests for:

- `test_unauthorized_user_cannot_read_private_document`
- `test_knowledge_of_document_id_does_not_grant_access`
- `test_expired_and_revoked_grants_are_denied`
- `test_viewers_cannot_grant_themselves_or_others_access`
- `test_old_sessions_are_rejected_after_revocation_or_single_session_policy`
- `test_ciphertext_tampering_is_detected_by_aes_gcm`
- `test_audit_tampering_is_detected_by_hash_chain`
- `test_oversized_uploads_and_path_traversal_are_rejected`
- `test_security_events_are_logged_appropriately`

Run the tests to verify their current status. Results may vary depending on the code, database state, and test environment.

---

## 7. Documented Production Limitations & Threat Model

### 1. Hash Chain Threat Boundary

An HMAC-SHA256 hash chain detects database tampering when an attacker lacks access to the secret HMAC key. However, if a privileged adversary gains access to both the database and `AUDIT_HMAC_KEY`, they could re-sign a forged chain.

For enterprise production, TrustVault should be paired with:

- Hardware Security Modules (HSMs) or managed key services.
- Write-Once-Read-Many (WORM) storage.
- Remote streaming syslog/SIEM platforms such as Splunk or Chronicle.
- Public transparency or audit systems where appropriate.

### 2. Client-Side Viewer Watermarks

Dynamic user, IP, and timestamp watermarks can act as a deterrent against information leaks. However, browser-level controls cannot prevent all out-of-band capture, including physical camera photography or operating-system screen capture.

### 3. Single Active Session Across Replicas

For multi-instance deployments, local in-memory session checks should be backed by a distributed cache or shared session store, such as Redis, to coordinate session invalidation across instances.

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

**Warning:** Run the seed script only against your intended local development database. Review its behavior before running it against any database containing real data.

### Step 3: Run Full-Stack Development

On Windows PowerShell:

```powershell
.\start.ps1
```

Or run manually.

**Terminal 1 — Backend:**

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open the local application at [http://localhost:3000](http://localhost:3000).

Interactive OpenAPI documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## Live Application

**[https://0nl0b7jl-3000.inc1.devtunnels.ms/](https://0nl0b7jl-3000.inc1.devtunnels.ms/)**

This development-tunnel URL may become unavailable when the tunnel or host machine is offline.

---

**TrustVault — Secure Document Sharing with a Verifiable Audit Trail.**
