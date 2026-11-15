# What's Up Teams — Blueprint (merged design document)

- **Status:** v1.1 — 2026-11-15 (v1 adopted 2026-11-04) · **Owner:** the group · **Drafted by:** Ambroise with Claude Code (see root `AI_USE.md`)
- **Merge note:** this document merges `overview.md` + `PRD.md` + `architecture.md` + `design-system.md` — those four files are retired by this merge and carry no further authority.
- **v1.1 changes:** §4 now records the back-office **as built** (group repo commit `0e5302d`, PR #27 merged 2026-11-10) and the **API contract v0.1** between front and back; new §7 *Front-end design* (story B7); CAF 4.0 added to the traceability (§9). Sprint checklist and traceability renumbered §8 and §9.
- **v1.2 changes (2026-11-15):** aligned with the group's GitHub backlog (`jackoturner/WhatsUpTeam_Coursework` issues #2–#25). The contract becomes **v0.2**, a proposal for **SH-01 (#4)**: "conversations" (direct + group, participants) replace "channels"; group membership (BE-08), a colleague directory, a reports list (BE-09) and **WebSocket conventions** (BE-06) are added. §7 maps every front feature to FE-02…FE-08; §9 maps the B stories to the backlog IDs.

## 0. Decision encoded (2026-11-04)

| Decision | Detail |
|---|---|
| **Adopted: the balson dev model** | React + TypeScript/Vite frontend · FastAPI backend (REST now, WebSockets planned) · MySQL · Docker Compose · modular monolith (auth, organisations, messaging, files, audit modules) |
| **Retired: the Flask/SQLite/Jinja2 proposal** | Superseded because the team model was adopted; the stack is challenged through the OWASP security requirements, not through toolchain preferences |
| **2026-11-15 — Front built contract-first** | The front (story B7) is written against the API contract v0.1 (§4). It integrates for real with what the back-office serves today (`/api/health`, `/api/greetings/hello`). A **mock build** (`VITE_API_MODE=mock`) runs every screen in the browser until stories B1–B3 deliver the endpoints. The group's back-office code is not modified |
| **2026-11-15 — CAF 4.0 added** | NCSC CAF 4.0 is the organisational assurance lens over the OWASP SRs (`../03. Frameworks/caf-4.0-baseline.md`) |

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

**Vision (team overview):** a corporate communication platform for organisations where confidential information is exchanged daily — financial firms, legal practices, cybersecurity consultancies. A trusted space for internal communication, with a retro early-internet-chat-room identity: brand colour Roehampton green `#00A06E` (was `#E36E04` until 2026-11-15), Pikachu as security mascot. The aim is to explore how organisations protect their communications against unauthorised access, insider threats and data breaches.

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
- Direct and group conversations: list, open a direct conversation, create a group (managers/admins); membership managed by group managers
- Post and read messages per conversation — REST + **WebSockets (IN scope per the team model; conventions in the contract v0.2 below, requirements SR-WS-01…04 added 2026-11-15; story A1 still threat-models them)**
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

1. Two users (seeded `alice` and `bob`) chat live in a shared group conversation (`#general`) on the Docker deployment
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
| `Greeting` | id, message | **exists today** (scaffold, table `greetings`, seeded `hello`) |
| `User` | id, username UNIQUE, password_hash, display_name, avatar_path, organisation_id → Organisation, role (`employee` / `group_manager` / `org_admin`), failed_logins, locked_until, created_at | original model + team tenancy/roles + SR-AUTH-04 |
| `Session` | id (random ≥128 bits), user_id → User, csrf_token, created_at, last_seen_at, expires_at | SR-SESS-01/03/04 (server-side sessions) |
| `Organisation` | id, name | team model (tenant boundary) |
| `Conversation` | id, type (`group` / `direct`), name (groups only, unique per organisation), organisation_id → Organisation, created_by → User, created_at | backlog BE-05 (#9) "direct and group conversations" + tenant isolation (replaces `Channel`, 2026-11-15) |
| `ConversationMember` | conversation_id → Conversation, user_id → User (PK both), is_manager | participant check (SR-AC-02, BE-04 #8) + group managers (BE-08 #15) |
| `Message` | id, conversation_id → Conversation, user_id → User, body TEXT (≤1000), created_at | original model |
| `Attachment` | id, message_id → Message, uploader_id → User, storage_path (server-generated), original filename, content_type, size_bytes, confidential flag, created_at | team model (scenario 3) |
| `MessageReport` | id, message_id → Message, reporter_id → User, reason, created_at | "report suspicious content" (§1) |
| `AuditEvent` | id, organisation_id, actor_id → User, event_type, timestamp, source_ip, details | team model (scenario 5, SR-LOG) |

Only `Greeting` exists in MySQL today; the other entities are the target for stories B1–B3
(schema changes through focused migrations, per the backend skill).

### Back-office as built (group repo, commit `0e5302d`, PR #27 merged 2026-11-10)

Full retro-documentation: `../04. Stories/B0-back-office-scaffold-retro.md`.

| Layer | As built |
|---|---|
| **Runtime** | Python 3.13-slim · FastAPI 0.162.0 · Uvicorn 0.54.0 · SQLAlchemy 2.0.55 · PyMySQL 1.1.2 (`requirements.txt`, pinned) |
| **Layout** | MVC in `src/backend/app/`: `controllers/` (routers, thin) · `models/` (SQLAlchemy `DeclarativeBase`) · `views/` (Pydantic response schemas) · `database.py` (engine + request-scoped session) · `main.py` (app, routers, handlers) |
| **Database access** | `URL.create(...)` (safe with special characters in passwords), `pool_pre_ping`, `pool_recycle=1800`, 5 s connect/read/write timeouts, `utf8mb4`; one `Session` per request through the `get_db` dependency |
| **Error handling** | Any `SQLAlchemyError` → **503** `{"detail": "Database is temporarily unavailable."}`; the stack trace is logged server-side only (SR-ERR-01 already true for DB errors) |
| **Endpoints** | `GET /api/health` (runs `SELECT 1`) · `GET /api/greetings/hello` (reads row 1, 404 `Greeting not found.`) · `/api/docs` + `/api/openapi.json` (FastAPI docs — **SR-AC-05 gap**) |
| **Container** | Multi-stage Dockerfile: `test` (pytest) · `development` (`--reload`) · `runtime`; runs as non-root user `app` (SR-CONF-04) |
| **Database** | MySQL 8.4 image + `init/001_greetings.sql`; healthcheck reads the greeting; credentials only from `.env` (compose `:?` guards — SR-CONF-03) |
| **Networks** | `app` (frontend ↔ backend) and `data` (backend ↔ MySQL, `internal: true`); only the frontend publishes a port, on `127.0.0.1` |
| **Edge (nginx)** | `nginx-unprivileged` on 8080 → host `127.0.0.1:3000`; `server_tokens off`; `nosniff` + `Referrer-Policy`; CSP `default-src 'self'` … `frame-ancestors 'none'` on the app; `/api/` reverse-proxied to `backend:8000` with Docker DNS re-resolution; SPA fallback `try_files … /index.html` |
| **Dev mode** | `compose.override.yaml`: Vite dev server + Uvicorn `--reload`, sources mounted read-only, polling for Windows file events |
| **Tests** | `src/backend/tests/test_greeting.py`: 3 pytest cases on in-memory SQLite (reads the stored value, 404 when missing, 503 without leaking connection details) |

### API contract v0.2 (front ↔ back) — proposal for SH-01 (#4)

Written by story B7 so the front and the back can be built in parallel. It answers the SH-01
acceptance criteria: endpoints and payloads for auth, users, organisations, conversations,
messages and files · WebSocket conventions · minimum entities (data model above) ·
authentication method, cookies and error codes · kept in repository documentation (this
section). **Status: proposal — needs the agreement of a backend representative to close SH-01.**
The front calls exactly these routes; the mock build implements the same rules in the browser
(`src/frontend/src/services/mock/mockApi.ts`), which makes it an executable reference for the
BE issues.

**Rules that apply to every route:**

- JSON in and out, under `/api/`, same origin as the front (nginx proxy) — no CORS.
- **Session:** `POST /api/auth/login` sets `session` (`HttpOnly`, `SameSite=Strict`, `Secure` on TLS, `Path=/`) and a readable `csrf_token` cookie. The front echoes `csrf_token` in the `X-CSRF-Token` header on every POST/PATCH/DELETE; the back rejects a missing or wrong header with 403 (SR-SESS-05).
- **Deny by default:** every route answers **401** without a valid session, except `/api/health`, `/api/auth/login` and `/api/auth/register` (SR-AC-01).
- **Organisation isolation:** every query is scoped to the caller's organisation; an object from another organisation answers **404**, exactly like a missing one (SR-AC-03, BE-04 #8).
- **Participants only:** a conversation, its messages, members and attachments are visible to its participants only; a same-organisation non-participant gets **403** `You are not a participant of this conversation.` (SR-AC-02).
- **Errors:** `{"detail": "<message safe to show>"}`. Resource 404s carry their own detail (`Conversation not found.`); FastAPI's bare `Not Found` is kept for unknown routes, which the front shows as "not available yet". 400/422 validation, 409 duplicates, 413/415 uploads, 429 login throttling.
- **Lists** are wrapped: `{"conversations": [...]}`, `{"messages": [...]}`, `{"members": [...]}`, `{"users": [...]}`, `{"events": [...]}`, `{"reports": [...]}`. Links in responses (`avatar_url`, `download_url`) are same-origin relative paths. Messages are returned oldest first, ordered by `id`.

| Method & path | Purpose | Access | Body / answer | Backlog | SRs |
|---|---|---|---|---|---|
| `GET /api/health` | Liveness + DB check | public | → `{"status":"ok"}` | **exists** (BE-01 #2) | — |
| `GET /api/greetings/hello` | Scaffold demo | public today | → `{"message":"hello"}` | **exists** (to gate or remove) | SR-AC-01 |
| `POST /api/auth/register` | Create an account (role `employee`) | public | `{username, display_name, password}` → 201 User | BE-03 #6 | SR-AUTH-01/02, SR-VAL-04 |
| `POST /api/auth/login` | Open a session | public, throttled | `{username, password}` → 200 User + cookies · 401 `Invalid username or password.` · 429 | BE-03 #6 | SR-AUTH-03/04, SR-SESS-01…03 |
| `POST /api/auth/logout` | Destroy the session server-side | session | → 204 | BE-03 #6 | SR-AUTH-05 |
| `GET /api/auth/me` | Who am I? | session | → User · 401 | BE-03 #6 | SR-AC-01 |
| `GET /api/users` | Colleague directory (public fields only) | session, same org | → `{users: DirectoryUser[]}` | BE-04 #8 | SR-AC-02 |
| `GET /api/conversations` | My conversations | session | → `{conversations: Conversation[]}` | BE-05 #9 | SR-AC-02 |
| `POST /api/conversations` | Open a direct conversation (returns the existing one if any) or create a group | session; groups: `group_manager`/`org_admin` | `{type:"direct", participant_id}` · `{type:"group", name}` (`^[a-z0-9-]{2,32}$`) → 201/200 Conversation · 403 · 409 | BE-05 #9 | SR-VAL-01, SR-AC-04 |
| `GET /api/conversations/{id}` | One conversation | participant | → Conversation · 403 · 404 | BE-05 #9 | SR-AC-02/03 |
| `GET /api/conversations/{id}/messages?after_id=` | History or catch-up (max 100) | participant | → `{messages: Message[]}` | BE-05 #9 | SR-AC-02/03 |
| `POST /api/conversations/{id}/messages` | Send | participant | `{body}` (1–1000) → 201 Message | BE-05 #9 | SR-VAL-01/02 |
| `GET /api/conversations/{id}/members` | Members | participant | → `{members: Member[]}` | BE-08 #15 | SR-AC-02 |
| `POST /api/conversations/{id}/members` | Add a member | manager of that group | `{user_id}` (same org) → `{members}` · 403 · 409 | BE-08 #15 | SR-AC-04, SR-LOG-01 |
| `DELETE /api/conversations/{id}/members/{user_id}` | Remove a member (never myself) | manager of that group | → 204 · 403 | BE-08 #15 | SR-AC-04, SR-LOG-01 |
| `POST /api/messages/{id}/attachments` | Attach a file to my message | author | multipart `file`, `confidential` → Message · 413/415 | BE-07 #13 | SR-FILE-01…04 |
| `GET /api/attachments/{id}` | Download | participant | file, `Content-Disposition: attachment` | BE-07 #13 | SR-FILE-02 |
| `POST /api/messages/{id}/reports` | Report suspicious content | participant | `{reason}` (1–500) → 204 | BE-09 #17 | SR-LOG-01 |
| `PATCH /api/profile` | Change my display name | session | `{display_name}` (1–64) → User | (blueprint, no issue yet) | SR-VAL-04 |
| `POST /api/profile/avatar` | Upload my avatar | session | multipart `file` (PNG/JPEG, ≤1 MB, content-sniffed) → User | (blueprint, no issue yet) | SR-FILE-01…04 |
| `GET /api/users/{id}/avatar` | Avatar image | session, same org | image | (blueprint, no issue yet) | SR-FILE-02 |
| `GET /api/admin/users` | Users of my organisation | `org_admin` | → `{users: User[]}` · 403 | BE-08 #15 | SR-AC-04 |
| `PATCH /api/admin/users/{id}` | Change a role (never my own) | `org_admin` | `{role}` → User · 403/404 | BE-08 #15 | SR-AC-04, SR-VAL-04 |
| `GET /api/admin/audit-events?limit=` | Security audit events (newest first) | `org_admin` | → `{events: AuditEvent[]}` | BE-09 #17 | SR-LOG-01…03 |
| `GET /api/admin/reports?limit=` | Reported messages (newest first) | `org_admin` | → `{reports: MessageReport[]}` | BE-09 #17 | SR-LOG-01 |
| `GET /api/ws` (WebSocket) | Live events | session cookie at handshake + `Origin` check | see below | BE-06 #11 | SR-WS-01…04 |

**Schemas:** `User {id, username, display_name, role, organisation{id,name}, avatar_url|null}` ·
`DirectoryUser {id, username, display_name, avatar_url|null}` · `Member = DirectoryUser + {is_manager}` ·
`Conversation {id, type: "group"|"direct", name, member_count, can_manage}` (for a direct
conversation `name` is the other participant's display name; `can_manage` is computed by the
server: participant **and** (`org_admin` **or** manager of that group)) ·
`Message {id, conversation_id, author{id, display_name, avatar_url}, body, created_at, attachment|null}` ·
`Attachment {id, filename, content_type, size_bytes, confidential, download_url}` ·
`AuditEvent {id, event_type, actor_username|null, timestamp, source_ip, details}` ·
`MessageReport {id, message_id, conversation_id, conversation_name, reporter_username, reason, message_body, created_at}`.
TypeScript source of truth: `src/frontend/src/types/api.ts`.

**WebSocket conventions (BE-06 #11, FE-04 #12):**

- URL `ws(s)://<same host>/api/ws`, proxied by nginx (`location = /api/ws`, Upgrade headers, 75 s read timeout). The CSP `connect-src 'self'` covers it.
- **Handshake:** the server reads the `session` cookie and **checks the `Origin` header** against the app's own origin (protection against cross-site WebSocket hijacking). No valid session → close code **4401**; the front then sends the user to sign in.
- **Server → client only**, JSON text frames: `{"type":"message.created","message":Message}` · `{"type":"message.updated","message":Message}` (e.g. attachment added) · `{"type":"conversation.updated","conversation_id":n}` (membership changed; the front re-reads over REST) · `{"type":"ping"}` every 25 s. Unknown types are ignored.
- Events are sent **only to participants** of the conversation (membership checked at send time, not at connect time). The client sends nothing that can subscribe it to other rooms.
- **Delivery is at-least-once:** the front de-duplicates by `message.id` and orders by `id`. After a reconnect it calls `GET …/messages?after_id=<last id>` to catch up; while the socket is down it polls every 3 s.
- Session expiry or logout closes the socket (4401).

**Deferred (v0.3):** attachment preview, message editing/deletion, organisation membership screens
(adding users to an organisation), external-service integration (BE-10 #24 / FE-08 #25 — no provider chosen).

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

- **Colours:** `--bg #f7f7f8` · `--surface #ffffff` · `--primary #007a54` (dark Roehampton green: buttons, links, own messages — 5.4:1 with white text) · **brand `#00A06E` (Roehampton green, sampled from the university logo, 2026-11-15 — replaces the team's orange `#E36E04` and the blue `#1f6feb`)** · `--text #1f2328` · `--muted #656d76` · `--danger #cf222e`
- **Type:** system font stack, 16px base, line-height 1.5
- **Spacing:** 4 / 8 / 16 / 32 · radius 8px · border 1px `#d0d7de`

**Components (the only four):**

1. **Button** — primary (filled) / ghost / danger
2. **Input** — label + field + inline error
3. **Card** — white surface, 16px padding, used for panels
4. **MessageBubble** — own messages: primary background, right-aligned; others: white, left-aligned

**Screens:** Login · Register · Conversation list (cards) · Chat view (bubbles + composer + members panel) · Profile (card + avatar) · **Admin screens (team model: users/roles, organisation membership, audit review)** · **System status (B7: health + database greeting)**. Responsive, mobile-friendly, retro chat-room feel.

**Additions (one line each, story B7, 2026-11-15):**

- **Notice** — inline message (info / success / warning / error); errors use `role="alert"`.
- **Badge** — small label: `Group` / `Direct`, `Manager`, `Confidential` (danger), `Mock mode` (brand).
- **Avatar** — uploaded image or initials on the brand colour; small (32 px) / large (96 px).
- **AppShell** — header with brand, navigation (Conversations · Profile · Admin for `org_admin` · Status), current user, Sign out; skip link to the content.
- **Link** — internal link that navigates without reloading but stays a real `<a href>`.
- **MembersPanel** — card beside the chat (below it on mobile): members, `Manager` badge, add/remove for group managers (FE-06).
- **Progress** — native `<progress>` + "Uploading… n%" while an attachment uploads (FE-05).

No dark mode, no animations, no icon library. **If it is not on this page, it does not exist** — additions need a one-line entry here first (that rule is what keeps this one page long).

## 7. Front-end design (story B7)

Story: `../04. Stories/B7-front-end-screens.md` (owner Ambroise). Code: `src/frontend/`.

### Stack and constraints

React 19.3 + TypeScript 7 (strict) + Vite 8, as delivered by the scaffold. **No new npm
package**: routing, forms and data loading are written with React itself (repository rule 8).
CSS Modules only, with the §6 tokens in `styles/global.css`. No inline `style` attribute and no
inline script, so the strict nginx CSP holds unchanged (SR-FE-02).

### Structure (scaffold folders kept)

| Folder | Content |
|---|---|
| `app/` | `App.tsx` (providers + route guard) · `AppShell.tsx` · `screens/<screen>/` |
| `components/` | Design system: Button, TextField (Input), Card, MessageBubble, Notice, Badge, Avatar, Link |
| `features/` | `auth/AuthContext.tsx` (who is signed in) · `realtime/RealtimeContext.tsx` (one live connection per session) · `chat/` (messages hook with de-duplication, composer, message item + report, members panel) · `greetings/` (scaffold panel, kept) |
| `hooks/` | `useApi` (API context) · `useRoute` (history router, internal paths only) |
| `services/` | `httpClient.ts` (fetch, CSRF header, timeout, safe errors, upload with progress) · `parsers.ts` (runtime shape checks, incl. WebSocket frames) · `liveApi.ts` · `liveRealtime.ts` (WebSocket, back-off, 4401) · `mock/` (demo API + event bus) · `api.ts` (chooses live or mock at build time) |
| `types/` | `api.ts` — contract v0.2 types and the `WhatsUpApi` interface |
| `utils/` | `guards.ts` (runtime checks, same-origin URL checks) · `roles.ts` · `format.ts` |

### Routes and screens

| Path | Screen | Access (UX guard — the API decides) | Calls | Backlog |
|---|---|---|---|---|
| `/login` | Sign in (validation, generic error, expiry notice) | signed out | `POST /api/auth/login` | FE-02 #7 |
| `/register` | Create an account | signed out | `POST /api/auth/register` | (blueprint) |
| `/conversations` | My conversations · new direct message (directory) · new group (managers/admins) · empty/error states | signed in | `GET/POST /api/conversations`, `GET /api/users` | FE-03 #10 |
| `/conversations/:id` | Chat: history, composer, live updates (WebSocket, 3 s polling fallback, live/reconnecting label), attachment + confidential flag + progress, report, members panel | participant | `…/messages`, `/api/ws`, `/api/messages/{id}/attachments`, `…/reports`, `…/members` | FE-03 #10 · FE-04 #12 · FE-05 #14 · FE-06 #16 · FE-07 #18 |
| `/profile` | Display name, avatar, role and organisation (read-only) | signed in | `PATCH /api/profile`, `POST /api/profile/avatar` | (blueprint) |
| `/admin` | Users and roles · reported messages · security audit events (empty/error/success states) | `org_admin` | `/api/admin/*` | FE-06 #16 · FE-07 #18 |
| `/status` | API mode, `/api/health`, database greeting, auth availability, live-updates status | public | `GET /api/health`, `GET /api/greetings/hello`, `GET /api/auth/me` | (B7) |
| `/` and others | redirect to `/conversations` or `/login`; unknown path → *Page not found* | — | — | FE-02 #7 |

### Session and state

- The session is the back-office's `HttpOnly` cookie; the front never sees or stores a token
  (SR-FE-01). At start-up `GET /api/auth/me` tells the front who is signed in.
- `401` anywhere → the user is sent to `/login?expired=1`. `404 "Not Found"` on `/api/auth/me` → the
  back-office has no auth yet: the sign-in screen says so (BE-03 #6 pending).
- WebSocket closed with **4401** → same path as a 401 (FE-02 "session expiry handled without broken screens").
- State stays local to each screen; the only shared state is the signed-in user and the live
  connection (React contexts). Messages are merged by `id` (de-duplication + order, FE-04).

### Two API implementations, one interface

| Build | How | Talks to | Use |
|---|---|---|---|
| **live** (default) | `docker compose up` / `npm run dev` | FastAPI through nginx `/api/` | the system under test |
| **mock** | `VITE_API_MODE=mock` build arg (service `frontend-mock`, port 3001, `test/compose.test.yaml`) | in-browser demo data: `localStorage` (shared by the tabs of one browser), session per tab in `sessionStorage`, live events through `BroadcastChannel` (delivered twice on purpose) | demo and acceptance tests until the BE issues exist |

The mock is loaded by dynamic import only when `VITE_API_MODE=mock`. A live bundle contains no
mock code and no demo password (checked on 2026-11-15 by grepping both builds — SR-FE-06). The
mock is **never** a security control: it runs in the browser and can always be bypassed.

### Security controls on the front (and their limits)

| Control | Where | SR |
|---|---|---|
| Text-only rendering of messages, names, filenames | React text nodes, no `dangerouslySetInnerHTML` | SR-VAL-02, SR-FE-03 |
| API responses checked at run time; links/images kept only if same-origin relative paths | `services/parsers.ts`, `utils/guards.ts` | SR-FE-03 |
| CSRF header on POST/PATCH/DELETE; same-origin credentials; 10 s timeout | `services/httpClient.ts` | SR-SESS-05, SR-FE-05 |
| Safe error messages only (never raw bodies or stack traces) | `services/apiError.ts` | SR-ERR-01, SR-FE-05 |
| Navigation accepts internal paths only (no open redirect) | `hooks/useRoute.ts` | SR-FE-04 |
| Route guard, hidden Admin link, upload pre-checks, `maxLength` | screens | **UX only** — SR-FE-04; enforcement = SR-AC, SR-VAL, SR-FILE on the server |
| Generic sign-in failure message reused from the server | `LoginScreen` | SR-AUTH-03 |
| Registration never signs in by itself (fresh session at login) | `RegisterScreen` | SR-SESS-03 |
| WebSocket frames parsed like API responses; unknown types ignored; 4401 → sign in | `liveRealtime.ts`, `parsers.ts` | SR-WS-03, SR-FE-03 |
| Upload pre-checks (type allowlist by MIME **and** extension, 5 MB) with size feedback | `Composer.tsx` | **UX only** — SR-FILE-01 on the server |

### Tests

`test/` at the repository root (pytest + Playwright Chromium, run in Docker, no host install):
**smoke** (stack wired: healthz, SPA, proxy, DB greeting, baseline headers, browser boot) and
**acceptance**, one file per backlog issue and one test per acceptance checkbox
(`test_fe02_ac4_…` = FE-02, 4th checkbox): `test_fe02_login.py` … `test_fe07_reports_audit.py`
on the mock build, `test_acceptance_live.py` on the live stack. 45 tests, all passing on
2026-11-15. Command: `bash test/run-tests.sh` — details in `test/README.md`.

### Backlog coverage (GitHub issues, frontend)

| Issue | Front state (mock build) | Waits for |
|---|---|---|
| FE-01 #3 Initialise React app | closed by Evan (scaffold); extended by B7 | — |
| FE-02 #7 Login + protected routes | AC1–AC4 done and tested; AC5 (real backend) adapts automatically | SH-01 #4, BE-03 #6 |
| FE-03 #10 Conversations + messaging | AC1, AC2, AC4, AC5 done and tested; AC3 done on mock | BE-05 #9 |
| FE-04 #12 Real-time chat | AC1–AC4 done and tested on mock (two tabs, reload, reconnect catch-up, duplicates) | BE-06 #11 |
| FE-05 #14 Attachments | AC1–AC4 done and tested on mock (types, size, classification, download link, progress) | BE-07 #13 |
| FE-06 #16 Group + admin screens | AC1–AC5 done and tested on mock | BE-08 #15 |
| FE-07 #18 Reporting + audit views | AC1–AC4 done and tested on mock | BE-09 #17 |
| FE-08 #25 External service (P2) | not started | BE-10 #24 (no provider chosen) |

## 8. Sprint 1 checklist

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

## 9. Traceability

- **Oracle:** `../04. Stories/security-requirements.md` is the oracle for every test in `../04. Stories/Ethical-Hacking-scenario.md` — each attack expects an SR to hold; a breach is a CVSS-scored finding, a pass confirms a control. This blueprint is the Q1 input (*what we build*) that those SRs govern.
- **CAF 4.0:** `../03. Frameworks/caf-4.0-baseline.md` groups the SRs into NCSC CAF contributing outcomes (B2.a identity and access, B3.b data in transit, B4.a secure by design, A4.b secure software development, C1 logging…) with an honest self-assessment. It gives the business-impact language for Artefacts 2 and 3.
- **Stories:** `../04. Stories/B0-back-office-scaffold-retro.md` (what the back-office is today) · `../04. Stories/B7-front-end-screens.md` (the front, contract v0.2, tests).
- **Group backlog (GitHub, source of truth for sprint work):** B0 = BE-01 #2 + FE-01 #3 (closed) · B1 = BE-02 #5, BE-03 #6, BE-04 #8 · B2 = BE-05 #9, BE-06 #11, BE-07 #13 · B3 = BE-08 #15, BE-09 #17 · B7 = FE-02…FE-07 (#7, #10, #12, #14, #16, #18) · SH-01 #4 = the contract in §4 · SH-03 #20 = security smoke tests on the five scenarios (human-executed, see `Ethical-Hacking-scenario.md`).
- **Artefacts:** this blueprint feeds Artefact 1 (Scoping Document — vision, scope, architecture, deployment evidence), Artefact 2 (Threat Model — attack surface preview → STRIDE story A1, sprint-1 deliverables), Artefact 3 (Security Assessment Report — the surfaces tested against the SRs) and Artefact 4 (Reflection — decisions recorded in section 0).
