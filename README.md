# Teacher's Planner — Obsidian Plugin

Calendar, week, and timeline views over notes with date front matter. Built for teachers — but useful for anyone who wants their markdown notes shown on a calendar with weekly material lists and per-tag color coding.

## Features

- **Three views**: month grid, Mon–Fri week with hourly grid (7 am–5 pm by default), chronological timeline
- **Tag-as-class color coding** computed deterministically from the tag name — `year-7` and `year-9` always come out visibly different
- **Tag filtering** with a dropdown in the toolbar, plus click any tag pill anywhere to filter to it
- **Weekly requirements panel**: scrape `## Requirements` sections from each lesson's body and aggregate them into a weekly checklist (or per-session breakdown — "5× printed worksheets, 3× whiteboard markers, 2× projectors")
- **Recurring lessons**: create a lesson that repeats weekly until a chosen end date — each occurrence gets its own `.md` file you can edit independently
- **Click to open**: click any event or timeline item to open the underlying note in Obsidian's editor — there's no separate edit modal because Obsidian already has one
- **Live updates** via Obsidian's vault events — no polling
- **Settings tab**: configure source folder, week start day, hour range, default duration, custom front-matter date field names, custom requirements heading aliases

## How entries are recognized

Any markdown file inside the configured source folder (or anywhere in your vault, if no folder is set) with a `date:` field in its front matter shows up on the planner. A typical lesson note:

```yaml
---
title: Year 9 Maths — quadratics
date: 2026-05-12 09:30
end: 2026-05-12 10:30
tags: [year-9, maths]
---
```

The fallback fields tried in order are `date`, `created`, `published` — change them in settings.

For end times, supported keys are `end`, `end_date`, `endDate`, or a `duration: 30m` field. Tags are picked up from both YAML front matter (array or comma string) and Obsidian inline `#tags`.

## Requirements section

If your lesson note contains a heading called `Requirements`, `Materials`, `Equipment`, `Needs`, or `Requires` (case-insensitive, configurable), the bullet list under it shows on the entry card and is aggregated in the weekly summary panel:

```markdown
## Requirements

- printed worksheets × 28
- whiteboard markers
- graphing calculators (book from store cupboard)
```

The weekly panel lets you switch between **Aggregated** (one row per unique requirement, with a count of how many sessions need it) and **Per-session** (one block per lesson that has requirements, in chronological order).

## Build and side-load

```bash
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into:

```
<your-vault>/.obsidian/plugins/teachers-planner/
```

Then in Obsidian: Settings → Community plugins → Reload, then enable "Teacher's Planner".

For development with auto-rebuild on save:

```bash
npm run dev
```

## Sample vault

`sample-vault/` is a ready-to-use Obsidian vault with the plugin pre-installed and four example lesson notes. Open it as a vault and the calendar tab is already there with sample data.

## Submitting to the official Obsidian directory

See `SUBMISSION.md` for the full guide. Short version:

1. Push the repo to GitHub (public)
2. Tag a release (`1.0.0` — no `v` prefix) with `manifest.json`, `main.js`, `styles.css` attached as binary assets
3. Submit a PR to [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) adding your plugin to `community-plugins.json`
4. Wait a few weeks for review

## Architecture

```
src/
├── main.ts                       # Plugin entry, registers view + commands + settings tab
├── types.ts                      # Entry, settings, view-mode types
├── settingsTab.ts                # Settings UI
├── helpers/
│   ├── entryStore.ts             # Wraps vault + metadataCache, emits events
│   ├── parsing.ts                # Requirements section extraction, tag normalization
│   ├── dateUtil.ts               # Date math, parsing, formatting
│   └── tagColor.ts               # Deterministic per-tag colors
├── views/
│   ├── calendarView.ts           # Main ItemView, toolbar, view switcher
│   ├── monthView.ts              # Month grid
│   ├── weekView.ts               # Mon–Fri hourly week
│   ├── timelineView.ts           # Chronological list with markdown body rendering
│   ├── detailPanel.ts            # Right-hand "selected day" panel
│   └── requirementsPanel.ts      # Left-hand weekly summary
└── modals/
    └── newEntryModal.ts          # Create-entry sheet (with recurrence)
```

The store uses Obsidian's `metadataCache` (which already parses front matter) and watches `vault.create/delete/modify/rename` events with a 200 ms debounce.

## License

MIT — see `LICENSE`.
