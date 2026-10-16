---
name: Task Cloud
description: A personal task list you write into, then read.
colors:
  teal: "#0B5E5A"
  teal-night: "#8ED9D2"
  on-teal: "#FFFFFF"
  on-teal-night: "#10211F"
  stone: "#F3F5F4"
  night: "#101614"
  ink: "#1A2421"
  ink-night: "#E7F0EC"
  surface: "#FFFFFF"
  surface-night: "#1B2421"
  muted: "#3D524C"
  muted-night: "#C5D5CE"
  line: "#C9D4CF"
  priority-high: "#9F2D2D"
  priority-medium: "#8A5B00"
  priority-low: "#1A6B3C"
typography:
  display:
    fontFamily: "Literata, Iowan Old Style, Palatino, Georgia, serif"
    fontSize: "1.65rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Literata, Iowan Old Style, Palatino, Georgia, serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Figtree, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Figtree, Segoe UI, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
rounded:
  sm: "0.4rem"
  md: "0.75rem"
  lg: "0.85rem"
spacing:
  dock: "1rem"
  column: "42rem"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.on-teal}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 1rem"
    height: "3.5rem"
  button-primary-disabled:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0 1rem"
    height: "3.5rem"
  status-selected:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.on-teal}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.35rem 0.4rem"
    height: "2.5rem"
  capture-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "0.75rem"
---

# Design System: Task Cloud

## Overview

**Creative North Star: "The Pocket Column"**

Task Cloud is one column you write into, then read. The capture line is the first control on the list. Status is a visible three-way switch. Finished work steps below what is still open. The phone is the primary scene: daylight stone by day, a near-black green at night.

The old card stack, the filter that cycled through hidden states, and the centered create dialog are the anti-reference. Priority is never the brand color, and it is never color alone.

**Key Characteristics:**

- Capture stays on the page as a title field and an Add button.
- All, Pending, and Done are always visible.
- Priority and tags stay folded until you ask to narrow the list.
- Open tasks sit above done tasks when both are on screen.
- Settings are labeled rows.
- Literata carries the words you read. Figtree carries the controls.

## Colors

Daylight is a cool stone ground with one deep teal for action. Night keeps the same roles and lightens the teal so it can be text or a fill.

### Primary

- **Pocket Teal** (#0B5E5A): selected status, Add, and other primary actions in daylight. White text on this fill.
- **Night Teal** (#8ED9D2): the same role after dark mode. Text on the fill is #10211F.

### Neutral

- **Daylight Stone** (#F3F5F4): page ground.
- **Night Ground** (#101614): page ground in dark mode.
- **Paper** (#FFFFFF): fields, the status switch, and dialogs in daylight.
- **Night Paper** (#1B2421): the same surfaces in dark mode.
- **Ink** (#1A2421): text in daylight.
- **Night Ink** (#E7F0EC): text in dark mode.
- **Moss** (#3D524C): secondary text in daylight.
- **Night Moss** (#C5D5CE): secondary text in dark mode.
- **Line** (#C9D4CF): borders and the disabled Add fill.

### Priority

Priority is a word plus a hue, and it is not teal.

- **High** (#9F2D2D), **Medium** (#8A5B00), **Low** (#1A6B3C) in daylight.
- Dark mode uses #FFB4AB, #F5D48A, and #9EE0B8, with #10211F text when one of those fills is the selected choice.

**The Separate Priority Rule.** Teal means an action or the current view. Red, amber, and green mean how urgent a task is, and the word is always present.

## Typography

**Display Font:** Literata (with Iowan Old Style, Palatino, Georgia)
**Body Font:** Figtree (with Segoe UI)

**Character:** Literata is the task itself: the page name, the title you type, and the title in the list. Figtree is the chrome: switches, buttons, notes, and settings.

### Hierarchy

- **Display** (600, 1.65rem, 1.1): the page name and the settings status sentence.
- **Title** (600, 1.2rem, 1.25): a task title.
- **Body** (400, 1rem, 1.45): descriptions, empty-state copy, setting notes.
- **Label** (600, 0.92rem, 1.2): status options, Add, and row actions.

## Layout

The column is at most 42rem and centered. The header holds the name and search. Under it, a sticky dock holds the status switch and the capture line, so adding a task does not require scrolling back. The list follows. On a phone, search is a button that opens a panel; from 768px up, search is a field in the header and each row shows Edit and Delete. Swipe to edit or delete stays on the phone.

Finished tasks move under a Done heading when the view is All and both groups exist. Pending stays above that heading.

## Elevation & Depth

The list is flat. Rows are separated by a hairline, not a shadow. Dialogs (search, edit, the PIN) use one shadow: `0 16px 36px rgba(16, 33, 31, 0.18)`. A border and a shadow are not stacked on the same surface.

## Shapes

Controls use 0.75rem to 0.85rem corners. The completion mark is a circle. Status and language switches are a rounded track with a filled selection, not a pill on every control.

## Components

- **Capture line:** a title field and Add. Add is teal when the title is valid and Line-colored when it is not. Details fold open under the line.
- **Status switch:** All, Pending, Done. The selected option is Pocket Teal.
- **Task row:** completion circle, Literata title, optional description and tags, priority word. Done titles are struck through in Moss.
- **Settings row:** the action name and a short note. Destructive rows use the danger color on the name.
- **Language switch:** the same track as status, with the language names as the options.

## Do's and Don'ts

- Do keep adding a task to one field and one button.
- Do write priority as High, Medium, or Low.
- Do put destructive actions in settings as full sentences about what will be deleted.
- Do keep English and Spanish on the existing translation keys.
- Don't bring back a centered dialog for creating a task.
- Don't cycle All, Pending, and Done through one unlabeled button.
- Don't show priority by color alone.
- Don't use the teal as a priority color.
