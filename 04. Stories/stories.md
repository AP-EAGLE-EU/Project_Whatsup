# Story Backlog — WhatsUp Coursework

One story = one branch (`feature/<id>`) = one PR. Copy `_Template/` to create a story.
Status: `to-plan` → `in-progress` → `in-review` → `shipped`.

**Short track:** complexity-1 stories fuse Research + Plan into one pass (all gates kept).
**Escalate to full track** if: schema migration, new screen, authorisation change, API
contract change, or a new dependency appears mid-story.

## Build phase (B) — one story per member

| ID | Story | Complexity | Feeds | Owner (role) | Depends on | Status |
|----|-------|-----------|-------|--------------|------------|--------|
| B1 | Skeleton & authentication — Flask scaffold, User model, register/login/logout, session cookie | 3 | App | App build lead | — | to-plan |
| B2 | Channels & messaging — channel list/create, post & read messages, chat UI | 3 | App | Developer 2 | B1 | to-plan |
| B3 | Profiles & avatar upload — profile page, display name, upload & serve avatars | 2 | App | Developer 3 | B1 | to-plan |
| B4 | Deployment — Docker, nginx, self-signed TLS, seed script, run instructions | 3 | Artefact 1 | DevOps | B1 (TLS part parallel) | to-plan |
| B5 | Design system & docs infrastructure — apply tokens/components, report skeletons, IEEE reference list | 2 | Artefacts 1–3 | Documentation lead | B1 | to-plan |
| B6 | PRD freeze, QA acceptance checklist, initial recon notes | 2 | Artefact 1 | Project manager | continuous | to-plan |

## Assessment phase (A) — 70% of the marks; run in pairs (executor + reviewer)

| ID | Story | Complexity | Feeds | Owner | Status |
|----|-------|-----------|-------|-------|--------|
| A1 | STRIDE threat model over the architecture | 4 | Artefact 2 | Ambroise (cyber referent) | to-plan |
| A2 | Authentication & session testing | 2 | Artefact 3 | pair: TBD | to-plan |
| A3 | Unauthenticated API access testing | 2 | Artefact 3 | pair: TBD | to-plan |
| A4 | Input validation / XSS probe | 2 | Artefact 3 | pair: TBD | to-plan |
| A5 | HTTP security headers + SSL/TLS | 1 (short track) | Artefact 3 | pair: TBD | to-plan |
| A6 | OWASP Top 10 sweep + risk register consolidation | 3 | Artefacts 2 & 3 | Ambroise + pair | to-plan |

Assessment stories start once B4 has the app deployed. Evidence is filed in the story's
`evidence/` folder the same day it is captured — never reconstructed later.
