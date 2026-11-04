# WhatsUp — Design System (deliberately one page)

**Principle: readable beats beautiful.** Every screen will end up in a screenshot as
assessment evidence — clean and legible wins marks; decoration wins nothing.

## Tokens

- **Colours:** `--bg #f7f7f8` · `--surface #ffffff` · `--primary #1f6feb` · `--text #1f2328` · `--muted #656d76` · `--danger #cf222e`
- **Type:** system font stack, 16px base, line-height 1.5
- **Spacing:** 4 / 8 / 16 / 32 · radius 8px · border 1px `#d0d7de`

## Components (the only four)

1. **Button** — primary (filled) / ghost / danger
2. **Input** — label + field + inline error
3. **Card** — white surface, 16px padding, used for panels
4. **MessageBubble** — own messages: primary background, right-aligned; others: white, left-aligned

## Screens (five)

Login · Register · Channel list (cards) · Chat view (bubbles + composer) · Profile
(card + avatar)

No dark mode, no animations, no icon library. **If it isn't on this page, it doesn't
exist** — additions need a one-line entry here first (that rule is what keeps this one
page long).