# NCSC CAF 4.0 Baseline — organisational assurance lens over the OWASP requirements

- **Date:** 2026-11-15
- **Status:** Proposal — to record in the decision log (`../01. Way_of_working/Way_of_Working.md` §8) once the group agrees
- **Source document:** `NCSC-Cyber-Assessment-Framework-4.0.pdf` (this folder) — NCSC, Crown copyright 2025, Open Government Licence v3.0
- **Owner:** Ambroise (cyber referent) · Drafted with Claude Code (see root `AI_USE.md`)

## Context

`owasp-security-baseline.md` gives us an **application-level** oracle: OWASP ASVS requirements,
verified with WSTG, scored with CVSS. That answers "is the code secure?".

WhatsUp's vision (Blueprint §1) targets organisations that exchange confidential information
every day — financial firms, legal practices, cybersecurity consultancies. Many of them in the
UK are assessed against the **NCSC Cyber Assessment Framework (CAF)**. To such a customer,
WhatsUp is (a) a **supplier** of software and (b) a **system** that holds their data. They would
ask organisational questions that ASVS does not cover: *Who decides? How do you develop
software securely? How do you manage privileged users? Do you log and protect your logs?*

CAF 4.0 is built as **4 objectives → 14 principles → 41 contributing outcomes**. Each outcome
is judged **Not achieved / Partially achieved / Achieved** against Indicators of Good Practice
(IGPs). It describes outcomes to reach, not a checklist [1].

## Decision

1. CAF 4.0 is added as the **second framework**, at the organisational level. ASVS stays the
   test oracle (one test = one SR). CAF is the **assurance view** that groups those SRs and our
   way of working into outcomes a customer or regulator would recognise.
2. We apply CAF **proportionately**. We select the contributing outcomes that a three-tier web
   app built by a student team can really show. The others are marked *not assessed*, with a
   reason. We never claim "Achieved" without evidence.
3. Every selected outcome links to SRs (`../04. Stories/security-requirements.md`), stories and
   evidence. The self-assessment level is updated when evidence lands (story A6).
4. CAF also feeds the Threat Model (Artefact 2): A2.b *Understanding threat* is the STRIDE work
   of story A1, and the risk register uses CAF wording for business impact.

## Selected contributing outcomes (self-assessment, 2026-11-15)

Levels: **NA** not achieved · **PA** partially achieved · **A** achieved · **—** not assessed.
"Today" = the code at the root (team commit `0e5302d` + front story B7). "Target" = what the
group aims to show by submission (05 Jan 2027).

| CAF outcome | What it asks (our words) | How WhatsUp answers | SRs | Today | Target |
|---|---|---|---|---|---|
| **A2.b** Understanding threat | Know who could attack, how, and what they would go after; use that to decide controls | Five security scenarios (Blueprint §2) → STRIDE threat model (story A1) → risk register (A6) | all (oracle) | PA | A |
| **A3.a** Asset management | Know your assets and what depends on them | Containers, data entities and data flows listed in the Blueprint §4; attack surface in §5 | SR-CONF-03 | PA | PA |
| **A4.a** Supply chain | Understand the risks that suppliers and third-party components bring | Pinned base images and lockfiles; dependency check kept as evidence | SR-DEP-01/02, SR-CONF-04 | PA | PA |
| **A4.b** Secure software development and support | Develop software with an established secure framework: threat modelling, many test types, known components, secure update channels | Story pipeline with two gates (Way of Working §2), threat modelling (A1), automated tests (backend pytest + `test/` smoke & acceptance), pinned dependencies, code review before merge, AI use declared | SR-DEP-01/02, SR-FE-01…04 | PA | A |
| **B1.a / B1.b** Policies and processes | Write the security rules down, then apply them | `.agents/rules/repository-rules.md`, security-engineering skill, Way of Working, these baselines | — | PA | A |
| **B2.a** Identity, authentication, authorisation | Identify each user, authenticate them, give only the access they need | Individual accounts, hashed passwords, server-side sessions, deny-by-default API, per-channel membership, organisation isolation | SR-AUTH-01…05, SR-SESS-01…05, SR-AC-01…04 | NA (B1 not built) | PA |
| **B2.c** Privileged user management | Manage admin accounts closely; strong authentication for privileged access | `org_admin` role, admin screens, an admin cannot change their own role, role changes audited | SR-AC-04, SR-LOG-01 | NA | PA (MFA out of scope — documented gap) |
| **B3.a** Understanding data | Know which data matters, where it is stored and where it travels | Data model (Blueprint §4) and the `confidential` attachment flag (classification) | SR-FILE-01…04 | PA | PA |
| **B3.b** Data in transit | Protect data that moves between systems | TLS on nginx with HSTS and a redirect from HTTP. **Today the stack is plain HTTP on :3000** — known gap | SR-COMM-01…03 | NA | A |
| **B3.c** Stored data | Protect stored data | Database only on the internal `data` network, adaptive password hashes, attachments outside the web root and served through an authorised route | SR-AUTH-02, SR-FILE-02 | PA | A |
| **B4.a** Secure by design | Build security in, keep the attack surface small, no single point of failure | Segmented Compose networks (`data` is `internal: true`), only nginx is published, browser never trusted, CSP `default-src 'self'` | SR-AC-01/04, SR-CONF-01, SR-FE-02 | PA | A |
| **B4.b** Secure configuration | Configure systems securely and keep them that way | Security headers, `server_tokens off`, non-root containers, `.env` outside Git. **`/api/docs` exposed today** (SR-AC-05) | SR-CONF-01…04, SR-ERR-02, SR-AC-05 | PA | A |
| **B4.d** Vulnerability management | Track known vulnerabilities and fix exposed ones quickly | `npm audit` / `pip-audit` output kept; GitHub Dependabot alert (pytest) followed | SR-DEP-02 | PA | PA |
| **C1.a** Logging and monitoring sources | Collect the logs that reveal security events | `AuditEvent` entity, admin "Security audit events" screen (front ready), `docker compose logs` | SR-LOG-01/03 | NA (no audit API yet) | PA |
| **C1.b** Securing logs | Only authorised people read logs; logs cannot be easily edited | Audit view reserved to `org_admin`; no passwords, tokens or message bodies in logs | SR-LOG-02 | NA | PA |
| **B5.c** Backups | Keep tested backups | MySQL named volume only, no backup | — | NA | — (out of coursework scope, accepted) |
| **D1 / D2** Response and lessons learned | Plan incident response; learn from incidents | Findings workflow (Ethical-Hacking-scenario §5) and the Reflection (Artefact 4) touch D2.a; no incident plan | — | — | — (not assessed) |

Not selected: A1 (board governance), B2.b (device management), B3.d (mobile data), B3.e (media
sanitisation), B5.a/b (resilience), B6 (staff training), C1.c–f and C2 (alerting, SOC, threat
hunting). These are organisation-wide capabilities that a coursework app cannot honestly show.

## SR group → CAF mapping (used by `security-requirements.md`)

| SR group | CAF contributing outcomes |
|---|---|
| SR-AUTH, SR-SESS | B2.a |
| SR-AC | B2.a, B2.c, B4.a |
| SR-VAL | B4.a, A4.b |
| SR-FILE | B3.a, B3.c |
| SR-COMM | B3.b |
| SR-ERR | B4.b |
| SR-LOG | C1.a, C1.b |
| SR-CONF | B4.a, B4.b, A3.a |
| SR-DEP | A4.a, A4.b, B4.d |
| SR-FE (front-end) | A4.b, B4.a |

## Consequences

- The Threat Model and the Assessment Report can say, for each finding, which **CAF outcome**
  is put at risk. That is business language for the "impact analysis with business context"
  the brief asks for.
- CAF **A4.b** names our method directly: threat modelling, many test types, known
  components. The `test/` suites, the two gates and the pinned dependencies are evidence for it.
- Honest gaps are visible from day one: TLS (B3.b), exposed docs (B4.b), MFA for admins (B2.c),
  backups (B5.c). Each one is a finding or an accepted risk, never a hidden weakness.
- Cost: story A6 updates the "Today" column with evidence links before submission.

## References (IEEE)

[1] National Cyber Security Centre, *Cyber Assessment Framework 4.0*, NCSC, 2025. [Online].
Available: https://www.ncsc.gov.uk/collection/cyber-assessment-framework (local copy:
`NCSC-Cyber-Assessment-Framework-4.0.pdf`)

[2] OWASP Foundation, *OWASP Application Security Verification Standard v4.0.3*, 2023.
[Online]. Available: https://owasp.org/www-project-application-security-verification-standard/
