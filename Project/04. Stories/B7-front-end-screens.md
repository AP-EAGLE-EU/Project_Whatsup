# B7 — Front-end screens and back-office integration (contract-first + mock)

| Field | Value |
|---|---|
| **ID** | B7 (build phase) |
| **Owner** | Ambroise PETIN (front) · **Reviewer:** TBD (GATE 2 needs a second person) |
| **Complexity** | 3 |
| **Depends on** | B0 (back-office scaffold, shipped) · feeds B1–B3 (API contract v0.1) |
| **Feeds** | Artefact 1 (screens, deployment evidence) · Artefact 3 (surfaces to test) |
| **Status** | `in-review` — code + tests done 2026-11-15, waiting for GATE 2 |
| **Branch** | `feat/b7-front-end-screens` (group repo) — personal workshop copy at the repo root |
| **AI use** | Drafted and coded with Claude Code (see `AI_USE.md`, 2026-11-15) |

**User story.** *As an employee of an organisation that uses WhatsUp, I want clear screens to
sign in, chat in my team's channels, share files with a confidential flag, report suspicious
messages and manage my profile, and, as an IT admin, to manage roles and review security
events, so that our internal communication stays inside a trusted tool.*

## 1. Research

- **Back-office today** (B0, group commit `0e5302d`): `/api/health`, `/api/greetings/hello` and
  FastAPI docs only. No auth, channels, messages, profile or admin endpoints. B1–B3 are `to-plan`.
- **Scaffold front**: React 19.3, TypeScript 7 strict, Vite 8, CSS Modules, one greeting
  screen. The team **removed** browser test tooling from the front package (commit `53b3f07`),
  so browser tests must live elsewhere.
- **Edge**: nginx CSP `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:`
  → no inline style or script, no CDN.
- **Rules**: no new dependency without need (rule 8); never trust the browser (rule 6); the
  front is never an authorisation layer (frontend skill).
- **Requirements**: SR-AUTH/SESS/AC/VAL/FILE govern what the screens send; new SR-FE-01…06
  govern the front itself. CAF 4.0: A4.b, B4.a (`../03. Frameworks/caf-4.0-baseline.md`).

## 2. Design

- **Contract-first:** the screens call the **API contract v0.1** (Blueprint §4). The contract
  is the hand-off to B1–B3; it states routes, schemas, cookies, CSRF, errors and limits.
- **Two implementations, one interface (`WhatsUpApi`):** *live* (fetch to `/api/…`) and
  *mock* (in-browser data, `VITE_API_MODE=mock`). The mock applies the contract's rules, so it
  is an executable specification for the back team.
- **Real integration today:** the *System status* screen calls the live `/api/health` and
  `/api/greetings/hello` (browser → nginx → FastAPI → MySQL). The sign-in screen detects that
  `/api/auth` does not exist yet and says so.
- **Screens:** Sign in · Create an account · Channels · Chat · Profile · Admin · System status ·
  Not found. Design system §6 plus Notice, Badge, Avatar, AppShell, Link (one-line entries added).
- Full design: Blueprint §7.

## 3. Plan

| # | Step | Done |
|---|---|---|
| 1 | Contract v0.1 types + `WhatsUpApi` interface (`types/api.ts`) | ✔ |
| 2 | HTTP client: same-origin, CSRF header, timeout, safe errors; runtime parsers | ✔ |
| 3 | Live implementation + mock implementation (seeded demo organisations) | ✔ |
| 4 | Router (history API, internal paths only) + auth context + AppShell | ✔ |
| 5 | Screens: login, register, channels, chat (polling, attachment, report), profile, admin, status, 404 | ✔ |
| 6 | Dockerfile build arg `VITE_API_MODE` (default `live`) | ✔ |
| 7 | `test/`: smoke + acceptance (pytest + Playwright in Docker), `run-tests.sh`, README | ✔ |
| 8 | Docs: Blueprint §4/§6/§7/§9, SR-FE group, CAF baseline, this story, B0 retro | ✔ |

**GATE 1 — plan validated:** `validated: yes` — Ambroise, 2026-11-15 (instruction to build the
front with contract + mock; option chosen among three presented).

## 4. Execute — what was built

- `src/frontend/src/` — 44 files (37 TypeScript, 7 CSS; see Blueprint §7 table). Scaffold `HomeScreen` and `greetingService.ts` replaced (the greeting moved to the Status screen and the shared API layer). Group back-office **unchanged**.
- `src/frontend/Dockerfile` — `ARG VITE_API_MODE=live` in the build stage.
- `test/` — `compose.test.yaml` (services `frontend-mock` on :3001 and `tests`), `Dockerfile`
  (Playwright Python image), `smoke/`, `acceptance/`, `run-tests.sh`, `README.md`.

## 5. Acceptance criteria

**On the live stack (today's back-office):**

| AC | Given / When / Then | Test |
|---|---|---|
| AC-L1 | Given the stack is up, when I open *System status* and click *Fetch hello*, then health shows `ok` and the greeting `hello` comes from MySQL | `test_ac_l1_…` |
| AC-L2 | When I open *Sign in* and `/api/auth/me` answers 404, then a notice says sign-in is not provided yet; once B1 answers 401, the notice is gone | `test_ac_l2_…` |
| AC-L3 | When I am signed out and open `/channels`, `/channels/1`, `/profile` or `/admin`, then I land on `/login` | `test_ac_l3_…` |
| AC-L4 | *System status* shows API mode `live` | `test_ac_l4_…` |

**On the mock build (all screens):**

| AC | Given / When / Then | SR | Test |
|---|---|---|---|
| AC-01 | A wrong password and an unknown user show the **same** message `Invalid username or password.` | SR-AUTH-03 | `test_ac_01_…` |
| AC-02 | Alice (Acme Legal) sees `#general`, `#legal-team`, `#random` — never Globex channels | SR-AC-02 | `test_ac_02_…` |
| AC-03 | A member posts a message; it appears at the end, marked *You* | SR-VAL-01 | `test_ac_03_…` |
| AC-04 | A message containing `<b>…</b>` is displayed as text; no `<b>` element is created | SR-VAL-02, SR-FE-03 | `test_ac_04_…` |
| AC-05 | A non-member opening a private channel sees no messages and is told to ask a group manager | SR-AC-02 | `test_ac_05_…` |
| AC-06 | Joining a public channel opens its chat | — | `test_ac_06_…` |
| AC-07 | A file attached with *Mark as confidential* shows a *Confidential* badge | scenario 3 | `test_ac_07_…` |
| AC-08 | A suspicious message can be reported with a reason; the user gets a confirmation | SR-LOG-01 | `test_ac_08_…` |
| AC-09 | The display name updates in the header; a fake PNG avatar is refused; a real PNG is accepted | SR-FILE-01 | `test_ac_09_…` |
| AC-10 | An employee has no *Admin* link and `/admin` says *reserved*; the IT admin sees users, changes a role, and the change appears in the audit events | SR-AC-04, SR-LOG-01 | `test_ac_10_…` |
| AC-11 | After *Sign out*, `/channels` sends me back to `/login` | SR-AUTH-05 (UX side) | `test_ac_11_…` |
| AC-12 | A new user registers, is **not** signed in automatically, then signs in | SR-SESS-03 | `test_ac_12_…` |
| AC-13 | A user from another organisation sees only their own channels; opening an Acme channel says *Channel not found.* | SR-AC-03 | `test_ac_13_…` |

**Definition of done:** strict type-check and production build pass in both modes · live bundle
contains no mock code · smoke + acceptance suites green · GATE 2 review.

## 6. Review — GATE 2

| Check | Result |
|---|---|
| `tsc --noEmit && vite build` (live and mock), in Docker | pass — 2026-11-15 |
| Live bundle free of mock code and demo password (`grep -r demo-password dist/`) | pass — 2026-11-15 |
| `bash test/run-tests.sh all` | **27 passed** (10 smoke, 17 acceptance) — 2026-11-15, run by Claude Code; to be re-run by Ambroise as evidence. The first run exposed a race in AC-10's test (reload before sign-out finished), fixed in the test |
| Second-person code review | **pending** |

**Ship allowed:** `pending` — needs the reviewer's `yes`. Only a critical finding blocks.

## 7. Ship

Open a PR from `feat/b7-front-end-screens` to the group repo with `src/frontend/`, `test/`, and
the Blueprint/SR changes. Squash-merge after review. Hand the **API contract v0.1** to the B1–B3
owners. When an endpoint lands, AC-L2 flips by itself, and the mock tests stay valid as the
reference behaviour.

## 8. Known limits (honest list)

- Until B1–B3 ship, the live stack shows only *Status* and *Sign in* — every other screen works
  in the mock build only.
- Polling every 3 s with `after_id` does not pick up an attachment added to a message *after*
  another user has already received it (WebSockets in v0.2 fix this).
- No group-manager screen yet (add/remove members of private channels) — v0.2.
- The mock's rules are a **specification**, not protection: they run in the browser.
