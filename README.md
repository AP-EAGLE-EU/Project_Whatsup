# WhatsUp Coursework — Working Folder (Ambroise)

My personal workshop for the WhatsUp coursework. Application code and shared team work
live in the **group repo** (`vscode\WhatsUp_Coursework` on GitHub) — never duplicated
here. This folder holds documents, research, drafts and my individual work.

Method: adapted from [killer-saas](https://github.com/MikeCodeur/killer-saas/blob/main/DOC.md)
— simplified. **The files are the state.**

## Structure

| Folder | Purpose |
|---|---|
| `00. Admin/` | Brief copies, meeting notes, group decisions — and `decisions/` (numbered ADRs) |
| `01. Product/` | `Way_of_Working.md` (the framing note) + `PRD.md` (app blueprint) |
| `02. Architecture/` | `architecture.md` — stack, components, data model, deployment, attack surface preview |
| `03. Design-system/` | `design-system.md` — deliberately one page: tokens, 4 components, 5 screens |
| `04. Stories/` | `stories.md` = the backlog (B1–B6 build, A1–A6 assessment). One folder per story: `story.md` + `evidence/`. `_Template/` is the skeleton to copy |
| `05. Deliverables/` | The four graded artefacts, assembled as they mature |

## Story lifecycle

Copy `_Template/`, rename to the story ID, and work through the sections of `story.md`:
`Research → Design → Plan → Execute → Review → Ship`.

Two gates, straight from the method:

1. **No execution without a validated plan** (`validated: yes` in the Plan section)
2. **No ship without review** (`Ship allowed: yes` from a second person)

Branch per story (`feature/S03-auth-testing`), one PR, squash-merge.

## Related

- Group repo: https://github.com/jackoturner/WhatsUp_Coursework
- AI use log: [AI_USE.md](AI_USE.md)
- Coursework brief: `..\Coursework_Brief.pdf`
