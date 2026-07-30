---
slug: public-layer-private-vault
title: "Designing Ayumad.me as a Public Layer for a Private Vault"
date: "2026-07-29"
summary: A portfolio can be richer than a résumé without turning a private notebook into a public database.
tags: Obsidian|Knowledge systems|Web design|Privacy
readingTime: 7 min
---

## A portfolio hides the connective tissue

Most personal sites compress work into a familiar sequence: short bio, project cards, résumé, contact link. That format is useful, but it leaves out the relationships that make the projects understandable. The computer running a project, the notes that shaped it, and the system built around it usually disappear.

I wanted Ayumad.me to behave more like a map. Projects, systems, gear, and writing should link into one another. A page about Hermes should lead naturally to the knowledge system behind it. A page about two Linux PCs should connect to the hardware index and the decisions that gave each machine a role.

My Obsidian vault already contains those relationships. The challenge is publishing them without publishing the vault.

## The vault is not a content management system

The notebook contains more than polished articles. It has active project notes, device records, maintenance history, unfinished ideas, and material that only makes sense in private context. Treating the entire directory as deployable content would turn an editorial system into an accidental database export.

The public site therefore does not read the vault at runtime or during a Vercel build. Instead, publishing is a deliberate transformation:

1. identify facts or ideas that belong in public;
2. verify them against the current source note;
3. paraphrase them for an outside reader;
4. remove operational and personal detail;
5. commit the public version to the website repository.

That extra step is a feature. It creates a reviewable boundary.

## Visibility is editorial, not merely technical

Metadata can help distinguish personal and private notes, but a field cannot replace judgment. A personal gear record may be safe to summarize while its price, location, or maintenance history is not. A project overview may be public while a runbook for operating it is not.

The site uses the smallest useful public claim. It can say that a workstation runs virtualized services without exposing its network configuration. It can explain that Hermes uses a scoped memory layer without publishing the notes that layer protects.

> A good public layer preserves the meaning of the system without reproducing the private material that makes it personal.

## Designing links instead of dumping notes

The detail pages are structured around questions an outside reader might actually have:

- What problem produced this project?
- Why was the system arranged this way?
- What tradeoff mattered?
- What is still changing?
- Where should I go next?

Those questions produce better web pages than a direct Markdown dump. They also keep the site navigable. Each page can be deep without becoming isolated because related projects, systems, articles, and gear link back into the same map.

## A stable public snapshot

The gear page demonstrates the model clearly. The vault can remain detailed and operational; the site publishes a dated snapshot of the devices that matter to the story. Sold items, uncertain records, prices, and minor accessories stay out. Readers get a truthful picture without receiving an inventory database.

The same approach applies to Now content. Current work belongs beside the projects it describes rather than on a repetitive standalone page. When priorities change, the public snapshot changes deliberately.

## What the boundary enables

Separating the public layer from the vault makes both sides better. The notebook can remain honest, rough, and useful because it is not performing for an audience. The site can remain concise and legible because it is written for one.

Over time, the Blog can become the public adaptation of ideas developed privately. That does not mean every note becomes an article. It means the vault can support careful writing without becoming the thing that gets deployed.
