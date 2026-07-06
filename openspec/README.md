# SemStreams UI OpenSpec

SemStreams UI uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for
spec-driven changes that affect product scope, backend contracts, proxy routing,
or user-visible workflows.

The repo is generic operational glass for SemStreams-compatible apps. SemSource
is the first acceptance target, and SemDev is an additional customer for the
same optional dashboard/admin/graph/search surface with a stronger trajectory
visibility need. Product-specific semantics still belong in the consuming
product repos. This repo owns reusable UI and browser-facing integration
contracts.

## Layout

- `project.md` - standing project context, boundaries, and conventions.
- `config.yaml` - machine-readable OpenSpec context and artifact rules.
- `specs/<capability>/spec.md` - current truth for implemented capabilities.
- `changes/<id>/proposal.md` - proposed change, with why, what changes, and
  non-goals.
- `changes/<id>/specs/<capability>/spec.md` - target-state spec deltas.
- `changes/<id>/design.md` - design decisions for cross-cutting changes.
- `changes/<id>/tasks.md` - implementation checklist in dependency order.
- `changes/archive/` - completed changes after `openspec archive`.

## Discipline

Seed specs lazily. When a change touches an area, distill the current behavior
from code, tests, and docs before writing target deltas. Do not invent a full
spec inventory up front.

Archive completed changes. Durable behavior gets promoted into `specs/`; stale
proposal folders should not become another docs graveyard.

Validate before handoff:

```bash
task openspec:validate
task openspec:doctor
task openspec:status
```
