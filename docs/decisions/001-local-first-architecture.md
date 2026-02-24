# 001: Local-First Architecture

**Date**: 2024
**Status**: Active

## Context
Needed to decide between server-first (traditional SaaS) vs local-first (offline-capable) architecture for a fitness app used in gyms with spotty connectivity.

## Decision
Local-first with cloud sync. Zustand store persists to localStorage immediately. Server is a backup with conflict resolution, not the source of truth.

## Consequences
- Pro: App works fully offline — critical for gym environments with poor signal
- Pro: Zero latency on all user actions (no waiting for server)
- Pro: User owns their data locally
- Pro: Simpler server — just a JSONB blob, not a normalized schema
- Con: Sync conflicts require resolution logic (union merge by ID)
- Con: localStorage has ~5MB limit (requires auto-pruning)
- Con: Data regression risk (corrupted localStorage could overwrite server) — mitigated by richness scoring
