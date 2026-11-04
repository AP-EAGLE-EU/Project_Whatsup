# OWASP Security Baseline — requirements and assessment method

- **Date:** 2026-11-04
- **Status:** Adopted 2026-11-04 — recorded in the decision log, `../01. Way_of_working/Way_of_Working.md` §8

## Context

70% of the marks sit on the Threat Model (Artefact 2) and the Assessment Report
(Artefact 3), which the brief wants evidenced, CVSS-scored and referenced. The assessment
stories (A1–A6) need a shared **oracle**: without agreed requirements, "vulnerable" is an
opinion. The tutor's four-question framing requires an explicit answer to *"what are we
going to do about it?"* before testing starts.

## Decision

1. Security requirements are derived from **OWASP ASVS v4.0.3** at chapter level, scoped
   to the app's real surface, and recorded in `../04. Stories/security-requirements.md`.
2. The ethical hacking engagement follows **OWASP WSTG v4.2** categories, mapped to the
   **OWASP Top 10:2021** and scored with **CVSS 3.1**, per
   `../04. Stories/Ethical-Hacking-scenario.md`.
3. A test that violates an SR is a finding (scored, remediated, retested); a test that an
   app repels is confirmed evidence of a control. Both are kept.
4. The requirements are stack-agnostic: they bind the adopted team stack
   (React + FastAPI + MySQL — decision log §8) and extend with it: story A1 adds SRs for
   WebSockets, organisation isolation and audit integrity.

## Consequences

- Every A story tests against named SRs — no debate about severity opinions at review time.
- Findings and remediation trace SR → EH → evidence → CVSS, which is exactly the Artefact 3
  structure, so the report writes itself from the evidence folders.
- Cost: the pair executing each story pins exact ASVS/WSTG clauses during Research.
- Requirements may grow if the app grows; changes go through the decision log in
  `../01. Way_of_working/Way_of_Working.md` §8.

## Reference

[1] OWASP Foundation, *OWASP Application Security Verification Standard v4.0.3*, 2023.
[Online]. Available: https://owasp.org/www-project-application-security-verification-standard/
