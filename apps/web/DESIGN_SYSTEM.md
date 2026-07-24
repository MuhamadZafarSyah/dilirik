# Scrapbook Design System

A reusable, hand-crafted **paper scrapbook** design system for any web project — not tied to a single site. Drop the tokens, textures, and patterns below into any app to get the same warm, tactile look and feel.

**Recommended stack:** Next.js · React · TypeScript · Tailwind CSS · Framer Motion · Lenis (smooth scroll) · react-icons (Liveblocks optional, only for realtime multiplayer cursors).

This document is the single source of truth for the visual language, tokens, components, motion, and interaction patterns of the system. Tokens live in `tailwind.config.ts`, global styles and utility classes in your global CSS (e.g. `globals.css`), font wiring in your root layout, and component patterns in your components directory.

---

## 1. Design Concept

A warm, hand-crafted **paper scrapbook / cutting-board** aesthetic. The interface behaves like a physical desk: photos taped down as polaroids, sticky notes, washi tape, hand-written captions, and draggable, tossable cards. It intentionally trades corporate minimalism for **tactility, warmth, and personality**, while staying fast and accessible.

**Design principles**

1. **Tactile over flat** — every surface reads like real paper (grain texture, soft warm shadows, slight rotations).
2. **Hand-made warmth** — hand-written display fonts and doodles carry the personality; body copy stays highly legible.
3. **Playful but performant** — motion and realtime multiplayer are delightful, never at the cost of readability or speed.
4. **Off-grid, on purpose** — small rotations (`-5°` to `+4°`), tape, and pins break the grid to feel human.
5. **Accessible by default** — honors `prefers-reduced-motion`, semantic color contrast, keyboard-friendly nav.

---

## 2. Color Tokens

Defined in `tailwind.config.ts` → `theme.extend.colors`. Use the Tailwind token names (e.g. `bg-paper`, `text-ink`), never raw hex in components.

| Token | Hex | Role |
|-------|------|------|
| `paper` | `#f2e8d5` | App background — warm aged paper. Also `--paper` CSS var. |
| `panel` | `#fbf6ea` | Raised surfaces: cards, polaroids, nav pill, sticky forms. Lighter than paper so surfaces “lift”. |
| `ink` | `#2a241d` | Primary text & strong fills (logo chip, primary buttons). Also `--ink` CSS var. |
| `muted` | `#7a6f5e` | Secondary text, captions, metadata, labels. |
| `line` | `#d8c9ad` | Borders, hairlines, polaroid edge, grid lines. |
| `red` | `#df513b` | Primary accent — pins, tape-red, dot in logo, active/alert. |
| `yellow` | `#f5c84b` | Warm accent — washi tape default, sticky notes, stars. |
| `blue` | `#3f6fb0` | Cool accent — tape-blue, hints, links. |
| `green` | `#5d8a4e` | Success / tertiary accent. |

**Semantic usage**

- Text on `paper`/`panel`: `text-ink` (primary), `text-muted` (secondary). Do not put `ink` text below ~70% opacity for body copy.
- Primary action: `bg-ink text-panel`. Secondary action: `bg-paper text-ink border border-ink/20`.
- Accent rotation for tape/pins keeps the collage lively: red → default(yellow) → blue.
- Opacity modifiers are common: `bg-panel/80` (nav on scroll), `text-ink/70` (card blurb), `border-ink/15`.

**Realtime cursor palette** (multiplayer, assigned by `connectionId % length`):
`#df513b`, `#3f6fb0`, `#5d8a4e`, `#e0992b`, `#9b5de5`, `#e07a5f`, `#2a9d8f`, `#c84b7d`.

---

## 3. Typography

Three Google fonts loaded via `next/font/google` in `layout.tsx`, exposed as CSS variables and mapped in Tailwind `fontFamily`.

| Family | Tailwind | CSS var | Font | Weight | Use |
|--------|----------|---------|------|--------|-----|
| Sans (body) | `font-sans` (default) | `--font-inter` | **Inter** | variable | All body copy, UI text, paragraphs, buttons. The readable baseline. |
| Hand (display) | `font-hand` / `.hand` | `--font-gochi` | **Gochi Hand** | 400 | Big headings, logo, section titles. Bold marker feel. |
| Scrawl (accent) | `font-scrawl` / `.scrawl` | `--font-caveat` | **Caveat** | variable | Labels, captions, hints, project titles, hand-written asides. |

`display: "swap"` on all three; `-webkit-font-smoothing: antialiased` globally.

**Type scale & patterns (as used in components)**

| Role | Classes | Notes |
|------|---------|-------|
| Hero / section H2 | `hand text-5xl leading-none sm:text-6xl` | Gochi Hand, tight leading. |
| Section eyebrow / label | `.label` = `font-scrawl text-xl text-muted` | Caveat, muted. |
| Project title (card) | `scrawl text-2xl leading-tight text-ink` | Caveat. |
| Card metadata | `text-xs text-muted` | tag · year. |
| Card blurb | `text-xs leading-snug text-ink/70` (desktop) / `text-sm` (mobile) | |
| Hint / aside | `scrawl text-2xl text-blue` | Playful cue near controls. |
| Tech chip | `text-[0.65rem]` (xs) / `text-[0.7rem]` (sm), `text-muted` | With brand icon. |

**Special text utility**

- `.text-stroke` — outlined text: `-webkit-text-stroke: 2px var(--ink); color: transparent;` for oversized decorative headings.

**Rules**

- Never set body/paragraph copy in `hand` or `scrawl` — display fonts are for headings, labels, and short accents only.
- Middle dot `·` separates metadata (tag · year). Keep real Unicode glyphs in JSX text.

---

## 4. Layout & Spacing

- **Container:** `.shell` = `mx-auto w-full max-w-shell px-5 sm:px-8`. `max-w-shell` = **1200px**.
- **Section rhythm:** sections use `py-24` (e.g. Work). Headers inside use `mb-6`.
- **Breakpoints:** Tailwind defaults + custom **`xs: 480px`**. Common pattern: single column on mobile, `sm:` unlocks the desktop “board” / multiplayer / shuffle affordances.
- **Desktop collage board (Work):** `relative h-[840px] overflow-hidden rounded-[20px] border border-line bg-panel/50 shadow-paper`, only shown `sm:block`.
- **Grid fallback (mobile Work):** `grid grid-cols-1 gap-7 xs:grid-cols-2`.

**Radius scale**

| Value | Where |
|-------|-------|
| `rounded-full` | Nav pill, chips, buttons, pins. |
| `rounded-[14px]` | `.card`. |
| `rounded-[20px]` | Collage board. |
| `rounded-md` | Logo chip. |
| `rounded-sm` | Sticky note (guestbook). |

---

## 5. Elevation (Shadows)

Defined in `tailwind.config.ts` → `boxShadow`. Warm, ink-tinted, soft — never neutral gray.

| Token | Value | Use |
|-------|-------|-----|
| `shadow-paper` | `0 10px 24px -12px rgba(42,36,29,0.35)` | Default resting elevation for cards, polaroids, nav, chips. |
| `shadow-lift` | `0 18px 40px -16px rgba(42,36,29,0.45)` | Hover / dragging / focused — the element lifts off the page. |

Elevation ladder: flat paper → `shadow-paper` (resting surface) → `shadow-lift` (interactive/active). Dragged cards also scale (`scale: 1.05`) and jump `z-index`.

---

## 6. Texture & Surface Treatments

These are the signature scrapbook details (from `globals.css`).

### 6.1 Paper grain (`.paper-texture`)
Applied to `<body>`. Layered radial highlights (white bloom, faint red & blue tints) + an inline SVG `feTurbulence` fractal-noise grain at `opacity 0.04`. Gives every screen a subtle aged-paper feel.

### 6.2 Polaroid (`.polaroid`)
`bg-panel p-3 pb-12 shadow-paper` + `1px solid rgba(216,201,173,0.8)` border. The extra bottom padding (`pb-12`) is the classic polaroid caption strip.

### 6.3 Card (`.card`)
`rounded-[14px] border border-line bg-panel shadow-paper` — the neutral raised surface.

### 6.4 Sticky note (`.sticky`)
`p-5 shadow-paper` with a yellow gradient `linear-gradient(180deg, #ffe98f, #f6d96b)`. Guestbook notes can override background color inline for per-note colors (`COLORS = ["#f5c84b", "#cfe0f3", "#d8e8cf", "#f3cfc7", "#fbf6ea"]`).

### 6.5 Washi tape (`.tape`, `.tape-blue`, `.tape-red`)
A `::before` pseudo-strip pinned to the top-center of a `relative` element: `92×26px`, rotated `-3deg`, translucent, dashed side edges, soft shadow. Default is yellow; `.tape-blue` / `.tape-red` swap the tint. Requires the host element to be `position: relative` (polaroids are).

### 6.6 Pin
A small red dot (`h-4 w-4 rounded-full bg-red shadow-paper`), absolutely positioned at top-center, `z-10` — used to “pin” cards to the board.

### 6.7 Cutting-board grid
Inline `repeating-linear-gradient` (both axes, ~38px cells, `rgba(216,201,173,0.25)`) behind the Work board to evoke a cutting mat.

---

## 7. Motion System

Library: **Framer Motion**. Global smooth scrolling via **Lenis** (native scroll, no transform wrapper).

### 7.1 Tailwind keyframes / animations

| Name | Definition | Use |
|------|-----------|-----|
| `animate-marquee` | `translateX(0 → -50%)`, `26s linear infinite` | Scrolling ticker strips. |
| `animate-wiggle` | `rotate(-2deg ↔ 2deg)`, `2.6s ease-in-out infinite` | Idle playful wiggle on stickers/badges. |

Custom `rotate` utilities: `rotate-1.5` (1.5deg), `rotate-2.5` (2.5deg), plus negatives.

### 7.2 Framer patterns (reusable)

**Card entrance (Work):**
- `initial = { opacity: 0, scale: 0.7, rotate: 0 }`
- `animate = { opacity: 1, scale: 1, rotate: <slot rotate> }`
- `transition = { type: "spring", stiffness: 260, damping: 20, delay: i * 0.06 }` (staggered pop)

**Drag / toss (Work cards):**
- `drag`, `dragConstraints={board}`, `dragElastic={0.12}`
- `whileDrag = { scale: 1.05 }`, `whileHover = { scale: 1.03 }`
- On grab/drop, card jumps to top via a z-index counter (`bringToFront`).
- Rule: for draggable cards, only animate `opacity`/`scale`/`rotate` — never animate `x`/`y` (it fights drag persistence). Position via `top`/`left` in `style`.

**Action pills (project links):**
- `whileHover = { y: -2, rotate: 0, scale: 1.05 }`, `whileTap = { scale: 0.95 }`

**Nav overlay (staggered menu):**
- Panel: `{ hidden:{opacity:0}, visible:{opacity:1, transition:{ duration:0.25, staggerChildren:0.07, delayChildren:0.1 }}, exit:{opacity:0, transition:{duration:0.2}} }`
- Item: `{ hidden:{opacity:0, y:26, rotate:-2}, visible:{opacity:1, y:0, rotate:0, transition:{ type:"spring", stiffness:140, damping:16 }} }`

**Shuffle (Work):** Fisher–Yates permutation of scatter slots; cards remount by key (`\`${title}-${shuffleNonce}\``) so each re-plays the pop entrance.

### 7.3 Reduced motion
`@media (prefers-reduced-motion: reduce)` collapses all animation/transition durations to ~0. Always respect it; never ship motion that ignores this.

---

## 8. Iconography & Doodles

- **Icon set:** `react-icons` — `Fi*` (Feather) for UI (`FiArrowUpRight`, `FiShuffle`, `FiX`), `Si*` (Simple Icons) for brands (`SiGithub`, tech-stack logos).
- **Tech-stack icons:** centralized in `src/lib/tech.tsx` as `TECH: Record<string, { name, icon, color }>`. Chips render the brand icon in its brand color + label. Missing keys fall back to text-only chips.
- **Hand-drawn doodles:** `src/components/doodles/Doodles.tsx` exports `Underline`, `Circle`, `Arrow`, `Star`, `Squiggle`, `Check` — SVG scribbles used as accents (e.g. Star on the logo, Arrow next to hints).

---

## 9. Component Patterns

### 9.1 Buttons & pills

| Variant | Classes | Use |
|---------|---------|-----|
| Primary pill | `inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-panel shadow-paper` (slight `-rotate-2`) | “Live demo” action. |
| Secondary pill | `inline-flex items-center gap-1 rounded-full border border-ink/20 bg-paper px-3 py-1 text-xs font-semibold text-ink shadow-paper` (slight `rotate-1`) | “Code” / GitHub action. |
| Utility button | `group inline-flex items-center gap-2 rounded-full border border-ink/15 bg-panel px-4 py-2 text-sm font-semibold text-ink shadow-paper transition-transform hover:-rotate-2 active:scale-95` | Shuffle, etc. Icon can spin on `group-hover`. |

Pills are intentionally rotated a degree or two for the scrapbook feel; hover straightens + lifts them.

### 9.2 Chips (tech stack)
`inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[0.65rem] text-muted` + brand icon (`h-3 w-3`). `sm` size bumps to `text-[0.7rem]` / `h-3.5 w-3.5`.

### 9.3 Navigation
Floating centered pill (`fixed inset-x-0 top-0`). Transparent at top; on scroll (`window.scrollY > 24`) gains `border-line bg-panel/80 shadow-paper backdrop-blur-md`. Logo = rotated ink chip with `Z` + yellow Star doodle + `shortName` with red dot. Mobile opens a full-screen staggered overlay (`z-[100]`, body scroll locked).

### 9.4 Cards (project)
Polaroid frame, taped & pinned, absolutely placed on the board via a `SCATTER` array of `{ top, left, rotate, tape }` slots. Contains: image (`h-44` desktop / `h-48` mobile, `draggable={false}`), title, `tag · year`, blurb, tech `Stack`, and optional `CardActions` (demo/github, each rendered only if present).

### 9.5 Sticky-note form (Guestbook)
The form *is* the sticky note: borderless, transparent inputs (`border-0 bg-transparent`), hand fonts (`font-hand` for the note, `font-scrawl` for the name), live color preview, pin + star, with a length validation (max ~90 chars, live counter that turns red near the limit).

### 9.6 Custom cursor & multiplayer
- `.cursor-none` hides the native cursor on fine-pointer devices for a custom cursor.
- **Live cursors (Liveblocks):** a `fixed inset-0 z-[90] pointer-events-none overflow-hidden` overlay with an inner layer translated by `-scrollX/-scrollY` each rAF frame, so remote cursors are anchored to document (page) coordinates and follow scroll across the full page. Cursors are colored/named by `connectionId`.

---

## 10. Accessibility

- Respect `prefers-reduced-motion` (already wired globally).
- Maintain contrast: `ink`/`muted` on `paper`/`panel` pass for text; avoid low-opacity ink for long copy.
- All interactive pills/buttons use real `<a>`/`<button>` elements with `target="_blank" rel="noopener noreferrer"` on external links.
- Images always carry `alt`; decorative doodles are inline SVG (no essential meaning).
- Keyboard: nav links are anchors; overlay locks background scroll while open.

---

## 11. Voice & Tone

First-person, warm, confident, lightly playful. Lowercase hand-written labels (“about”, “work”, “stack”, “connect”). Micro-copy invites interaction (“grab, toss & shuffle”). Professional substance, casual surface — the writing mirrors the paper aesthetic.

---

## 12. Do / Don't

**Do**
- Use token names (`bg-panel`, `text-ink`) not raw hex.
- Keep body copy in `font-sans`; reserve `hand`/`scrawl` for headings, labels, short accents.
- Add slight rotations, tape, and pins to physical-feeling elements.
- Use `shadow-paper` at rest, `shadow-lift` on hover/drag.
- Respect reduced motion and keep real Unicode glyphs in JSX text.

**Don't**
- Don't animate `x`/`y` on draggable cards (breaks drop persistence).
- Don't set paragraphs in display fonts.
- Don't use neutral gray shadows — shadows are warm/ink-tinted.
- Don't overload accents; rotate red → yellow → blue for variety, keep green tertiary.
- Don't rely on a plain `absolute` document-coord layer for cursors — use the fixed overlay + rAF scroll offset.

---

## 13. Token Quick Reference

```ts
// colors
paper #f2e8d5 · panel #fbf6ea · ink #2a241d · muted #7a6f5e · line #d8c9ad
red #df513b · yellow #f5c84b · blue #3f6fb0 · green #5d8a4e

// fonts
font-sans   → Inter        (--font-inter)   // body
font-hand   → Gochi Hand   (--font-gochi)   // headings/logo
font-scrawl → Caveat       (--font-caveat)  // labels/accents

// shadows
shadow-paper 0 10px 24px -12px rgba(42,36,29,0.35)
shadow-lift  0 18px 40px -16px rgba(42,36,29,0.45)

// layout
max-w-shell 1200px · screens.xs 480px

// motion
marquee 26s linear infinite · wiggle 2.6s ease-in-out infinite
rotate-1.5 / rotate-2.5 (+ negatives)

// signature classes
.shell .hand .scrawl .label .card .polaroid .sticky
.tape / .tape-blue / .tape-red · .text-stroke · .grab · .paper-texture · .cursor-none
```
