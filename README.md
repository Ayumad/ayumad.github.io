# Ayumad Knowledge

A navigable public documentation layer generated from Ayush Madhukar’s Obsidian vault.

The site reorganizes projects, systems, interests, reference notes, inventories, and
historical context into stable public routes. It intentionally does not reproduce the
vault’s folder tree or publish internal maintenance material and archive duplicates.

## Local development

Requires Node.js 22 and access to the vault at `/Users/ayumad/Documents/Main`.

```bash
npm ci
npm run dev
```

The exporter runs before development and builds the public content manifest and search
index. Override the vault location with `OBSIDIAN_VAULT=/path/to/vault`.

## Publishing

Run a reviewed one-time synchronization:

```bash
npm run sync
```

The command exports the vault, checks the site, runs tests, creates a production build,
and commits/pushes generated changes only if every step succeeds. Set `SYNC_PUSH=0` to
create a local commit without pushing.

Install the macOS background watcher:

```bash
npm run automation:install
```

It watches for Markdown and media edits, waits for a batch of changes to settle, and
performs the same safe publication sequence. A 30-minute scheduled run catches missed
filesystem events. Overlapping runs are prevented with a lock.

Useful controls:

- Pause: `launchctl disable gui/$(id -u)/me.ayumad.knowledge-sync`
- Resume: `launchctl enable gui/$(id -u)/me.ayumad.knowledge-sync`
- Logs: `~/Library/Logs/AyumadKnowledge/`
- Remove automation: `npm run automation:uninstall`

## Content boundaries

The exporter reads the vault but never modifies it. It excludes raw inboxes, daily-note
scaffolding, legacy archive copies, generated datasets, operational dashboards, agent
instructions, system maintenance notes, and credential-like content. Substantive
projects, areas, resources, inventories, and reference material remain eligible.

`export-report.json` records source counts, skipped files, duplicate consolidation, and
unresolved vault links after every export.

## Deployment

GitHub Actions validates the committed generated content and deploys the static `dist`
artifact to GitHub Pages. A failed validation leaves the last healthy production
deployment unchanged.
