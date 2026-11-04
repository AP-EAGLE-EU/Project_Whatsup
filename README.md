# WhatsUp Coursework — Personal Workshop (Ambroise)

Personal workshop for the WhatsUp coursework. Application code and shared team work live in
the **group repo** (https://github.com/jackoturner/WhatsUp_Coursework). This repo carries the
adopted scaffold (binaries + code + installation at the root, per the 2026-11-04 decision),
the OWASP security framework, and the personal/project documentation.

## Structure

| Item | Purpose |
|---|---|
| `src/` · `infrastructure/` · `scripts/` | Adopted WhatsUpTeam scaffold — backend (FastAPI), frontend, MySQL infrastructure, env prep |
| `compose.yaml` · `package.json` · `.env.example` | Docker Compose stack + npm wrappers; `.env.example` is the template for secrets |
| `.agents/` · `CLAUDE.md` · `AGENTS.md` | Team AI rules & skills (mirrored in `.claude/skills/`) |
| `AI_USE.md` | AI use log — one row per session |
| `Project/00. Brief/` | `Coursework_Brief.pdf` |
| `Project/01. Way_of_working/` | `Way_of_Working.md` (method + story list) · `Weekly_W0x.md` |
| `Project/02. Design/` | `blueprint.md` — merged design (overview, scoping, architecture, design system) |
| `Project/03. Frameworks/` | `owasp-security-baseline.md` · `OWASP_Testing_Guide_v4.pdf` |
| `Project/04. Stories/` | `security-requirements.md` (ASVS oracle) · `Ethical-Hacking-scenario.md` |
| `Project/05. Deliverables/` | Four graded artefacts: Scoping (15) · Threat Model (35) · Security Assessment Report (35) · Reflection (15) |

70% of the marks sit on security analysis — the framework and stories feed artefacts 2 and 3.

## Quick start

```bash
cp .env.example .env   # then set the MySQL credentials
npm run dev            # prepares env, builds and starts the compose stack
```

| Command | Does |
|---|---|
| `npm run dev` | `docker compose up --build` (runs `scripts/prepare-env.mjs` first) |
| `npm run stop` | `docker compose down` |
| `npm run logs` | Follow service logs |

Frontend on `127.0.0.1:3000` (`FRONTEND_PORT` overridable); backend health at `/api/health`.

## Method

`Project/01. Way_of_working/Way_of_Working.md` holds the method and the story list.
Two gates, unchanged: **no execution without a validated plan**, and **no ship without review**
(second person). Stories are worked one at a time; evidence lands in the artefacts as it matures.

## Related

- Group repo: https://github.com/jackoturner/WhatsUp_Coursework
- AI use log: [AI_USE.md](AI_USE.md)
- Brief: `Project/00. Brief/Coursework_Brief.pdf`
