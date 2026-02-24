# 003: Zustand Over Redux

**Date**: 2024
**Status**: Active

## Context
Needed state management for a complex app with ~50 state domains, persistence, and cross-component reactivity.

## Decision
Zustand with persist middleware and custom storage layer.

## Consequences
- Pro: ~80% less boilerplate than Redux (no actions, reducers, action creators)
- Pro: Built-in persistence middleware (localStorage, with version migration)
- Pro: Simple mental model — just a store with getState/setState
- Pro: Selective subscriptions prevent unnecessary re-renders
- Con: Single store file grew to ~3700 lines — needs structural documentation (store.context.md)
- Con: No dev tools as polished as Redux DevTools
- Mitigation: Custom storage layer handles localStorage → backup → IndexedDB fallback
