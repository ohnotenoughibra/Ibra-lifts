# 004: Large Monolithic Components

**Date**: 2024
**Status**: Active — with context files to navigate

## Context
ActiveWorkout.tsx grew to ~4100 lines. Options: (1) Split into dozens of smaller components, (2) Keep monolithic with documentation.

## Decision
Keep large components monolithic, add `.context.md` files to navigate them.

## Rationale
Splitting would scatter tightly-coupled workout logic across many files with complex prop drilling, shared state coordination, and cross-component effects. The "cleanup" would actually increase cognitive load — you'd need to understand 15 files instead of 1 to make a change.

## Consequences
- Pro: All related logic in one file — grep finds everything
- Pro: No prop drilling or context plumbing between sub-components
- Pro: Easier to understand data flow (top to bottom in one file)
- Con: IDE struggles with 4000+ line files
- Con: New developers need a map to navigate — hence the context files
- Mitigation: `.context.md` files provide section index with line ranges
