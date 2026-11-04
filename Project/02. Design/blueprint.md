# What's Up Teams — Blueprint (merged design document)

- **Status:** v1 — adopted 2026-11-04 · **Owner:** the group · **Drafted by:** Ambroise with Claude Code (see root `AI_USE.md`)
- **Merge note:** this document merges `overview.md` + `PRD.md` + `architecture.md` + `design-system.md` — those four files are retired by this merge and carry no further authority.

## 0. Decision encoded (2026-11-04)

| Decision | Detail |
|---|---|
| **Adopted: the balson dev model** | React + TypeScript/Vite frontend · FastAPI backend (REST now, WebSockets planned) · MySQL · Docker Compose · modular monolith (auth, organisations, messaging, files, audit modules) |
| **Retired: the Flask/SQLite/Jinja2 proposal** | Superseded because the team model was adopted; the stack is challenged through the OWASP security requirements, not through toolchain preferences |

## 1. Vision & users

**One-liner:** WhatsUp is a simple group-chat web application — a mini messaging app for small teams.

**Why this app:** its attack surface maps one-to-one onto everything the brief assesses.

| Brief test area | WhatsUp surface |
|---|---|
| Authentication & session testing | login, session cookies |
| Unauthenticated API access | `/api/...` JSON endpoints |
| Input validation / XSS probe | chat messages rendered in other users' browsers |
| HTTP security headers & TLS | nginx deployment |
| OWASP Top 10 | all the above + avatar/attachment upload |

**Vision (team overview):** a corporate communication platform for organisations where confidential information is exchanged daily — financial firms, legal practices, cybersecurity consultancies. A trusted space for internal communication, with a retro early-internet-chat-room identity: brand colour `#E36E04`, Pikachu as security mascot. The aim is to explore how organisations protect their communications against unauthorised access, insider threats and data breaches.

**Three roles:**

| Role | Capabilities |
|---|---|
| **Employee** | Sign in; exchange direct/group messages; upload and download permitted attachments; mark attachments confidential or non-confidential; report suspicious content |
| **Group manager** | Manage group membership within their assigned permissions |
| **Organisation IT admin** | Manage users and roles; configure organisation membership; review security audit events |

**Core protection (server-side, always):** TLS/HTTPS · modern password hashing · server-enforced RBAC and tenant isolation · input/file validation · rate limiting · protected file storage · audit logging.

## 2. The five security scenarios

1. **Unauthorised message access:** a user attempts to read messages from private chats or groups they do not belong to.
2. **Cross-organisation data leakage:** a user from one company manipulates API requests to access another company's conversations, users or files.
3. **Malicious attachment upload:** an attacker attempts to upload unsafe, disguised or unauthorised files and exploit file download/access controls.
4. **Account compromise and session abuse:** an attacker attempts credential stuffing, brute force or misuse of stolen sessions.
5. **Privilege escalation:** an employee tries to gain administrator permissions or access restricted user-management and audit functions.

## 3. Scope — MVP in / out

**In scope (the 20% that matters):**

- Register / login / logout
- Direct and group messaging; channels/groups: list, create, join; membership within permissions
- Post and read messages per channel — REST first, **WebSockets planned (IN scope per the team model — the PRD's polling-only rule is lifted; the security requirements must extend to WebSockets, flagged for story A1)**
- Attachments: upload/download permitted files, confidential marking, suspicious-content reporting; avatar upload on the profile
- User profile: display name + avatar
- A JSON API alongside the UI (clean targets for API testing)
- Admin screens: users/roles, organisation membership, audit review
- Docker Compose deployment behind nginx with self-signed TLS

**Out of scope (the graveyard — explicitly dropped):**

- Notifications, search, emojis, mobile app
- Password reset by email, account deletion
- Scale beyond the single Compose stack

**Build honest, not buggy.** We build it straightforwardly. We do **not** plant vulnerabilities and we do **not** pre-fix what we later find — remediation is a graded deliverable of the assessment report, so findings are gold, not embarrassment.

**Success criteria:**

1. Two users (seeded `alice` and `bob`) chat in a shared channel (`#general`) on the Docker deployment
2. Every assessed test area has something real to test
3. Anyone on the team runs it locally with two commands

## 4. Architecture

### Components

```
[ Browser ]
    │   plain HTTP :3000 today — TLS planned: nginx :8443 (self-signed) [known gap]
[ Frontend container — nginx ]
    │   serves the React+TypeScript/Vite build, proxies API calls
[ FastAPI backend — modular monolith ]
    │   auth · organisations · messaging · files · audit
    ├────────────────────────┐
[ MySQL ]            [ protected attachment storage ]
    └────── docker volumes (db + uploads) ──────┘
```

Discipline carried from the scaffold: `.env` required (no secrets in the repo), healthchecks on containers, everything orchestrated by `docker compose`.

### Data model (entity list — reconciles the two source models)

| Entity | Fields | Origin |
|---|---|---|
| `User` | id, username UNIQUE, password_hash, display_name, avatar_path, organisation_id → Organisation, role, created_at | original model + team tenancy/roles |
| `Organisation` | id, name | team model (tenant boundary) |
| `Group` / `Channel` | id, name, organisation_id → Organisation, created_by → User | original `Channel` + tenant isolation |
| `Message` | id, channel_id → Channel, user_id → User, body TEXT, created_at | original model |
| `Attachment` | id, message_id → Message, uploader_id → User, storage_path, confidential flag, created_at | team model (scenario 3) |
| `AuditEvent` | id, actor_id → User, event_type, timestamp, source_ip, details | team model (scenario 5, SR-LOG) |

### Endpoints

**Planned routes (carry over from the original design, restated on FastAPI):**

- **Auth/UI:** `GET/POST /register`, `GET/POST /login`, `/logout`
- **Channels:** `GET/POST /api/channels`, `GET /api/channels/<id>`, join
- **Messages:** `GET/POST /api/channels/<id>/messages`
- **Users/profile:** `GET /api/users/<id>`, `GET/POST /profile` (display name, avatar upload)
- **Sessions:** server-side session cookie

**Scaffold reality today (balson branch):**

- `/api/health` — healthcheck
- `/api/greetings/hello` — unauthenticated, reads the seeded MySQL greeting
- `/api/docs` + `/api/openapi.json` — FastAPI docs **present today → flagged for SR-AC-05** (must be disabled or gated in the deployment under test)

### Deployment (feeds Artefact 1)

`docker compose up` → frontend on `127.0.0.1:3000` (plain HTTP today), backend + MySQL internal; volumes for the database and uploads; a seed script creates the two demo users (`alice`, `bob`) and `#general`. TLS termination planned via nginx on `:8443` (self-signed) — the plain-HTTP edge of today is tracked as a known gap (SR-COMM, story A5).

## 5. Attack surface preview (input to STRIDE story A1)

| Surface | Trust boundary | Obvious STRIDE candidates |
|---|---|---|
| Login/session cookie | browser ↔ nginx | Spoofing, session hijack |
| `/api/*` endpoints | unauthenticated client ↔ app | Information disclosure, elevation |
| Message body | user input → other users' browsers | Tampering, XSS |
| Avatar/attachment upload | user file → server filesystem | Malicious upload, path traversal |
| nginx/TLS config | client ↔ server | Weak ciphers, missing headers |
| **NEW** WebSocket authorisation | client ↔ messaging module, per room | Elevation, spoofing (joining rooms without membership) |
| **NEW** Cross-organisation boundary | tenant ↔ tenant data | Information disclosure (scenario 2) |
| **NEW** Audit-log integrity | app ↔ audit storage | Repudiation, tampering |

**Testing approach:** OWASP WSTG v4.2 + relevant NIST guidance; recon → enumeration → targeted testing → remediation → retest, on authorised environments only; keep evidence of findings and fixes.

## 6. Design system (deliberately one page)

**Principle: readable beats beautiful.** Every screen ends up in a screenshot as assessment evidence — clean and legible wins marks; decoration wins nothing.

**Tokens:**

- **Colours:** `--bg #f7f7f8` · `--surface #ffffff` · `--primary #1f6feb` · **brand accent `#E36E04` (team override)** · `--text #1f2328` · `--muted #656d76` · `--danger #cf222e`
- **Type:** system font stack, 16px base, line-height 1.5
- **Spacing:** 4 / 8 / 16 / 32 · radius 8px · border 1px `#d0d7de`

**Components (the only four):**

1. **Button** — primary (filled) / ghost / danger
2. **Input** — label + field + inline error
3. **Card** — white surface, 16px padding, used for panels
4. **MessageBubble** — own messages: primary background, right-aligned; others: white, left-aligned

**Screens:** Login · Register · Channel list (cards) · Chat view (bubbles + composer) · Profile (card + avatar) · **Admin screens (team model: users/roles, organisation membership, audit review)**. Responsive, mobile-friendly, retro chat-room feel.

No dark mode, no animations, no icon library. **If it is not on this page, it does not exist** — additions need a one-line entry here first (that rule is what keeps this one page long).

## 7. Sprint 1 checklist

- [ ] Confirm project objective, target organisations and user roles.
- [ ] Agree MVP functionality, out-of-scope features and success criteria.
- [ ] Create and approve the one-page scope document.
- [ ] Draw system data flows and trust boundaries.
- [ ] Document and rank all five security scenarios using STRIDE.
- [ ] Define at least one mitigation and test for each scenario.
- [ ] Sketch login, chat and admin wireframes.
- [ ] Define core database entities and API boundaries.
- [ ] Assign pair-programming responsibilities and set up the repository/backlog.
- [ ] Review and approve the two-page threat model and test checklist.

## 8. Traceability

- **Oracle:** `../04. Stories/security-requirements.md` is the oracle for every test in `../04. Stories/Ethical-Hacking-scenario.md` — each attack expects an SR to hold; a breach is a CVSS-scored finding, a pass confirms a control. This blueprint is the Q1 input (*what we build*) that those SRs govern.
- **Artefacts:** this blueprint feeds Artefact 1 (Scoping Document — vision, scope, architecture, deployment evidence), Artefact 2 (Threat Model — attack surface preview → STRIDE story A1, sprint-1 deliverables), Artefact 3 (Security Assessment Report — the surfaces tested against the SRs) and Artefact 4 (Reflection — decisions recorded in section 0).
