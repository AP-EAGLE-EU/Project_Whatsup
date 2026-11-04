# WhatsUp — Architecture

**Status:** Proposal — becomes **ADR 001** when the group accepts it.
## Stack decision

| Choice | Why |
|---|---|
| Python 3.11 + Flask | Whole team can read it, runs on everyone's machine, DIY auth gives a realistic (and assessable) security posture |
| SQLite via SQLAlchemy | Zero infrastructure, file-backed, trivially reset for repeatable tests |
| Jinja2 + vanilla JS/CSS | No build step, no Node — evidence screenshots stay clean and reproducible |
| Docker Compose: app + nginx | nginx terminates TLS (self-signed) — required to test headers and TLS; gives the deployment evidence for Artefact 1 |

**Rejected:** Node/React (toolchain overhead, zero mark value) · Django (auth/session too
good out of the box — nothing to assess) · PHP (lower team familiarity).

## Components

```
[ Browser ]
    │  HTTPS :8443 (self-signed)
[ nginx ]        ← TLS termination, static files
    │  HTTP :8000 (internal)
[ Flask app ]    ← routes, sessions, JSON API
    │
[ SQLite file ]  [ uploads/avatars ]
    └── docker volumes ──┘
```

## Data model

- `User(id, username UNIQUE, password_hash, display_name, avatar_path, created_at)`
- `Channel(id, name UNIQUE, created_by -> User)`
- `Message(id, channel_id -> Channel, user_id -> User, body TEXT, created_at)`

## Routes / endpoints

- **HTML:** `GET/POST /register`, `GET/POST /login`, `/logout`, `GET /channels`,
  `GET /channels/<id>`, `GET/POST /profile`
- **JSON API:** `GET/POST /api/channels` · `GET/POST /api/channels/<id>/messages` ·
  `GET /api/users/<id>`
- **Sessions:** Flask server-side session cookie

## Deployment (feeds Artefact 1)

`docker compose up` → app on :8000 (internal), nginx on :8443; volumes for the database
and uploads; a seed script creates two demo users and #general.

## Attack surface preview (input to STRIDE story A1)

| Surface | Trust boundary | Obvious STRIDE candidates |
|---|---|---|
| Login/session cookie | browser ↔ nginx | Spoofing, session hijack |
| `/api/*` endpoints | unauthenticated client ↔ app | Information disclosure, elevation |
| Message body | user input → other users' browsers | Tampering, XSS |
| Avatar upload | user file → server filesystem | Malicious upload, path traversal |
| nginx/TLS config | client ↔ server | Weak ciphers, missing headers |
