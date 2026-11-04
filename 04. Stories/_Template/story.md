# S__ — <Title>

- **Complexity (1–5):** __ · **Short track** (complexity 1): fuse Research + Plan
- **Feeds artefact:** <1 Scoping / 2 Threat Model / 3 Assessment / —>
- **Owner:** ____ · **Branch:** `feature/S__-<slug>`
- **Status:** research / design / plan / execute / review / shipped

---

## Research
What is actually real: current code state, exact APIs/tools, OWASP WSTG sections, lab
material. Re-score complexity here if the story turned out bigger or smaller than planned.

## Design
Approach and test cases (UI work derives from the design system).

## Plan
Ordered, small, verifiable tasks.

> **GATE 1 — validated: yes** (no execution without this; set by the story owner after design review)

## Execute
What was run: commands, raw output, observations. Timestamped screenshots go in
`evidence/` the same day — never reconstructed later.

## Review
Fresh pair of eyes (not the owner): findings pass/partial/fail, CVSS scores
(https://www.first.org/cvss/calculator/3-1), quality of evidence.

> **GATE 2 — Ship allowed: yes / no** (only a critical finding blocks)

## Ship
Squash-merge the PR; update the report section this story feeds; move the story to
`shipped` in `stories.md`.

**Definition of done:** evidence filed and dated · findings scored · report section
updated · PR reviewed by someone else and merged.
