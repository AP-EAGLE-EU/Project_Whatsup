# B7 — Front-end screens and back-office integration (contract-first + mock)

| Field | Value |
|---|---|
| **ID** | B7 (build phase) = group backlog **FE-02 #7 · FE-03 #10 · FE-04 #12 · FE-05 #14 · FE-06 #16 · FE-07 #18** (+ proposal for **SH-01 #4**) |
| **Backlog** | GitHub `jackoturner/WhatsUpTeam_Coursework` — issues opened by Evan-Balson, Sprint 2 (31 Oct–14 Nov 2026), label `frontend` |
| **Owner** | Ambroise PETIN (`AP-EAGLE-EU`, collaborator — can self-assign) · **Reviewer:** TBD (GATE 2 / issue DoD: one teammate) |
| **Complexity** | 3 |
| **Depends on** | B0 = BE-01 #2 + FE-01 #3 (closed) · real-backend checkboxes wait for BE-03 #6, BE-05 #9, BE-06 #11, BE-07 #13, BE-08 #15, BE-09 #17 |
| **Feeds** | Artefact 1 (screens, deployment evidence) · Artefact 3 (surfaces to test) · SH-02 #19 (integration) |
| **Status** | `in-review` — code + tests done 2026-11-15 (mock build), waiting for GATE 2 and for the BE issues |
| **Branch** | `feat/b7-front-end-screens` (group repo, not pushed yet) — personal workshop copy at the repo root |
| **AI use** | Drafted and coded with Claude Code (see `AI_USE.md`, 2026-11-15) |

**User story.** *As an employee of an organisation that uses WhatsUp, I want clear screens to
sign in, chat in direct and group conversations, share files with a confidential flag, report
suspicious messages and manage my profile; as a group manager, to manage my groups' members;
and, as an IT admin, to manage roles and review reports and security events — so that our
internal communication stays inside a trusted tool.*

## 1. Research

- **Back-office today** (B0, group commit `0e5302d`): `/api/health`, `/api/greetings/hello` and
  FastAPI docs only. All BE issues except BE-01 are open and unassigned (checked 2026-11-15).
- **Backlog** (GitHub): FE-02…FE-08 open, unassigned, all blocked by BE issues; SH-01 #4 (API
  contract) open and unassigned — it blocks FE-02. Vocabulary is **conversations** (direct and
  group) with participants, group managers, WebSockets.
- **Scaffold front**: React 19.3, TypeScript 7 strict, Vite 8, CSS Modules. The team removed
  browser test tooling from the front package (commit `53b3f07`) → browser tests live in `test/`.
- **Edge**: nginx CSP `default-src 'self'` → no inline style/script, no CDN.
- **Rules**: no new dependency (rule 8); never trust the browser (rule 6).
- **Requirements**: SR-AUTH/SESS/AC/VAL/FILE/LOG; SR-FE-01…06; SR-WS-01…04 (new). CAF 4.0: A4.b, B4.a.

## 2. Design

- **Contract-first:** the screens call the **API contract v0.2** (Blueprint §4), written as the
  proposal for **SH-01 #4** (endpoints, payloads, cookies, error codes, entities, WebSocket conventions).
- **Two implementations, one interface (`WhatsUpApi`):** *live* (fetch + WebSocket to `/api/…`)
  and *mock* (`VITE_API_MODE=mock`): data in `localStorage` shared by the tabs of one browser,
  one session per tab, live events through `BroadcastChannel` — so two tabs = two users chatting
  live. The mock applies the contract's rules: an executable specification for the BE issues.
- **Real integration today:** *System status* calls the live `/api/health` and
  `/api/greetings/hello`; sign-in detects that `/api/auth` does not exist yet and says so.
- Full design: Blueprint §7.

## 3. Plan

| # | Step | Done |
|---|---|---|
| 1 | Contract v0.2 types + `WhatsUpApi` (conversations, members, directory, reports, realtime) | ✔ |
| 2 | HTTP client (CSRF, timeout, safe errors, upload with progress); runtime parsers incl. WebSocket frames | ✔ |
| 3 | Live API + live WebSocket client (back-off, 4401, catch-up); mock API + event bus | ✔ |
| 4 | Router + auth context + realtime context + AppShell | ✔ |
| 5 | Screens: login, register, conversations, chat (live, attachments, report, members), profile, admin (users, reports, audit), status, 404 | ✔ |
| 6 | nginx `location = /api/ws` (Upgrade headers) + Vite dev proxy `ws: true`; Dockerfile `VITE_API_MODE` | ✔ |
| 7 | `test/`: smoke + acceptance per backlog issue (`test_feNN_acN_…`) | ✔ |
| 8 | Docs: Blueprint v1.2, SR-WS + SR-FE, EH-17, CAF baseline, this story, B0 retro, Way of Working; GitHub issue texts | ✔ |

**GATE 1 — plan validated:** `validated: yes` — Ambroise, 2026-11-15 (contract + mock option;
"OK Go pour prendre en compte les issues").

## 4. Acceptance criteria — per backlog issue

Legend: **Done (mock)** = implemented and covered by an automated test on the mock build ·
**Waits** = needs the named BE issue on the live stack before the GitHub checkbox can be ticked.

### FE-02 #7 — Login screen and authenticated route handling

| Issue checkbox | Code | Test | State |
|---|---|---|---|
| Login form validates input and displays API errors clearly | `LoginScreen` (required, max lengths, generic error alert, 429, "not available") | `test_fe02_ac1_…` | Done (mock) |
| Successful login enters the chat interface | navigates to `/conversations` | `test_fe02_ac2_…` | Done (mock) |
| Logout returns the user to login | `AuthContext.logout` | `test_fe02_ac3_…`, `test_live_fe02_ac3_…` | Done (mock + live redirect) |
| Session expiry is handled without broken screens | 401 / WebSocket 4401 → `/login?expired=1` + notice | `test_fe02_ac4_…` | Done (mock) |
| Authentication is verified against the real backend | live API ready | `test_live_fe02_ac5_…` (adapts when BE-03 lands) | **Waits** SH-01 #4, BE-03 #6 |

### FE-03 #10 — Conversation list and messaging interface

| Issue checkbox | Code | Test | State |
|---|---|---|---|
| Conversation list loads for the authenticated user | `ConversationsScreen` (group/direct badges, org-scoped) | `test_fe03_ac1_…` (×2) | Done (mock) |
| Users can open a conversation and see message history | `ChatScreen` + `useMessages` | `test_fe03_ac2_…` | Done (mock) |
| Compose/send works with the actual backend | `Composer`, direct conversation start | `test_fe03_ac3_…` (×3) | Done (mock) · **Waits** BE-05 #9 |
| Loading, empty and error states are visible | loading text, empty list/messages, 403/404 notices | `test_fe03_ac4_…` (×2) | Done (mock) |
| Layout remains usable on mobile and desktop | two columns ≥ 720 px, stacked below | `test_fe03_ac5_…` (1280 px and 375 px) | Done (mock) |

### FE-04 #12 — Real-time chat and message state

| Issue checkbox | Code | Test | State |
|---|---|---|---|
| Two logged-in users exchange messages without page refresh | `RealtimeContext`, `liveRealtime.ts` (WebSocket) / mock bus | `test_fe04_ac1_…` (two tabs) | Done (mock) · **Waits** BE-06 #11 |
| Message history remains correct after reload | REST history ordered by id | `test_fe04_ac2_…` | Done (mock) |
| Reconnect restores the visible conversation state | back-off reconnect + `?after_id=` catch-up, 3 s polling while offline, "Live/Reconnecting" label | `test_fe04_ac3_…` | Done (mock) |
| Duplicate event handling is tested | `mergeMessages` by id; mock delivers each event twice | `test_fe04_ac4_…` | Done (mock) |

### FE-05 #14 — Attachments and confidentiality controls

| Issue checkbox | Code | Test | State |
|---|---|---|---|
| Upload control supports allowed file types and size feedback | `Composer` (MIME + extension allowlist, 5 MB, name — size shown) | `test_fe05_ac1_…` | Done (mock) |
| User can set attachment classification | "Mark as confidential" → `Confidential` badge | `test_fe05_ac2_…` | Done (mock) |
| Attachment links call the authenticated download API | `download_url` kept only if same-origin (`/api/attachments/{id}`) | `test_fe05_ac3_…` | Done (mock) · **Waits** BE-07 #13 |
| Upload progress, failure and permissions errors are displayed | XHR progress bar; API errors (403/413/415) shown | `test_fe05_ac4_…` | Done (mock) |

### FE-06 #16 — Group management and admin screens

| Issue checkbox | Code | Test | State |
|---|---|---|---|
| Group managers can view and edit permitted group membership | `MembersPanel` (add/remove, server `can_manage`) | `test_fe06_ac1_…` | Done (mock) · **Waits** BE-08 #15 |
| Admin users can view user/role management and audit screens | `AdminScreen` | `test_fe06_ac2_…` | Done (mock) |
| Restricted controls are hidden or disabled for other roles | Admin link, New group, members controls, own role | `test_fe06_ac3_…` | Done (mock) |
| Server-side authorisation remains the final authority | UI never decides; admin data only from 403-protected endpoints | `test_fe06_ac4_…` | Done (mock) · **Waits** BE-08 #15 |
| Empty, error and success states are usable | `ListState` (loading/error/empty/table), notices | `test_fe06_ac5_…` | Done (mock) |

### FE-07 #18 — Suspicious-content reporting and audit views

| Issue checkbox | Code | Test | State |
|---|---|---|---|
| Users can report a message with confirmation feedback | `MessageItem` report form | `test_fe07_ac1_…` | Done (mock) |
| Admin users can view relevant audit/report entries | Admin "Reported messages" + "Security audit events" | `test_fe07_ac2_…` | Done (mock) · **Waits** BE-09 #17 |
| Unauthorized users cannot navigate to privileged views | route guard + hidden link | `test_fe07_ac3_…` | Done (mock) |
| API denial is handled gracefully even when a user manipulates routes | 403/404 notices with a way back; bad ids → 404 page | `test_fe07_ac4_…` | Done (mock) |

### FE-08 #25 — Optional external service (P2)

Not started: BE-10 #24 has no provider chosen. Recommendation: leave unassigned until BE-10 is decided.

### Outside the FE issues (blueprint scope)

Register and Profile screens (`test_b7_profile_…`, `test_fe03_ac4_empty_states` covers registration)
and the System status screen (`test_live_status_…`). No backlog issue exists for them yet.

**Definition of done (issue DoD):** demonstrated on a local instance · reviewed by one teammate ·
tests done · error handling and authorisation reviewed · contract documented (Blueprint §4) ·
issue linked to a merged PR. **Today:** everything except the review, the merged PR and the
"real backend" checkboxes.

## 5. Review — GATE 2

| Check | Result |
|---|---|
| `tsc --noEmit && vite build` (live and mock), in Docker | pass — 2026-11-15 |
| Live bundle free of mock code and demo password | pass — 2026-11-15 |
| nginx config test with the WebSocket location (`nginx -t`) | pass — 2026-11-15 |
| `bash test/run-tests.sh all` | **45 passed** (10 smoke, 35 acceptance) — 2026-11-15, plus a second acceptance run (35/35) to check stability. Run by Claude Code; to be re-run by Ambroise as evidence |
| Second-person code review | **pending** |

**Ship allowed:** `pending` — needs the reviewer's `yes`. Only a critical finding blocks.

## 6. Ship

1. Agree **SH-01 #4** with a backend representative using Blueprint §4 (contract v0.2).
2. Open a PR from `feat/b7-front-end-screens` to the group repo with `src/frontend/`, `test/`
   and `Closes #7`… only for issues whose "real backend" checkbox is satisfied; otherwise
   `Refs #7, #10, #12, #14, #16, #18`.
3. When each BE issue lands, run `bash test/run-tests.sh` + a manual two-browser check on the
   live stack, then tick the remaining checkbox.

## 7. Known limits (honest list)

- Until the BE issues ship, the live stack shows only *Status* and *Sign in*; every other screen
  works in the mock build only.
- The mock's rules are a **specification**, not protection: they run in the browser.
- The mock cannot show a real network reconnect; FE-04 AC3 is tested as "leave and come back"
  (socket closed and reopened, REST catch-up). The real back-off path is checked manually on BE-06.
- No organisation-membership screen (adding users to an organisation) — not in any FE issue.
