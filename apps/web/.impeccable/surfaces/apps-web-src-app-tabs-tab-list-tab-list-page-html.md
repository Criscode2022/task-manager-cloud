---
version: 1
slug: "apps-web-src-app-tabs-tab-list-tab-list-page-html"
primary_target: "apps/web/src/app/tabs/tab-list/tab-list.page.html"
related_targets: ["apps/web/src/app/tabs/tab-options/tab-options.page.html","apps/web/src/app/core/components/pin-dialog/pin-dialog.component.html","apps/web/src/app/tabs/tab-list/task-editor/task-editor.component.html","apps/web/src/app/core/components/install-guide/install-guide.component.html"]
---

## Scope

Operate surface: the list tab, with the settings tab, the task editor, and the PIN dialog as related targets. One person, phone first, opens the app for a few seconds at a time to capture, tick off, and check what is left. Redesign requested on 2026-10-19: replace the teal, stone, and Literata world; keep every flow (create, filter, search, complete, edit, delete, sync, language, theme), EN/ES, offline-first, Ionic shell.

## Direction contract

THESIS: Task Cloud is a list you write in ballpoint ink. The ink header holds the capture field, so writing a task is the first thing the screen offers, and completing one draws an ink stroke through it. It refuses the flat bookish column, the "Expand form" link, the double-click delete, and the solid 2015 app bar.

OWN-WORLD: Ballpoint blue #2B3FD0 owns the header field (night #1D2566 with periwinkle #A9B6FF actions) over a pale ink ground #EEF1FA. Tasks sit in white inset groups with 18px corners. Bricolage Grotesque, with optical sizes, sets titles and the words you wrote; the platform sans sets controls. Priority is a flag plus a word in red, amber, and green, and the completion ring takes the priority hue.

STORY: Open, type, press Enter: the task lands highlighted and the field stays ready for the next one. Tap a ring to cross a task off; tap a task to edit it in place. Status and filter chips are always visible. Deleting offers Undo instead of a confirmation.

FIRST VIEWPORT: Phone 390 wide. Ink header: "Task Cloud" at 30px in Bricolage, white, left; search and sync icons right; "4 open, 1 done" under the name; the white capture field (52px, plus mark, round Add) closes the header, whose bottom corners round at 24px. On the ground: All / Pending / Done segmented with counts, a scrolling chip row for priority and tags, then the open group. Desktop: same order in a 44rem column, search inline in the header. Signature interaction: the ink cross-off; a stroke draws through the title left to right in 320ms, the ring fills with ink and a check, then the row settles into Done. Reduced motion makes it instant.

FORM: Ballpoint ink, first on the ordered list; chosen directly because the project rule replaces the direction hand. Seed key: direct-choice.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- None at build start.
