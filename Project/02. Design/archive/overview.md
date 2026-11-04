# What's Up Teams — Cybersecurity Project Overview

**Project theme:** Secure corporate messaging | **Brand colour:** `#E36E04` | **Mascot:** Pikachu (security companion)

## Application overview

What's Up Teams is a corporate communication platform built around a growing challenge: keeping sensitive business conversations secure in an increasingly connected workplace. Designed for organisations such as financial firms, legal practices and cybersecurity consultancies, where confidential information is exchanged daily, the platform aims to provide a trusted space for internal communication. Inspired by the early days of internet chat rooms, What's Up Teams brings a retro identity to modern corporate communication, with Pikachu serving as its playful security mascot. The aim of this project to explore how organisations can protect their communications against unauthorised access, insider threats and data breaches.

## Primary security scenarios

1. **Unauthorised message access:** A user attempts to read messages from private chats or groups they do not belong to.
2. **Cross-organisation data leakage:** A user from one company manipulates API requests to access another company's conversations, users or files.
3. **Malicious attachment upload:** An attacker attempts to upload unsafe, disguised or unauthorised files and exploit file download/access controls.
4. **Account compromise and session abuse:** An attacker attempts credential stuffing, brute force or misuse of stolen sessions.
5. **Privilege escalation:** An employee tries to gain administrator permissions or access restricted user-management and audit functions.

## MVP functionality and target users

- **Employees:** Sign in, exchange direct/group messages, upload and download permitted attachments, mark attachments confidential or non-confidential, and report suspicious content.
- **Group managers:** Manage group membership within their assigned permissions.
- **Organisation IT administrators:** Manage users and roles, configure organisation membership, and review security audit events.
- **Core protection:** TLS/HTTPS, modern password hashing, server-enforced RBAC and tenant isolation, input/file validation, rate limiting, protected file storage and audit logging.
- **Interface:** Retro web chat room with responsive React screens for login, chat and administration, accented in `#E36E04` and featuring the Pikachu mascot.

## Architecture and implementation approach

**React web UI → FastAPI backend (REST + WebSockets) → MySQL database**, with protected attachment storage. 

A modular monolith (auth, organisations, messaging, files and audit modules) instead of deploying separate microservices. Use Docker Compose scaffold for development. 

Work through **pair programming on end-to-end features** connecting UI, backend logic, database and security tests. Design with mobile use in mind.

## Sprint 1 deliverables

- **One-page scope document:** Problem, target users, five security scenarios, objectives, MVP boundaries, architecture and measurable acceptance criteria.
- **Two-page threat model:** Page 1 — assets, actors, data-flow diagram, entry points and trust boundaries. Page 2 — STRIDE threats, risk ranking, mitigations and mapped tests.
- **Supporting design:** Login/chat/admin wireframes, draft entities and API endpoints, prioritised backlog and feature-based security testing checklist.

## Sprint 1 completion checklist

- [ ] Confirm project objective, target organisations and user roles.
- [ ] Agree MVP functionality, out-of-scope features and success criteria.
- [ ] Create and approve the one-page scope document.
- [ ] Draw system data flows and trust boundaries.
- [ ] Document and rank all five security scenarios using STRIDE.
- [ ] Define at least one mitigation and test for each scenario.
- [ ] Sketch login, chat and admin wireframes.
- [ ] Define core database entities and API boundaries.
- [ ] Assign pair-programming responsibilities and set up the repository/backlog.
- [ ] Review and approve the two-page threat model and test checklist.

**Testing approach:** Use OWASP Web Security Testing Guide and relevant NIST guidance; assess authorised project environments through reconnaissance, enumeration, targeted testing, remediation and retesting. Keep evidence of findings and fixes.
