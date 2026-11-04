# WhatsUp — Product Blueprint (PRD)

- **Status:** Proposal — frozen by story B6 once the group accepts (then becomes ADR 001)
- **Date:** 2026-10-24 · **Owner:** the group · Drafted by Ambroise with Claude Code (see `AI_USE.md`)

## One-liner

WhatsUp is a simple group-chat web application — a mini messaging app for small teams.

## Why this app

Its attack surface maps one-to-one onto everything the brief assesses:

| Brief test area | WhatsUp surface |
|---|---|
| Authentication & session testing | login, session cookies |
| Unauthenticated API access | `/api/...` JSON endpoints |
| Input validation / XSS probe | chat messages rendered in other users' browsers |
| HTTP security headers & TLS | nginx deployment |
| OWASP Top 10 | all the above + avatar file upload |

## Users & usage

Students in a team. Alice registers, joins **#general**, posts a message; Bob logs in and
reads it. Five minutes to understand — easy to demo, easy to test.

## In scope (the 20% that matters)

- Register / login / logout
- Channels: list, create, join
- Post and read messages per channel (polling — not websockets)
- User profile: display name, avatar upload
- A JSON API alongside the HTML UI (gives clean targets for API testing)
- Docker deployment behind nginx with self-signed TLS

## Out of scope (the graveyard — explicitly dropped)

- Real-time push (websockets/SSE) — polling every few seconds is enough
- Direct messages, notifications, search, emojis, mobile app
- Password reset by email, account deletion
- Any front-end framework or build step (no Node toolchain)
- Scale beyond one container

## Build honest, not buggy

We build it straightforwardly. We do **not** plant vulnerabilities, and we do **not**
pre-fix what we later find — remediation is a graded deliverable of the assessment
report, so findings are gold, not embarrassment.

## Success criteria

1. Two users can chat in a shared channel on the Docker deployment
2. Every assessed test area has something real to test
3. Anyone on the team can run it locally with two commands
