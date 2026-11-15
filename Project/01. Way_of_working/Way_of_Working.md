# What's Up Teams | Way of Working — v2 (simplified)

- **Date:** 2026-11-04
- **Status:** Adopted for the personal workshop — group ratification pending
- **Replaces:** v1 proposal of 24 Oct 2026; the ADR folder is folded into §8

## 1. What we are marked on

| # | Artefact                                                                                                                         | Marks | Type       |
|---|----------------------------------------------------------------------------------------------------------------------------------|-------|------------|
| 1 | Scoping Document (app info, architecture, deployment evidence, recon)                                                            | 15    | Group      |
| 2 | Threat Model (STRIDE/PASTA, attack surface, risk matrix, testing plan, risk register)                                            | 35    | Group      |
| 3 | Basic Security Assessment Report (auth/session, API access, XSS, headers, TLS, OWASP Top 10, CVSS scores, evidence, remediation) | 35    | Group      |
| 4 | Reflection (personal contribution + appraisal of the group)                                                                      | 15    | Individual |

70 of the 100 marks sit on the **security analysis**, not on the app itself. The app needs to be up and running locally, and be worth attacking.

## 2. The method, simplified

Story-based pipeline adapted from killer-saas [1]. Six steps, two mechanical gates, no exceptions.

**Per story:** `Research → Design → Plan → Execute → Review → Ship`, with the two gates kept verbatim:

- No execution without a validated plan: the plan must be marked `validated: yes` before anyone writes code or runs a test.
- No ship without review: a second pair of eyes marks `Ship allowed: yes`; only a critical finding blocks the merge.

| Rule             | Detail                                                                       |
|------------------|------------------------------------------------------------------------------|
| Unit of work     | One story = one branch = one PR; squash-merge with at least one reviewer     |
| A stories        | Run in pairs — executor + reviewer; the review gate doubles as cross-checking |
| Short track      | Complexity-1 stories fuse Research + Plan; both gates stay                   |
| Evidence         | Same-day, timestamped capture, filed in the story's `evidence/` folder, never reconstructed later |

## 3. The story list

Status lifecycle: `to-plan → in-progress → in-review → shipped`. **Assessment stories start once B4 has the app deployed.**

### Build phase (B) — one story per member

Since 2026-11-15 the **group's GitHub backlog** (`jackoturner/WhatsUpTeam_Coursework` issues,
Kanban board) is the source of truth for sprint work. Each B story lists the backlog issues it
delivers; progress is reported on the issues themselves.

| ID | Story | Group backlog (GitHub) | Complexity | Feeds | Owner | Depends | Status |
|----|-------|------------------------|------------|-------|-------|---------|--------|
| B0 | Back-office scaffold (FastAPI MVC + MySQL + Docker) — retro in `04. Stories/B0-back-office-scaffold-retro.md` | BE-01 #2 · FE-01 #3 (closed) | 2 | Artefact 1 | Productivity-Square / Evan-Balson | — | shipped (PR #27, 2026-11-10) |
| — | API contract, entities, conventions (draft = Blueprint §4, contract v0.2) | SH-01 #4 | 2 | — | front + back representatives | — | draft ready, agreement pending |
| B1 | Schema, authentication & organisation isolation API | BE-02 #5 · BE-03 #6 · BE-04 #8 | 3 | — | TBD | B0, SH-01 | to-plan |
| B2 | Conversations, live delivery (WebSocket) & attachments API (UI done in B7) | BE-05 #9 · BE-06 #11 · BE-07 #13 | 3 | — | TBD | B1 | to-plan |
| B3 | Group membership, admin & audit/reporting API (UI done in B7) | BE-08 #15 · BE-09 #17 | 2 | — | TBD | B1 | to-plan |
| B7 | Front-end screens + integration, contract-first with a mock build, smoke & acceptance tests — `04. Stories/B7-front-end-screens.md` | FE-02 #7 · FE-03 #10 · FE-04 #12 · FE-05 #14 · FE-06 #16 · FE-07 #18 | 3 | Artefacts 1 & 3 | Ambroise | B0 | in-review (mock done; waits for BE issues) |
| B4 | Deployment — Docker, nginx, self-signed TLS, seed script, run instructions | SH-05 #22 | 3 | Artefact 1 | TBD | — | to-plan |
| B5 | Design system & docs infrastructure — tokens/components, report skeletons, IEEE reference list | — | 2 | — | TBD | — | to-plan |
| B6 | PRD freeze, QA acceptance checklist, initial recon notes | SH-02 #19 · SH-04 #21 · SH-06 #23 | 2 | — | TBD | — | to-plan |
| — | Optional external service | BE-10 #24 · FE-08 #25 (P2) | — | — | — | — | not started (no provider chosen) |

### Assessment phase (A) — 70% of the marks, run in pairs

| ID | Story                                                    | Complexity        | Feeds           | Owner                    | Depends | Status   |
|----|----------------------------------------------------------|-------------------|-----------------|--------------------------|---------|----------|
| A1 | STRIDE threat model over the architecture                | 4                 | Artefact 2      | Ambroise (cyber referent)| B4      | to-plan  |
| A2 | Authentication & session testing                         | 2                 | Artefact 3      | pair TBD                 | B4      | to-plan  |
| A3 | Unauthenticated API access testing                       | 2                 | Artefact 3      | pair TBD                 | B4      | to-plan  |
| A4 | Input validation / XSS probe                             | 2                 | Artefact 3      | pair TBD                 | B4      | to-plan  |
| A5 | HTTP security headers + SSL/TLS                          | 1 (short track)   | Artefact 3      | pair TBD                 | B4      | to-plan  |
| A6 | OWASP Top 10 sweep + risk register consolidation         | 3                 | Artefacts 2 & 3 | Ambroise + pair          | A2–A5   | to-plan  |

Evidence is filed in the story's `evidence/` folder the same day, never reconstructed later. A5 runs the short track of §2.

## 4. Repository layout (simplified 2026-11-04)

```
/                       # application code + installation (adopted WhatsUpTeam scaffold)
  src/                  # application source
  infrastructure/       # nginx + deployment configuration
  compose.yaml          # Docker Compose stack
  package.json          # dependencies + run scripts
  scripts/              # install / seed / run helpers
  test/                 # smoke + acceptance suites (pytest + Playwright, run in Docker) — added 2026-11-15
  .env.example          # environment template — no secrets committed
  .agents/              # rules & skills (+ .claude/skills mirror)
  CLAUDE.md AGENTS.md   # agent instructions
  README.md AI_USE.md   # repo guide + AI declaration log
Project/                # coursework documentation only
  00. Brief/            # Coursework_Brief.pdf
  01. Way_of_working/   # this file + weekly reports (Weekly_W01.md, Weekly_W02.md, …)
  02. Design/           # blueprint.md — merged: overview, scoping, architecture, design system · archive/ (retired sources)
  03. Frameworks/       # owasp-security-baseline.md + OWASP_Testing_Guide_v4.pdf + caf-4.0-baseline.md + NCSC CAF 4.0 PDF
  04. Stories/          # security-requirements.md + Ethical-Hacking-scenario.md + story files (B0 retro, B7 front)
  05. Deliverables/     # Scoping-document.md · Threat-model.md · Security-assessment-report.md · Reflection.md
```

Retired with this restructure: `000-adopt-adapted-killer-saas.md` (folded into this file, §2 and §8); `PRD.md`, `overview.md`, `architecture.md`, `design-system.md` archived in `02. Design/archive/` — their content lives on in `02. Design/blueprint.md`.

## 5. Tools & conventions

- **GitHub group repo** (`WhatsUp_Coursework`) for all shared work; this personal repo never duplicates group app code except as sandbox.
- **Docker workstation** for the local instance — the brief wants deployment evidence.
- **IEEE referencing** for every citation in the artefacts.

## 6. Use of AI

Full log in `AI_USE.md` at the repo root. Policy in one line: **AI assists planning and code; humans execute tests and capture evidence.** Commits made with AI assistance carry `Co-Authored-By`.

## 7. Timeline to 05 Jan 2027 (≈10 weeks)

| When                 | Milestone                                                                        | State    |
|----------------------|----------------------------------------------------------------------------------|----------|
| Week 1 (by 31 Oct)   | Method drafted (v1 proposal)                                                     | done     |
| Week 2 — current     | Stack adopted + OWASP baseline + restructure (this v2)                           | current  |
| Weeks 2–3            | B1–B4: app built and deployed locally (Scoping Document largely done)            | planned  |
| Weeks 4–5            | A1 STRIDE threat model complete                                                  | planned  |
| Weeks 5–8            | A2–A6 assessment stories                                                         | planned  |
| Week 9               | Consolidation: reports assembled, CVSS review, referencing                       | planned  |
| Week 10 (by 05 Jan)  | Buffer, proofread, PDFs, submit on Moodle                                        | planned  |

## 8. Decision log

Replaces the old ADR folder. Dated bullets:

- **2026-10-24** — Method proposed: killer-saas adaptation (story pipeline + two gates).
- **2026-11-04** — Team dev model adopted (React/FastAPI/MySQL) — challenged via the OWASP requirements (`04. Stories/security-requirements.md`).
- **2026-11-04** — OWASP ASVS/WSTG baseline adopted (see `03. Frameworks/`).
- **2026-11-04** — Simplified folder structure (§4 above).
- **2026-11-10** — Back-office scaffold merged in the group repo (PR #27, commit `0e5302d`); retro-documented as story B0 on 2026-11-15.
- **2026-11-15** — Front built **contract-first** (story B7): API contract v0.1 in the Blueprint §4, a mock build for demos and acceptance tests, no change to the group's back-office code. B1–B3 now cover the API only.
- **2026-11-15** — The group's **GitHub backlog** becomes the source of truth for sprint work; B stories map to the backlog IDs (table §3). Contract upgraded to **v0.2** as the draft for SH-01 #4: "conversations" (direct + group) replace "channels", plus members, directory, reports and WebSocket conventions. New SR-WS group; EH-17 added; the EH table is the plan for SH-03 #20.
- **2026-11-15** — NCSC **CAF 4.0** added as the organisational assurance lens (`03. Frameworks/caf-4.0-baseline.md`); new SR-FE group for the front — *proposal, group agreement pending*.
- **2026-11-15** — Smoke + acceptance tests live in `/test` and run in Docker (Playwright image), because the team removed browser tooling from the front package (commit `53b3f07`).

## 9. Method source

[1] M. Codeur, *killer-saas DOC.md*, GitHub, 2026. [Online]. Available: https://github.com/MikeCodeur/killer-saas/blob/main/DOC.md
