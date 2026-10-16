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

- Installable PWA built with Ionic, opened from a phone's home screen.
- Two tabs: the list and settings.
- Tasks have a title (40 characters), an optional description (30 characters), a priority (high, medium, low), and up to six tags.
- The list filters by status (all, pending, done), priority, tag, and a text search.
- On a phone, tasks swipe to edit or delete. Long-press copies the text or shows the full text.
- Settings: upload tasks to get a PIN, log in with a PIN, go offline, dark mode, language, delete all tasks, delete account.

## Capabilities and Constraints

- English and Spanish. All user-facing copy goes through the translation files.
- Tasks must work without the API. Sync is the only feature that needs the network.
- Priority uses red, amber, and green, kept separate from the brand color.
- Keep Ionic, Ionic Storage, the service worker, and the tab shell.

## Brand Commitments

- Name: Task Cloud.
- The plum and ink palette is no longer binding (the user approved a new palette on 2026-10-16).

## Evidence on Hand

No testimonials, metrics, or customer data. Do not invent any.

## Product Principles

1. Capture first: adding a task is always one tap away and takes seconds.
2. Show what is left: pending work is easy to scan, and finished work steps back.
3. Local by default: nothing in the interface suggests an account is needed.
4. Destructive actions say exactly what they will delete and where.

## Accessibility & Inclusion

WCAG 2.1 AA: color contrast, visible keyboard focus, labelled controls, and priority never shown by color alone. Respect reduced motion.
