# B0 — Back-office scaffold (retro-documentation)

| Field | Value |
|---|---|
| **ID** | B0 (build phase — written after the fact) |
| **Built by** | GitHub user `Productivity-Square` (12 commits, 2026-10-31) · merged by `Evan-Balson` |
| **Source** | Group repo `jackoturner/WhatsUpTeam_Coursework`, branch `balson_app_scaffold` → PR #27 → `main` at commit `0e5302d` (2026-11-10) |
| **Local copy** | `WhatsUpTeam_Coursework-main/` (downloaded 2026-11-15, identical to `0e5302d` apart from line endings) |
| **Status** | `shipped` (merged) — this file documents it; it changes no code |
| **Retro written by** | Ambroise, with Claude Code (see `AI_USE.md`, 2026-11-15) |

**Why a retro story.** The scaffold was merged without a story file. Our method needs one so
that (1) the threat model (A1) starts from what really exists, (2) the gaps are visible as SR
references, and (3) the B1–B3 owners know what to build next.

## 1. What was delivered (commit history)

| Commit | Change |
|---|---|
| `f15fe2a` | Git ignores and line endings |
| `046c08a` | MySQL seeded with a `hello` greeting |
| `45b85a8` | Database-backed MVC greeting API (FastAPI) |
| `2db9787` · `49675cc` | React greeting screen with scoped styles · Chromium test of the greeting button |
| `fc129ee` · `40fa230` | Docker Compose stack on `localhost:3000` · `npm run dev` starts it |
| `3e0cb87` | Shared AI rules and six engineering skills (`.agents/`) |
| `e71d434` | Hot reload for front and back |
| `062a246` | Applications moved to `src/`, database to `infrastructure/` |
| `53b3f07` | Browser test tooling removed from the front package |
| `e2eef07` | Front split into app / features / services |

## 2. Architecture as built

```
Browser ──HTTP──▶ 127.0.0.1:3000 ─▶ frontend (nginx-unprivileged :8080)
                                      │ static React build · /api/ reverse proxy
                                      ▼  network "app"
                                    backend (FastAPI/Uvicorn :8000, user "app")
                                      │  network "data" (internal: true)
                                      ▼
                                    database (MySQL 8.4) ── volume mysql_data
```

- **Backend layout (MVC):** `controllers/greeting.py` (router `/greetings`) · `models/greeting.py`
  (`Greeting` table) · `views/greeting.py` (Pydantic `GreetingView`) · `database.py` (engine via
  `URL.create`, `pool_pre_ping`, 5 s timeouts, request-scoped `Session`) · `main.py` (app,
  docs on `/api/docs`, `SQLAlchemyError` → 503, `/api/health`).
- **Endpoints:** `GET /api/health` → `{"status":"ok"}` · `GET /api/greetings/hello` →
  `{"message":"hello"}` or 404 · `GET /api/docs`, `GET /api/openapi.json`.
- **Data:** one table, `greetings(id, message)`, seeded by `infrastructure/database/init/001_greetings.sql`.
- **Containers:** multi-stage builds (`test`, `development`, `runtime`); backend runs as `app`,
  nginx unprivileged; healthchecks on all three services; `depends_on: service_healthy`.
- **Configuration:** `.env` from `.env.example` (`scripts/prepare-env.mjs`), compose `:?` guards
  refuse to start without credentials; `.env*` git-ignored except the example.
- **Tests:** 3 backend pytest cases on in-memory SQLite (`tests/test_greeting.py`).

Details and versions: Blueprint §4 *Back-office as built*.

## 3. Security review of the scaffold against our SRs

Read-only review (code reading, no testing executed). **Holds** = control present in code.
**Gap** = expected later by the SR; it becomes a finding only if still there when the A
stories test the deployed app (*build honest, not buggy*).

| SR | State | Evidence in code |
|---|---|---|
| SR-VAL-03 parameterised queries | Holds | ORM `db.get(Greeting, 1)`, no SQL strings except the constant `SELECT 1` |
| SR-ERR-01 generic errors | Holds (DB errors) | `database_error_handler` returns a fixed message; test `test_database_failure_returns_503_without_connection_details` |
| SR-CONF-01 baseline headers | Partly | CSP, `nosniff`, `Referrer-Policy` on `/`; `frame-ancestors 'none'` in CSP; no headers added by nginx on `/api/` responses beyond the server-level two |
| SR-CONF-02 version tokens | Partly | `server_tokens off` on nginx; FastAPI/Uvicorn banner not checked yet (EH-01) |
| SR-CONF-03 no secrets in Git | Holds | `.env` ignored, compose `:?` guards, `URL.create` for passwords |
| SR-CONF-04 non-root, pinned images | Partly | Non-root backend and nginx; base images pinned by tag (`python:3.13-slim`, `mysql:8.4`, `node:22-alpine`), not by digest; `nginx-unprivileged:stable-alpine` is a moving tag |
| SR-DEP-01 pinned dependencies | Holds | `requirements.txt` exact pins, `package-lock.json` |
| SR-AC-01 deny by default | **Gap** | `/api/greetings/hello` is public (only `/api/health` should be) — no auth layer yet (B1) |
| SR-AC-05 no docs in deployment | **Gap** | `docs_url="/api/docs"`, `openapi_url="/api/openapi.json"` enabled in every target |
| SR-ERR-02 debug off | Holds (runtime) | `runtime` target has no `--reload`; dev target is opt-in through `compose.override.yaml` |
| SR-COMM-01…03 TLS | **Gap** | Plain HTTP on `127.0.0.1:3000`, no TLS listener (planned :8443, story B4/A5) |
| SR-AUTH, SR-SESS, SR-FILE, SR-LOG | Not applicable yet | No auth, upload or audit code exists |

**CAF 4.0 view** (`../03. Frameworks/caf-4.0-baseline.md`): the scaffold already supports B4.a
(segmented networks, single published port), part of B4.b (headers, non-root) and A4.b (pinned
components, tests, reviewed PR). B2.a, B3.b and C1 are not achieved yet.

## 4. What the scaffold means for the next stories

| Story | Starts from | Must add (contract v0.1, Blueprint §4) |
|---|---|---|
| **B1** auth | MVC pattern, `get_db`, error handler | `User`, `Session`, `Organisation` tables; `/api/auth/register|login|logout|me`; cookie + CSRF; throttling; deny-by-default dependency; audit events |
| **B2** channels & messaging | same | `Channel`, `ChannelMember`, `Message`, `Attachment`, `MessageReport`; `/api/channels…`, `/api/messages…`, `/api/attachments/{id}`; org scoping |
| **B3** profiles & admin | same | `/api/profile`, avatar upload/serve, `/api/admin/users`, `/api/admin/audit-events` |
| **B4** deployment | compose, nginx | TLS on :8443, HTTP→HTTPS, HSTS; docs disabled in `runtime`; seed script (`alice`, `bob`, `#general`) |
| **B7** front (done) | greeting screen | all screens, API layer, mock build, `test/` suites |

The front (B7) already calls these routes. Its mock (`src/frontend/src/services/mock/mockApi.ts`)
shows the expected behaviour of each one, including the error cases.

## 5. Open questions for the group

1. Remove or gate `/api/greetings/hello` once B1 lands (it is the only public data route).
2. Disable `/api/docs` and `/api/openapi.json` in the `runtime` target (`docs_url=None` when an env flag is off).
3. Pin images by digest for the assessed build (SR-CONF-04).
4. Who owns B1, B2, B3? The contract v0.1 lets the three be built in parallel.
