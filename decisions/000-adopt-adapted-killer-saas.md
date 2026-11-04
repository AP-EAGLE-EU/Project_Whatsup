# ADR 000 — Adopt an adapted killer-saas method for the coursework

- **Date:** 2026-10-24
- **Status:** Proposed (becomes Accepted if the group agrees)

## Context

Six-person team, one group submission (Scoping 15 / Threat Model 35 / Assessment Report
35) plus individual Reflections, deadline 05/01/2027. We need a lightweight, visible way
to coordinate without meetings for every detail.

## Decision

We run the coursework on a story pipeline adapted from killer-saas [1]: PRD → stories →
architecture, then per story Research → Design → Plan → Execute → Review → Ship, with two
gates (no execution without `validated: yes`; no merge without `Ship allowed: yes`),
one branch per story, markdown files as the shared state, and decisions recorded as ADRs.
AI assistance is permitted but manual execution and evidence capture are always human.

## Consequences

- Anyone can check project state from `stories.md` and story files — no status meetings.
- The method produces assessment evidence as a by-product of working.
- Small overhead per story (~1 page of markdown); accepted for traceability.

## Reference

[1] M. Codeur, *killer-saas — method documentation*, GitHub, 2026. [Online]. Available:
https://github.com/MikeCodeur/killer-saas/blob/main/DOC.md
