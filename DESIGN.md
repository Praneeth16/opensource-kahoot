---
name: PopQuiz
description: An open-source live quiz game. The host screen is a stage, the phone is a controller.
colors:
  ground: "#f4eee4"
  surface: "#fbf8f2"
  sunken: "#ede5d8"
  rule: "#e3dacb"
  ink: "#2e2a27"
  ink-soft: "#45403b"
  ink-muted: "#6e655c"
  action: "#b8482e"
  action-strong: "#9e3b24"
  action-soft: "#f3e0d6"
  q-terracotta: "#b8482e"
  q-teal: "#2f6b78"
  q-ochre: "#d69a2d"
  q-olive: "#5e7334"
  white: "#ffffff"
typography:
  stage-pin:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "min(9rem, 13vw, 22vh)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.04em"
    fontFeature: "tnum"
  display:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, min(6vh, 6.5vw) + 0.5rem, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "-0.03em"
  tile:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.125rem, min(2.6vh, 2.2vw) + 0.6rem, 2rem)"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "ss01"
  button:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
  mono-figure:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "3rem"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "tnum"
rounded:
  xl: "12px"
  tile: "14px"
  2xl: "16px"
  full: "9999px"
spacing:
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.action-strong}"
  button-primary-disabled:
    backgroundColor: "{colors.rule}"
    textColor: "{colors.ink-muted}"
  button-primary-lg:
    backgroundColor: "{colors.action}"
    textColor: "{colors.white}"
    rounded: "{rounded.2xl}"
    padding: "0 24px"
    height: "56px"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  button-dark-hover:
    backgroundColor: "{colors.ink-soft}"
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  button-quiet-hover:
    backgroundColor: "{colors.sunken}"
  button-ghost:
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.xl}"
    padding: "0 12px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "10px 14px"
  pin-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.mono-figure}"
    rounded: "{rounded.2xl}"
    height: "80px"
  surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
  answer-tile-triangle:
    backgroundColor: "{colors.q-terracotta}"
    textColor: "{colors.white}"
    rounded: "{rounded.tile}"
  answer-tile-diamond:
    backgroundColor: "{colors.q-teal}"
    textColor: "{colors.white}"
    rounded: "{rounded.tile}"
  answer-tile-circle:
    backgroundColor: "{colors.q-ochre}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
  answer-tile-square:
    backgroundColor: "{colors.q-olive}"
    textColor: "{colors.white}"
    rounded: "{rounded.tile}"
  answer-tile-wrong:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.tile}"
  chip:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  notice-error:
    backgroundColor: "{colors.action-soft}"
    textColor: "{colors.action-strong}"
    rounded: "{rounded.xl}"
    padding: "10px 14px"
---

# Design System: PopQuiz

## Overview

**Creative North Star: "The Stage and the Controller"**

PopQuiz is warm muted and light, built for a room. The host screen is a stage read from the back row: one idea per screen, the question at display size, a full-width timer bar, and four answer tiles filling the lower half that carry their own counts at reveal, so the whole stage fits one viewport. The phone is a controller held in one hand: the tiles become big tap targets and after reveal the whole page fills olive or terracotta with the verdict. Everything else (landing, dashboard, editor, reports, auth) is parchment ground with warm charcoal ink and slightly lighter surfaces, so the color budget is spent where the game happens.

The ground is flat. 1px rules divide headers and lists, surfaces sit a half-step lighter than the ground, and one soft lift is the only shadow. Saturated color lives in two places: terracotta for the single action on a screen, and the answer quartet. The quartet always carries its shape, so color is never the only signal. Motion has one grammar: things rise or grow into place from an already-visible state on one expo ease, and reduced motion turns it off.

The build rejects the purple-confetti game show and the SaaS card grid. Light theme only; the palette is the user's "Warm muted" choice.

**Key Characteristics:**

- Parchment ground, warm charcoal ink, near-white surfaces, 1px warm rules.
- Terracotta is the one action color; the quartet (terracotta triangle, dusty teal diamond, ochre circle, olive square) is the one moment of full saturation.
- DM Sans throughout, bold and tight (-0.03em) for headings; DM Mono only for PINs, timers and IDs.
- Flat surfaces with a single soft lift, 14px tiles, 12-16px controls.
- The host stage scales its root font with the viewport; every rem on it scales, 1280x720 to 4K.

## Colors

A warm parchment-and-charcoal palette with one terracotta action and an earthen four-color quartet held back for play.

### Primary

- **Terracotta Action** (action): every primary button, focus ring, caret, accent-color, text selection, the timer bar and seconds in the final five seconds, the 1st-place podium block, the phone's "Wrong" verdict page, and low-accuracy report bars. 5.2:1 under white, so it carries body-size white text.
- **Fired Terracotta** (action-strong): primary button hover, and the text color on Terracotta Wash (5.3:1).
- **Terracotta Wash** (action-soft): ground of error notices and the "live" game chip.

### Secondary (the answer quartet)

- **Quartet Terracotta** (q-terracotta): the triangle tile. Same value as Action by design; the shape tells them apart.
- **Dusty Teal** (q-teal): the diamond tile, white text (6.0:1).
- **Ochre** (q-ochre): the circle tile, which takes ink text, never white (5.8:1); also the "Double points" chip.
- **Olive** (q-olive): the square tile, the phone's "Correct" verdict page, and high-accuracy report bars, white text (5.3:1).

### Neutral

- **Parchment** (ground): page ground and theme color.
- **Linen Surface** (surface): headers, cards, inputs, the PIN field, leaderboard rows, the lobby player panel, quiet buttons.
- **Sunken Linen** (sunken): quiet fills: chips, lobby player pills, timer track, ghost and quiet hover, wrong tiles after reveal, the "No answer" verdict page.
- **Warm Rule** (rule): every 1px border and divider, input strokes, the disabled primary fill, scrollbar thumb.
- **Charcoal Ink** (ink): primary text, the dark button, the timer fill at rest, the 2nd and 3rd podium blocks, the phone score pill.
- **Soft Charcoal** (ink-soft): dark button hover only.
- **Muted Ink** (ink-muted): secondary text, metadata, placeholders, ghost text. 4.9:1 on ground, 4.6:1 on sunken.

### Named Rules

**The One Action Rule.** A screen has one terracotta button. Secondary actions are quiet (surface, rule), dark (ink) or ghost.

**The Quartet Travels Together Rule.** The quartet appears as a set, in the fixed order triangle, diamond, circle, square, and a quartet color never shows up without its shape. Outside the game it appears only in the brand mark, the verdict pages, and data bars.

**The Reveal Drains Rule.** After reveal, wrong tiles fall back to sunken with muted ink and an ink/15 fill bar; only the correct tile keeps its color, a check, and a white/45 fill bar.

## Typography

**Display Font:** DM Sans (with ui-sans-serif, system-ui)
**Body Font:** DM Sans, stylistic set ss01 on
**Label/Mono Font:** DM Mono, weights 400 and 500 only

**Character:** One geometric grotesque doing everything, tightened to -0.03em and bold at stage scale so a question reads across a room. Mono is a tool, not a voice: it marks the things you type or count down.

### Hierarchy

- **Stage PIN** (DM Mono 500, min(9rem, 13vw, 22vh), line-height 1, 0.04em, split 3+3): the lobby PIN.
- **Display** (700, clamp(1.5rem, min(6vh, 6.5vw) + 0.5rem, 3.75rem), 1.12, -0.03em, max 60rem): the stage question. Questions over 140 characters step down to clamp(1.375rem, min(4.2vh, 4.6vw) + 0.5rem, 2.75rem).
- **Headline** (700, 3rem; clamp(2rem, 6vh, 3rem) on the stage): Leaderboard and Podium titles, the phone verdict (3rem, 2.25rem when short), the landing "Join a game" (2.25rem to 3rem). The phone's final rank goes to 4.5rem at -0.04em.
- **Title** (700, 1.5rem to 1.875rem): section heads, lobby player count, "Answer locked in".
- **Tile** (600, clamp(1.125rem, min(2.6vh, 2.2vw) + 0.6rem, 2rem)): stage answer text; shape, padding and gap are set in em so the whole tile scales with it.
- **Body** (400, 1rem, 1.5): page copy and metadata.
- **Button** (600, 0.9375rem): all button text; rem so it scales with the stage root (15px at the default root). Large buttons go to 1.125rem.
- **Label** (600, 0.875rem): field labels; chips at 0.75rem.
- **Mono Figure** (DM Mono 500): timer seconds (1.5rem phone, 3rem stage), the PIN field (3rem, 0.2em tracking), PIN in headers and report IDs (0.875rem).

### Named Rules

**The Mono Is For Codes Rule.** DM Mono only sets PINs, the timer and IDs. Scores, ranks and counts are DM Sans with tabular figures.

**The Tabular Figures Rule.** Any number that changes live (score, timer, answered count, tile counts, PIN) uses tabular-nums so it does not jitter.

**The Balanced Heading Rule.** h1 to h3 balance their wrap and track at -0.03em.

## Layout

Page shells (landing, dashboard, editor, reports) centre in a 72rem column with 20px side padding. The landing is one centred column: the PIN form at max 24rem, wordmark top left, "Host a quiz" top right. Spacing runs on the 4px scale; 12px and 16px are the common gaps, 20px and 24px the common insets.

**The One Viewport Stage Rule.** The host stage sets its root font to clamp(16px, min(1.25vw, 2.2vh), 48px) and on screens at least 1024x600 (the `stage` variant) locks to h-dvh with no page scroll; shorter or narrower screens scroll, and the question view scrolls inside itself only when long content needs it, so one layout fits 1280x720 through 4K. Vertical sizes on the stage use vh-aware clamps (tile min-height clamp(4rem, 13vh, 7rem), podium blocks min(14rem, 30vh) / min(10rem, 22vh) / min(7rem, 15vh)). Reveal counts live inside the tiles rather than in a separate chart, so the stage never needs a second screen. Below lg the stage scrolls and the tile grid drops to one column under sm.

The question screen stacks: meta row, full-width timer, the question centred in the flexible middle, a 2-column tile grid (gap 12px) pinned to the bottom, the advance control bottom right. The lobby splits 5fr/4fr at lg: PIN and QR on ground at left, the player list on a surface panel at right with full-width Start at its foot. Leaderboard and podium centre in 48rem and 56rem columns.

The phone sits in a max-w-3xl column, pads with safe-area insets top and bottom (viewport-fit cover), and grids answers 2x2 (1 column for true/false) filling the remaining height, tiles at least 112px tall (144px from sm). **The Short Rule.** On landscape screens under 500px tall (the `short` variant), answers go to one row of four (two for true/false), tiles drop their min-height and shrink their shape and text, and verdict type steps down.

**The Coarse Pointer Rule.** On coarse pointers every small control grows to a 44px target (lobby kick buttons to 40px with negative margin, connect-panel ghost buttons to 44px, dashboard quiz links gain block padding, auth fields and buttons to 44px). **The Narrow Wordmark Rule.** Under 380px the wordmark keeps only the mark; the name stays for screen readers.

## Elevation & Depth

Flat by default. Depth comes from surface on ground and 1px rules. There is one shadow, a soft two-part lift, used where something is a physical object you look at or touch: the PIN field, the QR card, phone answer tiles, the picked-answer badge, and leaderboard rows.

### Shadow Vocabulary

- **Lift** (`box-shadow: 0 1px 2px rgb(46 42 39 / 0.06), 0 8px 24px -12px rgb(46 42 39 / 0.2)`): the single elevation.

### Named Rules

**The One Lift Rule.** There is one shadow. Admin cards and surfaces stay flat with a border; only tappable or stage objects lift.

## Shapes

Soft rectangles, no sharp corners and no pills on large containers. Controls and inputs are 12px; large buttons, the PIN field and surfaces are 16px; answer tiles, leaderboard rows, images and podium tops use the 14px tile radius. Chips, player pills, the score pill, the timer and report bars are fully rounded. Borders are 1px rule, except the PIN field's 2px. The four answer shapes are filled 24px-grid glyphs (triangle, diamond, circle, rounded square) and also form the brand mark in a 2x2. UI icons are an authored in-house set: 24px grid, 1.75 stroke, round caps.

## Components

### Buttons

Tactile and plain: a 1px press on active, no lift, no gradient.

- **Shape:** gently rounded (12px), at least 44px tall, button type, 8px icon gap.
- **Primary:** terracotta with white text; hover fired terracotta. Disabled goes to the rule fill with muted ink at full opacity, so it reads as waiting, not broken.
- **Large:** 56px tall, 16px radius, 24px padding, 1.125rem text; the move-forward actions (Enter, Start game, Leaderboard, Next question).
- **Dark:** ink, hover soft charcoal; the second strong action (Back to dashboard).
- **Quiet:** surface, 1px rule, hover sunken; secondary actions (Reveal now, View report).
- **Ghost:** muted ink, no fill, hover sunken with ink text; header and row actions (Edit, End game).
- **Focus:** a 2px terracotta outline at 2px offset, global, in the base layer.

### Chips

- **Style:** fully rounded, 0.75rem semibold, 2px 10px. Finished games are sunken with muted ink; live games are terracotta wash; "Double points" is ochre with ink.

### Cards / Containers

- **Corner Style:** 16px.
- **Background:** surface on ground.
- **Shadow Strategy:** none; see The One Lift Rule.
- **Border:** 1px rule; lists inside divide with 1px rules.

### Inputs / Fields

- **Style:** surface, 1px rule, 12px radius, 10px 14px padding, ink text, muted placeholder; hover darkens the stroke slightly.
- **Focus:** stroke goes terracotta plus a 3px terracotta ring at 15%.
- **PIN field:** 80px tall, 2px rule, 16px radius, the lift, DM Mono 3rem at 0.2em; focus turns the stroke ink.
- **Error:** a terracotta-wash notice with fired-terracotta text.

### Navigation

A single header row: the wordmark (mark plus "PopQuiz", 1.125rem bold, -0.03em) at left, ghost buttons at right. On game screens the header is surface with a 1px rule beneath; on the landing it sits on ground.

### Answer Tile (signature)

The quartet as full tiles at the 14px radius, each with its filled shape and semibold answer text. On the stage the tile is sized in em off the Tile step; at reveal every tile shows its answer count (bold, tabular) and a 0.3em fill bar along its bottom edge scaled to its share, growing in on grow-x. On the phone they are buttons at least 112px tall with a 40px shape, the lift, and a 0.97 scale on press.

### Timer Bar (signature)

A fully rounded sunken track (8px phone, 12px stage) with an ink fill draining linearly. In the final five seconds the fill and the mono seconds turn terracotta.

### Verdict Page (signature)

On the phone, the verdict fills the whole page below the surface header, edge to edge, with a 500ms color transition: olive with white text for correct (with a white/20 "+points" pill), terracotta with white text for wrong, sunken for no answer. Headline-size verdict, popped in.

### Podium (signature)

**The Shared Rank Rule.** Equal score is equal rank: rank is the position of the first player with that score, and ordinals print the shared rank (two "1st", then "3rd"). Podium order is 2nd, 1st, 3rd, but block height follows rank, so tied players stand level; rank 1 blocks are terracotta, the rest ink. Blocks grow up in sequence (3rd, 2nd, 1st).

## Do's and Don'ts

### Do:

- **Do** keep one terracotta primary per screen and drop everything else to quiet, dark or ghost.
- **Do** pair every quartet color with its shape, in the fixed order terracotta triangle, teal diamond, ochre circle, olive square.
- **Do** set ink text on ochre and white text on terracotta, teal and olive.
- **Do** use fired terracotta, not terracotta, for text on the terracotta wash.
- **Do** size host-stage type and spacing in rem or em so the stage root scale carries them, and size stage heights with vh-aware clamps.
- **Do** give every control on coarse pointers a 44px target.
- **Do** use tabular figures for every live number, and DM Mono only for PINs, timers and IDs.
- **Do** animate only with rise, grow-up, grow-x or pop on the expo-out ease (cubic-bezier(0.16, 1, 0.3, 1)), from an already-visible state, and honour reduced motion.

### Don't:

- **Don't** add a second shadow, or lift admin cards; they stay flat with a 1px rule.
- **Don't** introduce a dark theme, gradients, or a purple game-show palette.
- **Don't** set stage text in fixed px; it breaks the one-viewport scaling.
- **Don't** break ties by list position; tied scores share the rank and the podium height.
- **Don't** pull in an icon library; add paths to the authored 24px, 1.75-stroke set.
