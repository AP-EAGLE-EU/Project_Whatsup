# AI Use Log — WhatsUp Coursework

**Tool:** Claude Code (Anthropic), via VS Code extension
**Policy:** the module brief (CMP-X306) permits AI use if acknowledged and outputs are
cited (IEEE style). "Testing only using AI" is prohibited — AI is used as part of a
manual methodology only.

**In practice:**

| Activity | AI allowed? |
|---|---|
| Writing the application code | ✅ Yes — declared (commit trailer + this log + IEEE citation where it lands in the submission) |
| Preparing tests (plans, helper scripts, explaining how a tool works, cross-checking interpretation) | ✅ Yes — same declaration |
| Executing the tests (Burp, curl, browser, scanner) | ❌ No — human hands on keyboard, always |
| Capturing evidence (timestamped screenshots, terminal output) | ❌ No — a team member's own screen, a team member's screenshot |
| Judging findings & CVSS scores | Ours — AI may be a sounding board, never the assessor |
| Individual Reflections | ❌ No ghostwriting — AI may review it, not write it |

Commits created with AI assistance carry `Co-Authored-By: Claude Code
<noreply@anthropic.com>` in the commit message, visible in `git log`.

## Log

| Date | Task | AI contribution | My verification / changes |
|---|---|---|---|
| 2026-10-24 | Read coursework brief, analysed AI policy | Extracted and summarised brief text (PDF → text) | Read the original PDF; confirmed summary against it |
| 2026-10-24 | Workshop folder structure + README | Proposed structure and drafted README | Reviewed; aligned folder names with my usual method |
| 2026-10-24 | Note de cadrage for the group | Drafted the full note | Reviewed every section; to be amended after group discussion |
| 2026-10-24 | Aligned method & structure with killer-saas (user's own method) | Summarised killer-saas DOC.md; rewrote note, story template, stories.md, ADR 000 | Checked adaptation keeps gates and manual-execution rule required by the brief |
| 2026-10-24 | Renamed framing note → `Way_of_Working.md`; drafted PRD, architecture, design system, 12-story breakdown (B/A) | Proposed the WhatsUp chat app, Flask/SQLite/nginx stack, story split and owners | Cross-checked against the brief: all six assessed test areas are covered by the app's surface; group acceptance pending (ADR 001) |

<!--
Add one row per working session. If an output ends up in a submitted artefact,
also cite it in IEEE style in that artefact, e.g.:
Anthropic (2026) Claude Code [AI assistant]. Prompt: "...". Accessed: 24 Oct 2026.
-->
