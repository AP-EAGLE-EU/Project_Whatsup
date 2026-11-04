# WhatsUp — Security Requirements (OWASP ASVS baseline)

- **Status:** Proposal — oracle for the A stories; adopted with the OWASP baseline (`../03. Frameworks/owasp-security-baseline.md`)
- **Date:** 2026-11-04 · **Owner:** Ambroise (cyber referent) · Drafted with Claude Code (see `AI_USE.md`)
- **Applies to:** the adopted team stack (React + FastAPI + MySQL, modular monolith —
  decision logged in `../01. Way_of_working/Way_of_Working.md`). Extension point: story
  A1 adds SRs for WebSockets, organisation isolation and audit integrity.

## Where this sits in the method

Answer to question 3 of the tutor's four-question framing (*"What are we going to do
about it?"*): **Q1** = PRD + architecture, **Q2** = STRIDE (story A1), **Q3** = this
document, **Q4** = the assessment scenario + findings. Every requirement is the **oracle**
for a test in `Ethical-Hacking-scenario.md` (this folder): a test that fails an SR is a graded
finding; a test that passes confirms a control. Per the Blueprint principle *build honest,
not buggy*: these SRs state the **target** — gaps found later are marks, not embarrassment.

**Baseline standards:** OWASP ASVS v4.0.3 chapters (requirement source) · OWASP Top 10
2021 (risk framing) · OWASP WSTG v4.2 (verification — PDF in `../03. Frameworks/`) ·
CVSS 3.1 (severity of failures). ASVS references are given at chapter level; each story
pair pins the exact clauses during its Research step.

## SR-AUTH — Authentication (ASVS V2 · A07:2021 · STRIDE Spoofing)

| ID | Requirement | Verified by |
|----|-------------|-------------|
| SR-AUTH-01 | Passwords: minimum 8 characters, maximum ≥64 accepted, paste allowed, no forced rotation | A2 · WSTG-ATHN |
| SR-AUTH-02 | Passwords stored only as salted adaptive hashes (bcrypt/scrypt/Argon2); never plaintext or reversible | A2 · WSTG-ATHN |
| SR-AUTH-03 | Login failure returns one generic message for wrong user *and* wrong password (no enumeration by message or response time) | A2 · WSTG-ATHN |
| SR-AUTH-04 | Login is rate-limited: ~5 failures per account suspends further attempts briefly (lockout or exponential delay) | A2 · WSTG-ATHN |
| SR-AUTH-05 | Logout invalidates the session **server-side**, not merely by deleting the cookie | A2 · WSTG-SESS |

## SR-SESS — Session management (ASVS V3 · A07:2021 · STRIDE Spoofing/Hijacking)

| ID | Requirement | Verified by |
|----|-------------|-------------|
| SR-SESS-01 | Session token has ≥64 bits of server-generated randomness (not guessable/sequential) | A2 · WSTG-SESS |
| SR-SESS-02 | Cookie flags: `HttpOnly`, `Secure` (on the TLS deployment), `SameSite=Lax` or `Strict` | A5 · WSTG-SESS |
| SR-SESS-03 | Token is regenerated at login (no fixation) and destroyed at logout | A2 · WSTG-SESS |
| SR-SESS-04 | Sessions expire: idle timeout ≤1h, absolute lifetime ≤24h | A2 · WSTG-SESS |
| SR-SESS-05 | State-changing requests (POST) are CSRF-protected: token, or documented `SameSite` reliance | A2 · WSTG-SESS |

## SR-AC — Access control (ASVS V4 · A01:2021 · STRIDE Elevation/Information disclosure)

| ID | Requirement | Verified by |
|----|-------------|-------------|
| SR-AC-01 | `/api/*` is deny-by-default: every endpoint requires a valid session except an explicitly listed public set (health check only) | A3 · WSTG-ATHZ |
| SR-AC-02 | Object-level checks: reading/posting messages requires membership of that channel; profiles expose only public fields | A3 · WSTG-ATHZ |
| SR-AC-03 | Knowing/guessing an ID grants nothing (IDOR): `/api/users/2`, `/api/channels/3/messages` re-check authorisation | A3 · WSTG-ATHZ |
| SR-AC-04 | All authorisation decisions happen server-side; the client is never trusted | A3 · WSTG-ATHZ |
| SR-AC-05 | No admin, debug or documentation endpoints are exposed in the deployment under test (e.g. FastAPI `/api/docs`, `/api/openapi.json` disabled or gated) | A3/A5 · WSTG-CONF |

## SR-VAL — Input validation & output encoding (ASVS V5 · A03:2021 · STRIDE Tampering)

| ID | Requirement | Verified by |
|----|-------------|-------------|
| SR-VAL-01 | Every input is validated server-side (type, length, format): message body ≤1000 chars, channel name pattern-defined | A4 · WSTG-INPV |
| SR-VAL-02 | Output is contextually encoded; template auto-escaping stays on (no `safe`/`dangerouslySetInnerHTML` shortcuts) | A4 · WSTG-INPV |
| SR-VAL-03 | Database access only via parameterised queries / ORM — never string-built SQL | A4 · WSTG-INPV |
| SR-VAL-04 | Incoming payloads are bound to allowlisted fields (no mass assignment of e.g. `is_admin`) | A4 · WSTG-INPV |

## SR-FILE — Avatar upload (ASVS V12 · A04:2021 · STRIDE Tampering/Spoofing)

| ID | Requirement | Verified by |
|----|-------------|-------------|
| SR-FILE-01 | Uploads restricted by allowlist: extension **and** parsed content type (JPEG/PNG), size cap 1 MB | A4 · WSTG-BUSL |
| SR-FILE-02 | Stored under a server-generated random name outside any web-served static path; served via an authorised route with correct `Content-Type` | A3/A4 · WSTG-ATHZ |
| SR-FILE-03 | HTML/SVG/uploads with active content are rejected (stored-XSS vector) | A4 · WSTG-INPV |
| SR-FILE-04 | The user-supplied filename never appears in a filesystem path (no traversal `../../`) | A4 · WSTG-INPV |

## SR-COMM — Communications (ASVS V9 · A02:2021 · STRIDE Information disclosure)

| ID | Requirement | Verified by |
|----|-------------|-------------|
| SR-COMM-01 | All client traffic over TLS via nginx (self-signed accepted for the coursework, fingerprint documented) | A5 · WSTG-CRYP |
| SR-COMM-02 | TLS ≥1.2 with an intermediate cipher profile; weak protocols disabled | A5 · WSTG-CRYP |
| SR-COMM-03 | HTTP redirects to HTTPS; HSTS present on HTTPS responses; no mixed content | A5 · WSTG-CRYP |

## SR-ERR — Error handling (ASVS V7 · A05:2021 · STRIDE Information disclosure)

| ID | Requirement | Verified by |
|----|-------------|-------------|
| SR-ERR-01 | Users receive generic errors; no stack traces, SQL errors or internal paths in responses | A3/A4 · WSTG-ERRH |
| SR-ERR-02 | Debug mode off in the deployment under test; framework debug/docs routes disabled | A5 · WSTG-CONF |

## SR-LOG — Logging (ASVS V7 · A09:2021 · STRIDE Repudiation)

| ID | Requirement | Verified by |
|----|-------------|-------------|
| SR-LOG-01 | Security events logged with timestamp, username, source IP: registration, login success/failure, logout | A6 · WSTG-CONF |
| SR-LOG-02 | Logs never contain passwords, session tokens or message bodies | A6 · WSTG-CONF |
| SR-LOG-03 | Logs are retrievable for the assessment window (`docker compose logs` / volume) | A6 · WSTG-CONF |

## SR-CONF — Configuration, headers, deployment (ASVS V14 · A05:2021 · STRIDE Information disclosure)

| ID | Requirement | Verified by |
|----|-------------|-------------|
| SR-CONF-01 | Baseline headers on every response: CSP (`default-src 'self'`), `X-Content-Type-Options: nosniff`, frame protection, `Referrer-Policy` | A5 · WSTG-CONF |
| SR-CONF-02 | Server/software version tokens suppressed (nginx, framework banners) | A5 · WSTG-CONF |
| SR-CONF-03 | No secrets in the repository: `.env` gitignored, credentials only in `.env`/environment (scaffold already enforces this in `compose.yaml`) | A6 · WSTG-CONF |
| SR-CONF-04 | Containers: non-root user where feasible, base images pinned by tag/digest | A6 · WSTG-CONF |

## SR-DEP — Dependencies (ASVS V14 · A06:2021 · STRIDE Tampering)

| ID | Requirement | Verified by |
|----|-------------|-------------|
| SR-DEP-01 | Dependencies pinned (`requirements.txt`, `package-lock.json` — already true in the scaffold) | A6 · WSTG-CONF |
| SR-DEP-02 | An automated vulnerability check (`pip-audit`, `npm audit`) is run and its output kept as evidence | A6 · WSTG-CONF |

## Traceability summary

| SR group | STRIDE | Top 10 2021 | Attack scenarios | Stories | Artefact |
|----------|--------|-------------|------------------|---------|----------|
| AUTH, SESS | S, (T) | A07 | EH-03…EH-06 | A2 | 2 & 3 |
| AC | E, I | A01 | EH-07, EH-08, EH-14 | A3 | 2 & 3 |
| VAL, FILE | T | A03, A04 | EH-09…EH-12 | A4 | 3 |
| COMM, CONF, ERR | I | A02, A05 | EH-02, EH-13, EH-15 | A5 | 3 |
| LOG, DEP | R, T | A09, A06 | EH-15, EH-16 | A6 | 2 & 3 |

## References (IEEE)

[1] OWASP Foundation, *OWASP Application Security Verification Standard v4.0.3*, 2023.
[Online]. Available: https://owasp.org/www-project-application-security-verification-standard/
[2] OWASP Foundation, *OWASP Web Security Testing Guide v4.2*, 2023. [Online]. Available:
https://owasp.org/www-project-web-security-testing-guide/ (PDF copy: `../03. Frameworks/`)
[3] OWASP Foundation, *OWASP Top 10:2021*, 2021. [Online]. Available: https://owasp.org/Top10/
[4] FIRST, *Common Vulnerability Scoring System v3.1*, 2019. [Online]. Available:
https://www.first.org/cvss/v3.1/specification-document
