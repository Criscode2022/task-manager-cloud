---
name: Task Cloud
description: A personal task list written in ballpoint ink.
colors:
  ink: "#2B3FD0"
  ink-strong: "#2233B4"
  ink-tint: "#E4E8FD"
  on-ink: "#FFFFFF"
  on-header-muted: "#D6DCFF"
  ground: "#EEF1FA"
  surface: "#FFFFFF"
  surface-sunken: "#F4F6FC"
  text: "#11162F"
  text-muted: "#4B5378"
  placeholder: "#6A7192"
  line: "#DDE2F0"
  line-strong: "#C3CAE2"
  danger: "#B42330"
  danger-tint: "#FBE9EA"
  priority-high: "#B42330"
  priority-high-tint: "#FBE9EA"
  priority-medium: "#8F5300"
  priority-medium-tint: "#FBF0DE"
  priority-low: "#167447"
  priority-low-tint: "#E3F4EA"
  night-header: "#1D2566"
  night-header-field: "#10142F"
  night-ink: "#A9B6FF"
  night-on-ink: "#0B0E1D"
  night-ground: "#0B0E1D"
  night-surface: "#151A31"
  night-text: "#E8EBFA"
  night-text-muted: "#A6AED1"
  night-priority-high: "#FF9C96"
  night-priority-medium: "#F0C46C"
  night-priority-low: "#7ED8A6"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 550
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.2
  caption:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.2
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  pill: "999px"
spacing:
  gutter: "16px"
  gutter-wide: "28px"
  column: "42rem"
  column-wide: "68rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.1rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.ink-strong}"
    textColor: "{colors.on-ink}"
  button-soft:
    backgroundColor: "{colors.ink-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.1rem"
    height: "2.75rem"
  capture-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    height: "3.25rem"
  capture-submit:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.pill}"
    size: "2.5rem"
  capture-submit-disabled:
    backgroundColor: "{colors.ink-tint}"
    textColor: "{colors.ink}"
  segment-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "2.5rem"
  filter-chip:
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 0.875rem"
    height: "2.25rem"
  priority-tag-high:
    backgroundColor: "{colors.priority-high-tint}"
    textColor: "{colors.priority-high}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    height: "1.5rem"
  dialog-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.xl}"
    padding: "1.5rem 1.375rem 1.25rem"
  task-group:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
---

# Design System: Task Cloud

## Overview

**Creative North Star: "Ballpoint Ink"**

Task Cloud is a list you write in ballpoint ink. The ink header holds the capture field, so writing a task is the first thing every screen offers. Completing a task draws an ink stroke through it, the way you cross off a line on paper. The phone is the primary scene: a few seconds at a time, one thumb, in daylight and in bed at night.

The previous world (teal on stone, Literata, a flat bookish column with an "Expand form" link and double-click delete) is the anti-reference. So is the slim solid-colour app bar of 2015-era Material apps: the ink here is a generous field with rounded bottom corners that holds real work, not a strip of chrome.

**Key Characteristics:**

- The ink header owns the top of each tab: page name, a one-line summary of what is left, and on the list, the capture field.
- Tasks live in white inset groups on a pale ink ground, separated by hairlines that start where the text starts.
- Priority is a flag plus a word in red, amber, or green. The completion ring takes the same hue.
- The ink cross-off is the signature move.
- Bricolage Grotesque carries the words you read and wrote; the platform sans carries controls.

## Colors

One saturated ink, a pale tint of it as the ground, and three priority hues that never borrow the ink.

### Primary

- **Ballpoint Ink** (#2B3FD0): the header field, primary buttons, the selected segment, selected tag chips, the completion fill, and the cross-off stroke. White text on it is 7.7:1.
- **Pressed Ink** (#2233B4): hover and pressed state of ink fills.
- **Ink Wash** (#E4E8FD): soft buttons, hover grounds, the disabled Add circle.
- **Night** keeps the roles: the header becomes #1D2566 with white text, and actions become periwinkle #A9B6FF with #0B0E1D text.

### Neutral

- **Ink Ground** (#EEF1FA) / night #0B0E1D: the page ground.
- **Paper** (#FFFFFF) / night #151A31: task groups, the sync panel, setting groups, dialogs.
- **Sunken Paper** (#F4F6FC) / night #10142B: fields inside paper (note, tags, editor inputs) and segment tracks inside paper.
- **Blue-black** (#11162F) / night #E8EBFA: text.
- **Slate** (#4B5378) / night #A6AED1: secondary text, counts, quiet buttons.
- **Line** (#DDE2F0) and **Strong Line** (#C3CAE2): hairlines and chip outlines.

### Priority

- **High** #B42330 on #FBE9EA, **Medium** #8F5300 on #FBF0DE, **Low** #167447 on #E3F4EA. Night: #FF9C96, #F0C46C, #7ED8A6 on dark tints.
- **Danger** shares the high red (#B42330 / #FF9C96) for destructive rows and Delete.

**The Separate Priority Rule.** Ink means an action, the current view, or a finished task. Red, amber, and green mean urgency, and the word is always on screen with the hue.

## Typography

**Display font:** Bricolage Grotesque, variable in weight and optical size, self-hosted from `src/assets/fonts`.
**UI font:** the platform sans (`system-ui`, San Francisco, Segoe UI, Roboto).

**Character:** Bricolage's optical sizes make the page names condensed and confident at 30 to 38px and keep task titles open and legible at 17px. The platform sans makes every control feel native on iOS and Android.

### Hierarchy

- **Display** (700, 1.875rem, 2.375rem from 768px): page names. The first-run empty state uses 2.25rem to 2.75rem.
- **Headline** (650, 1.375rem to 1.625rem): the sync panel title, alert and dialog titles, empty-state titles, the Done heading (1.125rem).
- **Title** (550, 1.0625rem): task titles in the list; 1.125rem in the capture field and the editor.
- **Body** (400, 0.9375rem, 1.45): notes, setting notes, dialog text.
- **Label** (600 to 650, 0.875rem to 0.9375rem): segments, chips, buttons.
- **Caption** (650, 0.75rem to 0.8125rem): priority tags, tag chips, counts, tab labels.

The full ramp in use is 0.75, 0.8125, 0.875, 0.9375, 1, 1.0625, 1.125, 1.25, 1.375, 1.5, 1.625, 1.875, 2.25, 2.375, and 2.75rem. Larger steps beyond 1.25rem are display and icon sizes only.

## Layout

- **Phone (< 768px):** one column, at most 44rem, centred, with a 16px gutter. The ink header spans the full width; its content sits in the same column. Under the header: the status switch, the horizontally scrolling chip row with faded edges, then the open group, then the collapsible Done group, and a bottom tab bar.
- **Desktop (768px and up):** the reading column widens to 68rem with a 28px gutter. The ink masthead becomes a framed ink sheet aligned with the workspace column below it; the summary sits inline beside the page title as a translucent pill, search stays open in the header, and the expanded capture field arranges note, priority, tags, and character count in a two-column grid.
- **List, desktop:** the status switch and filter chips share a horizontal control bar; task rows lay out title and note on the left with priority and tag pills aligned on the right beside Edit and Delete actions; at 960px and up, when both Open and Done groups have tasks, they sit side-by-side in an asymmetric two-column ledger with matching headings and counts.
- **Settings, desktop:** a two-column asymmetric grid with the sync panel on the left and Appearance, Language, and Delete data stacked on the right.
- **Navigation, desktop:** the bottom tab bar transforms into a floating pill dock with horizontal icon-and-label pills.

## Elevation & Depth

- One raised shadow for paper on the ground: `0 1px 2px rgba(17,22,47,.05), 0 6px 16px -8px rgba(17,22,47,.16)` (task groups, the status switch, setting groups, the sync panel).
- One float shadow for overlays: `0 18px 40px -12px rgba(17,22,47,.32)` (alerts and the app dialogs: PIN and install guide).
- The capture field lifts off the ink with `0 12px 28px -16px rgba(6,10,40,.6)`.
- Paper never carries a border and a shadow together. Fields inside paper use a sunken fill instead of a border, and a 1.5px inset ink ring on focus.

## Shapes

- Corners: 10px for controls inside paper (inputs, segments), 14px for tracks and the snackbar, 18px for paper groups and the capture field, 24px for the header's bottom corners and dialogs.
- Pills (999px) for buttons, chips, priority tags, and the round Add.
- The completion mark is a circle.

## Components

- **Capture field:** a plus mark, a Bricolage title input, and a round Add button that is ink when the title is valid and an ink wash when it is not. Typing anything opens a fold below with a note, a priority switch, and the tag field; emptying the draft folds it away. Enter adds the task, clears the field, and keeps focus there. Escape with a draft asks before discarding.
- **Segmented control:** one radio group component for status (with counts), priority (taking the priority hue), and language. The selection slides between options; arrow keys move it.
- **Filter chips:** priority chips with outline flags that fill when pressed; tag chips that fill with ink when pressed; a Clear filters chip leads the row when any filter is on.
- **Task row:** a 24px ring in the priority hue, then the title, an optional note, and a meta line of the priority tag and tags. Tapping the ring completes the task; tapping the text opens the editor in place; long-press copies the text; on a phone, swipe right to edit and left to delete.
- **Cross-off:** on completion the ring fills with ink and a check scales in, an ink stroke draws through every line of the title in 320ms, and the row stays put for 650ms before moving to Done. Reduced motion removes the transitions.
- **Inline editor:** an ink-ringed card in place of the row with the title, note, priority, tags, Delete, Cancel, and Save. Escape cancels; Enter saves.
- **Delete:** immediate, with an Undo snackbar for five seconds.
- **Settings rows:** a line icon, a title, and a note in paper groups; destructive rows are red with a chevron. Dark mode is a native Ionic toggle row.
- **Sync panel:** a state icon (device or cloud), a Bricolage headline, a note, and the actions as real buttons.
- **Dialog card:** every app dialog is one paper card, 24px corners, float shadow, at most 25rem wide. The title is the 1.625rem headline, set through Material's dialog title tokens on the panel so it holds in both themes; body text is muted.
- **PIN dialog:** the PIN in Bricolage, in two groups of four, on sunken paper with a copy button; Continue unlocks after the confirmation checkbox.
- **Install button:** a download icon among the header actions, shown only where installing is possible. Where the browser offers its install dialog (Chrome, Edge, Samsung Internet), one tap opens it; on iPhone and iPad it opens the install guide. It disappears once the app is installed.
- **Install guide:** the app icon at Apple's corner rounding, the headline, a one-line reason, then the steps as a numbered list on sunken paper: ink-tint number circles, the action in 650 weight, a muted hint, and the iOS glyph to look for (Share, Add to Home Screen) at the row's end, where iOS shows it. Got it closes; a quiet button hides the install button for good.

## Do's and Don'ts

- Do keep capture to one field and one Add button at the top of the list.
- Do write priority as High, Medium, or Low next to its hue.
- Do use the ink for actions, selection, and finished work, and nothing else.
- Do put destructive actions in settings as sentences that say what is deleted and where.
- Do keep English and Spanish on the translation keys.
- Don't bring back a centred dialog for creating or editing a task.
- Don't show priority by colour alone, and don't use the ink as a priority colour.
- Don't add eyebrow labels, decorative icon tiles, or gradients; the ink field is the only colour block.
- Don't confirm single-task deletes; offer Undo.
