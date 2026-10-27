---
name: PopQuiz
description: An open-source live quiz game. The host screen is a stage, the phone is a controller.
colors:
  oat: "#f9f7f4"
  oat-200: "#eeede9"
  oat-300: "#e2dfd8"
  white: "#ffffff"
  navy: "#1b3139"
  navy-700: "#2f4a54"
  navy-500: "#5a6f77"
  lava: "#ff3621"
  lava-600: "#db2b12"
  lava-700: "#c42510"
  lava-50: "#fff0ed"
  blue: "#2272b4"
  gold: "#ffab00"
  green-600: "#00875c"
typography:
  stage-pin:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "clamp(4.5rem, 12vw, 9rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.04em"
    fontFeature: "tnum"
  display:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1.25
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
  body:
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "ss01"
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
  lg: "8px"
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
  8: "32px"
  10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.lava-600}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.lava-700}"
  button-primary-disabled:
    backgroundColor: "{colors.oat-300}"
    textColor: "{colors.navy-500}"
  button-primary-lg:
    backgroundColor: "{colors.lava-600}"
    textColor: "{colors.white}"
    rounded: "{rounded.2xl}"
    padding: "0 24px"
    height: "56px"
  button-dark:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.white}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  button-dark-hover:
    backgroundColor: "{colors.navy-700}"
  button-quiet:
    backgroundColor: "{colors.white}"
    textColor: "{colors.navy}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  button-quiet-hover:
    backgroundColor: "{colors.oat-200}"
  button-ghost:
    textColor: "{colors.navy-500}"
    rounded: "{rounded.xl}"
    padding: "0 12px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.oat-200}"
    textColor: "{colors.navy}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.navy}"
    rounded: "{rounded.xl}"
    padding: "10px 14px"
  pin-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.navy}"
    typography: "{typography.mono-figure}"
    rounded: "{rounded.2xl}"
    height: "80px"
  surface:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.2xl}"
  answer-tile-triangle:
    backgroundColor: "{colors.lava}"
    textColor: "{colors.white}"
    rounded: "{rounded.tile}"
  answer-tile-diamond:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.tile}"
  answer-tile-circle:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.navy}"
    rounded: "{rounded.tile}"
  answer-tile-square:
    backgroundColor: "{colors.green-600}"
    textColor: "{colors.white}"
    rounded: "{rounded.tile}"
  answer-tile-wrong:
    backgroundColor: "{colors.oat-200}"
    textColor: "{colors.navy-500}"
    rounded: "{rounded.tile}"
  chip:
    backgroundColor: "{colors.oat-200}"
    textColor: "{colors.navy-500}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  notice-error:
    backgroundColor: "{colors.lava-50}"
    textColor: "{colors.lava-600}"
    rounded: "{rounded.xl}"
    padding: "10px 14px"
---

# Design System: PopQuiz

## Overview

**Creative North Star: "The Stage and the Controller"**

PopQuiz is Databricks light, built for a room. The host screen is a stage read from the back row: one idea per screen, the question at display size, a full-width timer bar, and four answer tiles filling the lower half. The phone is a controller held in one hand: the four tiles become big tap targets and the whole screen floods green or lava with the verdict. Everything else (landing, dashboard, editor, reports, auth) is calm Oat paper with Navy ink and white surfaces, so the colour budget is spent where the game happens.

The ground is flat. 1px oat rules divide headers and lists, white surfaces sit on Oat, and one soft lift is the only shadow. Saturated colour lives in two places: Lava for the single action on a screen, and the answer quartet. The quartet always carries its shape, so colour is never the only signal. Motion has one grammar: things rise or grow into place from a state that is already visible, on one expo ease, and reduced motion turns it off.

The build rejects the purple-confetti game show and the SaaS card grid. Light theme only.

**Key Characteristics:**
- Oat ground, Navy ink, white surfaces, 1px oat rules.
- Lava-600 is the one action colour; the answer quartet (Lava triangle, Blue diamond, Gold circle, Green square) is the one moment of full saturation.
- DM Sans throughout, bold and tight (-0.03em) for headings; DM Mono only for PINs, timers and IDs.
- Flat surfaces with a single soft lift, 14px tiles, 12-16px controls.
- One motion grammar: rise, grow-up, pop, all on the expo-out ease.

## Colors

A warm-neutral paper palette with one action red and a four-colour game quartet held back for play.

### Primary
- **Lava Action** (lava-600): every primary button, focus ring, caret, accent-color, error text, and timer seconds in the last five seconds. The AA-safe Lava for small text on white or under white text.
- **Lava Press** (lava-700): hover of the primary button only.
- **Lava Signal** (lava): the brighter brand Lava, for large fills: the triangle tile, the timer bar's final five seconds, the 1st-place podium block, text selection, and low-accuracy bars in reports. Large text only under it.
- **Lava Wash** (lava-50): background of error notices and the "live" game chip.

### Secondary (the answer quartet)
- **Diamond Blue** (blue): the second answer tile and its bar.
- **Circle Gold** (gold): the third answer tile, which takes Navy text, never white; also the "Double points" chip.
- **Square Green** (green-600): the fourth answer tile, the phone's "Correct" flood, and high-accuracy bars in reports.

### Neutral
- **Oat Paper** (oat): page ground and theme colour.
- **Oat Shade** (oat-200): quiet fills: chips, player pills in the lobby, timer track, ghost and quiet button hover, the wrong-answer tile after reveal, the "No answer" flood.
- **Oat Rule** (oat-300): every 1px border and divider, input strokes, disabled primary fill, wrong-answer bars in the reveal distribution, scrollbar thumb.
- **White Surface** (white): cards, headers on the game screens, inputs, leaderboard rows.
- **Navy Ink** (navy): all primary text, the dark button, the timer bar at rest, the 2nd and 3rd podium blocks, the score pill on the phone.
- **Navy Hover** (navy-700): hover of the dark button.
- **Navy Mute** (navy-500): secondary text, metadata, placeholders, ghost button text. 4.9:1 on Oat.

### Named Rules
**The One Action Rule.** A screen has one Lava-600 button. Secondary actions are quiet (white, oat rule), dark (Navy), or ghost.

**The Quartet Travels Together Rule.** Lava, Blue, Gold and Green-600 appear as a set, in that order, mapped to triangle, diamond, circle and square. Outside the game they appear only in the brand mark and in the shapes that carry them. A quartet colour never shows up without its shape.

**The Reveal Drains Rule.** After reveal, wrong answers fall back to Oat (oat-200 tiles, oat-300 bars) and only the correct answer keeps its colour.

## Typography

**Display Font:** DM Sans (with ui-sans-serif, system-ui)
**Body Font:** DM Sans, stylistic set ss01 on
**Label/Mono Font:** DM Mono, weights 400 and 500 only

**Character:** One geometric grotesque doing everything, tightened to -0.03em and bold at stage scale so a question reads from across a room. Mono is a tool, not a voice: it marks the things you type or count down.

### Hierarchy
- **Stage PIN** (DM Mono 500, clamp(4.5rem, 12vw, 9rem), line-height 1, 0.04em, split 3+3): the lobby PIN on the host stage.
- **Display** (700, 2.25rem rising to 3.75rem at lg, leading-tight, -0.03em): the question on the host stage.
- **Headline** (700, 3rem, -0.03em): stage-screen titles (Leaderboard, Podium), the phone's verdict ("Correct", "You're in!"), the landing "Join a game" (2.25rem to 3rem). The phone's final rank goes to 4.5rem at -0.04em.
- **Title** (700, 1.5rem to 1.875rem): section heads, lobby player count, "Answer locked in".
- **Body** (400, 1rem, 1.5): page copy and metadata, Navy or Navy Mute.
- **Label** (600, 0.875rem): field labels, chips (0.75rem), button text at 15px.
- **Mono Figure** (DM Mono 500): timer seconds (1.5rem phone, 3rem stage), the PIN field (3rem, 0.2em tracking), PIN in headers and report IDs (0.875rem).

### Named Rules
**The Mono Is For Codes Rule.** DM Mono only sets PINs, the timer and IDs. Scores, ranks and counts are DM Sans with tabular figures.

**The Tabular Figures Rule.** Any number that changes live (score, timer, answered count, PIN) uses tabular-nums so it does not jitter.

**The Balanced Heading Rule.** h1 to h3 balance their wrap and track at -0.03em.

## Layout

Page shells (landing, dashboard, editor, reports) centre in a 72rem (max-w-6xl) column with 20px side padding and 32px top padding. The landing is a single centred column: the PIN form at max 24rem, the wordmark top left and "Host a quiz" top right. Game screens are full-bleed flex columns of min-h-dvh with a white header strip divided by a 1px oat rule.

The host question screen stacks: meta row, full-width timer, the question centred in the flexible middle, a 2-column tile grid (gap 12px) pinned to the bottom, and the advance control bottom right. The lobby splits 5fr/4fr at lg: PIN and QR on Oat at left, the player list on a white panel at right with the full-width Start button at its foot. Leaderboard and podium centre in 48rem and 56rem columns.

The phone grids answers 2x2 (or 1 column for true/false) filling the remaining height, with tiles at least 112px tall. Spacing runs on the 4px Tailwind scale; 12px and 16px are the common gaps, 20px and 24px the common insets.

## Elevation & Depth

Flat by default. Depth comes from white surfaces on Oat and 1px oat-300 rules. There is one shadow, a soft two-part lift, used where something is a physical object you look at or touch: the PIN field, the QR card, phone answer tiles, the picked-answer badge, and leaderboard rows.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 1px 2px rgb(27 49 57 / 0.06), 0 8px 24px -12px rgb(27 49 57 / 0.18)`): the single elevation.

### Named Rules
**The One Lift Rule.** There is one shadow. Cards and surfaces in the admin screens stay flat with a border; only tappable or stage objects lift.

## Shapes

Soft rectangles throughout, no sharp corners and no pills on large containers. Controls and inputs are 12px; large buttons, the PIN field and surfaces are 16px; answer tiles, leaderboard rows, images and the podium tops use the 14px tile radius. Chips, player pills, the score pill and bars are fully rounded. Borders are always 1px oat-300, except the PIN field's 2px. The four answer shapes are filled 24px-grid glyphs (triangle, diamond, circle, rounded square) and are also the brand mark in a 2x2. The UI icon set is authored in-house: 24px grid, 1.75 stroke, round caps.

## Components

### Buttons
Tactile and plain: a 1px press on active, no lift, no gradient.
- **Shape:** gently rounded (12px), at least 44px tall, 15px semibold, 8px icon gap.
- **Primary:** Lava-600 with white text; hover Lava-700. Disabled goes Oat Rule with Navy Mute text at full opacity, so it reads as waiting, not broken.
- **Large:** 56px tall, 16px radius, 24px padding, 18px text; the move-forward actions (Enter, Start game, Leaderboard, Next question).
- **Dark:** Navy, hover Navy-700; the second strong action (Back to dashboard).
- **Quiet:** white, 1px oat rule, hover Oat Shade; secondary actions (Reveal now, View report, Export).
- **Ghost:** Navy Mute text, no fill, hover Oat Shade with Navy text; header and row actions (Edit, Duplicate, End game).
- **Focus:** a 2px Lava-600 outline at 2px offset, global, in the base layer.

### Chips
- **Style:** fully rounded, 12px semibold, 2px 10px. Finished games are Oat Shade with Navy Mute; live games are Lava Wash with Lava-600. "Double points" is Gold with Navy.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** white on Oat.
- **Shadow Strategy:** none; see The One Lift Rule.
- **Border:** 1px oat-300; lists inside divide with 1px oat-300 rules.
- **Internal Padding:** 20px rows; 20-28px in the editor's question card.

### Inputs / Fields
- **Style:** white, 1px oat-300, 12px radius, 10px 14px padding, Navy text, Navy Mute placeholder. Hover darkens the stroke slightly.
- **Focus:** stroke goes Lava-600 plus a 3px Lava ring at 15% opacity.
- **Labels:** 14px semibold Navy, 6px above the field.
- **Error:** a Lava Wash notice with Lava-600 text.

### Navigation
A single header row: the wordmark (Mark plus "PopQuiz", 18px bold, -0.03em) at left, ghost buttons at right. On game screens the header is white with a 1px oat rule beneath; on the landing it sits on Oat.

### Answer Tile (signature)
The quartet as full-bleed tiles at the 14px radius, each with its filled shape and the answer text in semibold. On the stage they are at least 96px tall (112px at lg) with 24-30px text and a 36px shape; on the phone they are buttons at least 112px tall with a 40px shape, the lift, and a 0.97 scale on press. After reveal, wrong tiles drain to Oat Shade and Navy Mute; the correct tile keeps its colour and gains a check.

### Timer Bar (signature)
A fully rounded Oat Shade track (8px phone, 12px stage) with a Navy fill draining linearly. In the last five seconds the fill turns Lava and the mono seconds turn Lava-600.

### Verdict Flood (signature)
On the phone, the result fills the whole content area: Green-600 for correct with a white "+points" pill at 20% white, Lava-600 for wrong, Oat Shade for no answer. Headline-size verdict, popped in.

## Do's and Don'ts

### Do:
- **Do** keep one Lava-600 primary per screen and drop everything else to quiet, dark or ghost.
- **Do** pair every quartet colour with its shape, in the fixed order Lava triangle, Blue diamond, Gold circle, Green-600 square.
- **Do** set Navy text on Gold and white text on Lava, Blue and Green-600.
- **Do** use Lava-600, not Lava, for any text or small element that needs AA (4.9:1 under white).
- **Do** use tabular figures for every live number, and DM Mono only for PINs, timers and IDs.
- **Do** animate only with rise, grow-up or pop on the expo-out ease (cubic-bezier(0.16, 1, 0.3, 1)), from an already-visible state, and honour reduced motion.

### Don't:
- **Don't** add a second shadow, or lift admin cards; they stay flat with a 1px oat rule.
- **Don't** introduce a dark theme, gradients, or a purple game-show palette.
- **Don't** set body-size white text on Lava (3.6:1); Lava carries large text only.
- **Don't** use quartet colours for decoration outside the game, the brand mark, and data bars.
- **Don't** pull in an icon library; add paths to the authored 24px, 1.75-stroke set.
