# 006: Claude for food logging and meal ideas (targets stay rule-based)

**Date**: 2026-09
**Status**: Active — narrows ADR 002

## Context
Logging is the part of nutrition people quit. Search + grams works for single foods but not for "2 Semmeln mit Schinken und eine Melange" or a photo of a plate, and a fixed recipe book can't cover every craving or restriction.

## Decision
Use Claude (`claude-opus-5`, structured outputs, server-side refusal fallback) for two things only, via `/api/nutrition/ai`:
1. **Parse** — text or a photo → foods with grams and macros, grounded on the built-in per-100 g table. The athlete reviews and edits before anything is logged.
2. **Suggest** — meal ideas for a slot's remaining macros from Austrian supermarket food, honouring diet and dislikes.

Targets, expenditure, fight-week protocols and recipe fitting stay deterministic (ADR 002): the numbers must be testable, offline and identical across screens.

## Consequences
- Needs `ANTHROPIC_API_KEY`; without it the route returns 503 and the app falls back to search, recipes and quick add.
- 40 calls per user per day (Postgres-backed limiter, like ai-coach).
- Nothing is logged without the athlete confirming it; AI entries carry `source: 'ai'`.
