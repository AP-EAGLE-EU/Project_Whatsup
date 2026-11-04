# WhatsUp Coursework | Weekly Status Report

| Field | Detail |
|:------|:-------|
| **Week** | 2 of 10 (final submission on Moodle: 05 Jan 2027) |
| **Date sent** | 04 Nov 2026 |
| **Prepared by** | Ambroise PETIN, on behalf of the group |
| **GitHub** | https://github.com/jackoturner/WhatsUp_Coursework (group)<br>https://github.com/AP-EAGLE-EU/Project_Whatsup (personal workshop) |
| **Sent to (Sponsor)** | [To complete] |

## Weekly status

| Item | Status |
|:-----|:-------|
| **Overall Status Grade** | 🟢 **Green** |
| **Comments on Status Grade** | None |
| **Group Corrective Action Required** | None |
| **Sponsor Corrective Action Required** | None |
| **Accomplishments Last Week** | • Team app scaffold reviewed and adopted as the dev model (React + FastAPI + MySQL, Docker Compose, modular monolith)<br>• Dev organisation settled: front/back split — React/TS UI (`src/frontend`), FastAPI API (`src/backend`), MySQL (`infrastructure`), one Docker Compose stack<br>• OWASP baseline drafted: 37 security requirements (ASVS-mapped) + 16-scenario ethical hacking plan (WSTG-mapped), with CVSS workflow<br>• Personal workshop restructured (code + installation at root, simplified Project/ tree)<br>• Way of Working v2 (simplified)<br>• Design docs merged into one Blueprint |
| **Action Items for This Week** | • Group ratification of Way of Working v2 + stack decision<br>• B1 skeleton and authentication started<br>• A1 STRIDE threat model preparation (attack surface from the Blueprint) |
| **Action Items for Next Week** | • B1-B2 progress<br>• A1 STRIDE session on the deployed app once B4 lands<br>• First evidence captures filed same-day |

## Project organisation (simplified 2026-11-04)

One rule: **code + installation at the root, coursework documentation under `Project/`.**

| Where | What |
|---|---|
| `src/frontend/` | React + TypeScript UI (screens, features, services) — the only container the browser talks to (`127.0.0.1:3000`) |
| `src/backend/` | FastAPI API in an MVC layout (controllers, models, views) — all application logic lives here |
| `infrastructure/` | MySQL image + init scripts — internal Docker network only, never exposed to the host |
| `compose.yaml` | One command runs it all (`npm run dev`); the frontend's nginx proxies `/api/` to the backend, so front and back share one origin |
| `Project/00–05` | 00 Brief · 01 Way of working (this report) · 02 Design (blueprint) · 03 Frameworks (OWASP) · 04 Stories (requirements + scenario) · 05 Deliverables |

Front/back flow for dev: browser → frontend container (nginx: static UI + `/api/` reverse
proxy) → FastAPI backend → MySQL. There is no direct browser-to-database path. Retired
design docs stay in `Project/02. Design/archive/`.

## Grade key

| Grade | Meaning |
|:------|:--------|
| 🟢 **Green** | On track. No sponsor action needed. |
| 🟠 **Amber** | At risk. The group has a recovery plan and informs the sponsor. |
| 🔴 **Red** | Off track. Sponsor action needed to protect the deadline. |
