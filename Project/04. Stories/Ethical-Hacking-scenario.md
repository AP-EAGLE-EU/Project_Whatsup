# WhatsUp — Ethical Hacking Scenario (assessment engagement plan, A2–A6)

- **Status:** Proposal — GATE 1 candidate (`validated: yes` required before **any** execution)
- **Date:** 2026-11-04 · **Owner:** Ambroise (cyber referent) + rotating pairs · Drafted with Claude Code (see `AI_USE.md`)
- **Feeds:** Artefact 2 (testing-plan section) · Artefact 3 (assessment report)
- **Starts:** once B4 has the app deployed (story list in `../01. Way_of_working/Way_of_Working.md`)

## 1. Authorization and rules of engagement — read first

- **Target:** exclusively the team's WhatsUp instance, built from the **group repo**, running
  locally in Docker on a team member's machine. Nothing else.
- **Prohibited:** university infrastructure, third-party services or accounts, real personal
  data, social engineering, denial-of-service/stress testing, brute force beyond the bounded
  lockout probe of EH-03 (≤20 attempts).
- **Humans execute:** per `AI_USE.md` and the group's security-engineering skill, the team
  runs every command; AI assists planning and reporting only. Evidence is captured by the
  executor on their own screen, **the same day, timestamped, in the story's `evidence/`
  folder — never reconstructed later**.
- **Oracle:** every attack expects an SR from `security-requirements.md` (this folder)
  to hold. Repelled attack → control confirmed (evidence still kept). Successful attack →
  finding: SR violated, CVSS-scored, remediated, retested.

## 2. Method

Tutor's four questions, closed loop: **Q1** what we build (blueprint) → **Q2** what
can go wrong (STRIDE, story A1) → **Q3** what we do about it (security requirements) →
**Q4** did we do a good job (**this scenario**, the A stories). Attacks are grouped per
WSTG v4.2 category [2], labelled per OWASP Top 10:2021 [3], findings scored with CVSS 3.1
[4]. Severity bands: 0.1–3.9 Low · 4.0–6.9 Medium · 7.0–8.9 High · 9.0–10 Critical.

## 3. Environment and baseline recon (feeds Artefact 1)

- **Run:** `docker compose up` from the group repo; seed script creates `alice`, `bob` and
  `#general` (demo credentials documented in Artefact 1, never real ones).
- **Planned target URL:** `https://localhost:8443` (nginx, self-signed — architecture).
  *Today's scaffold reality:* `http://127.0.0.1:3000`, plain HTTP, no auth yet — the first
  recon comparison point, not a target change (team stack adopted 2026-11-04; decision log
  in `../01. Way_of_working/Way_of_Working.md`).
- **Attacker workstation:** browser + devtools, `curl`, Burp Suite Community as proxy,
  `openssl s_client`/`sslscan` for TLS, `nmap -sV localhost` for surface mapping.
- **EH-01 baseline capture (do once, keep forever):** port/scan summary, full response
  headers per route, `robots.txt`, technology fingerprint, reachability of `/api/docs` and
  `/api/openapi.json`, TLS certificate details. This is the "before" state every finding
  is compared against.

## 4. Attack scenarios

| EH | Attacker objective | Target | WSTG | Top 10 | Oracle | Story |
|----|--------------------|--------|------|--------|--------|-------|
| EH-01 | Map the exposed surface before attacking | ports, headers, docs routes | INFO/CONF | A05 | SR-CONF-02 | A2 |
| EH-02 | Register with malicious/oversized profile fields | `POST /register` | INPV | A03 | SR-VAL-01 | A4 |
| EH-03 | Guess alice's password (bounded, ≤20 tries) | `POST /login` | ATHN | A07 | SR-AUTH-03/04 | A2 |
| EH-04 | Discover which usernames exist | login/register responses, timing | ATHN | A07 | SR-AUTH-03 | A2 |
| EH-05 | Steal or reuse a session cookie | cookie jar, second browser | SESS | A07 | SR-SESS-01/03 | A2 |
| EH-06 | Audit cookie flags and expiry; force CSRF on POSTs | raw `Set-Cookie`, crafted form | SESS | A07 | SR-SESS-02/04/05 | A2/A5 |
| EH-07 | Read `#general` messages without any session | `GET /api/channels/<id>/messages` | ATHZ | A01 | SR-AC-01 | A3 |
| EH-08 | As alice, read a channel she never joined; fetch bob's profile by iterating `/api/users/<id>` | object IDs | ATHZ | A01 | SR-AC-02/03 | A3 |
| EH-09 | Plant stored XSS in a message body rendered in bob's browser | message body → other clients | INPV | A03 | SR-VAL-01/02 | A4 |
| EH-10 | SQL injection in login and channel routes | string parameters | INPV | A03 | SR-VAL-03 | A4 |
| EH-11 | Upload an HTML/SVG avatar (stored XSS) or 5 MB file; attempt `../../` names | avatar upload | INPV/BUSL | A04 | SR-FILE-01/03/04 | A4 |
| EH-12 | Fetch another user's avatar directly, unauthenticated | avatar storage/route | ATHZ | A01 | SR-FILE-02 | A3 |
| EH-13 | Audit security headers, CSP, TLS protocol/ciphers, HSTS, HTTP→HTTPS redirect | nginx edge | CONF/CRYP | A02/A05 | SR-COMM-01…03, SR-CONF-01 | A5 |
| EH-14 | Trigger stack traces / debug output; reach framework docs in deployment | error paths, `/api/docs` | ERRH/CONF | A05 | SR-ERR-01/02, SR-AC-05 | A3/A5 |
| EH-15 | Version and dependency sweep: banners, `pip-audit`, `npm audit` | stack | CONF | A06 | SR-DEP-01/02 | A6 |
| EH-16 | Confirm security events land in logs — and nothing sensitive does | `docker compose logs` | CONF | A09 | SR-LOG-01…03 | A6 |

Each story pair executes its rows end-to-end in one session and files evidence the same day.

## 5. Findings workflow (feeds the risk register, story A6)

One record per finding, kept in the story's `evidence/` folder:

```
F-nn · title
EH / SR violated · WSTG · Top 10
CVSS 3.1 vector + score (https://www.first.org/cvss/calculator/3-1)
Evidence: file(s) + date · Reproduction: exact commands
Remediation: owner + story · Retest: pending / fixed / accepted risk
```

Only a **critical** finding blocks a story's GATE 2; everything else is filed, scored and
consolidated by A6 into the risk register and the remediation section of Artefact 3.

## 6. Out of scope

DoS/stress · brute force beyond EH-03's bound · any host other than the local Docker
stack · third-party accounts or data · social engineering · automated destructive
exploitation (PoC only, e.g. a proof-of-concept payload, never a wipe).

## References (IEEE)

[1] OWASP Foundation, *OWASP Application Security Verification Standard v4.0.3*, 2023.
[2] OWASP Foundation, *OWASP Web Security Testing Guide v4.2*, 2023. (PDF: `../03. Frameworks/`)
[3] OWASP Foundation, *OWASP Top 10:2021*, 2021. [Online]. Available: https://owasp.org/Top10/
[4] FIRST, *Common Vulnerability Scoring System v3.1*, 2019. [Online]. Available:
https://www.first.org/cvss/calculator/3-1
