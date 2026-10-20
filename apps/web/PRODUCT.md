# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person keeping their own to-do list, mostly on a phone. They open the app many times a day for a few seconds at a time: add something before they forget it, tick something off, check what is left. Some use it on a desktop too, but the phone is the primary device.

## Product Purpose

Task Cloud is a personal task list. People create, edit, complete, delete, search, and filter tasks on their own device, including with no network. Success is capturing a task in seconds and seeing at a glance what still needs doing.

## Positioning

The list lives on the device first and works fully offline, with no account. Cloud sync is optional and needs no email or password: an 8-digit PIN syncs the same list across devices.

## Operating Context

- Installable PWA built with Ionic, opened from a phone's home screen. The header's install button opens the browser's install dialog where one exists (Chromium browsers) and shows the Share → Add to Home Screen steps on iPhone and iPad; it hides once the app is installed.
- Two tabs: the list and settings.
- Tasks have a title (40 characters), an optional description (30 characters), a priority (high, medium, low), and up to six tags.
- The list filters by status (all, pending, done), priority, tag, and a text search.
- Tapping the ring completes a task; tapping its text edits it in place. On a phone, tasks also swipe to edit or delete. Long-press copies the text. Deleting offers Undo.
- Settings: upload tasks to get a PIN, log in with a PIN, go offline, dark mode, language, delete all tasks, delete account.

## Capabilities and Constraints

- English and Spanish. All user-facing copy goes through the translation files.
- Tasks must work without the API. Sync is the only feature that needs the network.
- Priority uses red, amber, and green, kept separate from the brand color.
- Keep Ionic, Ionic Storage, the service worker, and the tab shell.

## Brand Commitments

- Name: Task Cloud.
- The teal, stone, and Literata identity was replaced on 2026-10-19 at the user's request; the "Ballpoint Ink" world in DESIGN.md is current.

## Evidence on Hand

No testimonials, metrics, or customer data. Do not invent any.

## Product Principles

1. Capture first: adding a task is always one tap away and takes seconds.
2. Show what is left: pending work is easy to scan, and finished work steps back.
3. Local by default: nothing in the interface suggests an account is needed.
4. Destructive actions say exactly what they will delete and where.

## Accessibility & Inclusion

WCAG 2.1 AA: color contrast, visible keyboard focus, labelled controls, and priority never shown by color alone. Respect reduced motion.
