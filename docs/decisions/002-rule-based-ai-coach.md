# 002: Rule-Based AI Coach (Not LLM)

**Date**: 2024
**Status**: Active

## Context
Needed coaching logic for workout adjustments, nutrition advice, and recovery recommendations. Two options: (1) Call an LLM API for each recommendation, (2) Build rule-based engines with hardcoded domain expertise.

## Decision
Rule-based engines. All "AI" coaching (ai-coach.ts, diet-coach.ts, recovery-coach.ts, corner-coach.ts) is deterministic rule synthesis, not LLM-powered.

## Consequences
- Pro: Zero latency — instant recommendations
- Pro: Works offline (no API dependency)
- Pro: No API costs (critical for free tier users)
- Pro: Deterministic — same inputs always produce same outputs (testable)
- Pro: Evidence-based — rules cite specific papers (Helms 2014, Cunningham 1991, etc.)
- Con: Limited to pre-coded patterns — can't handle novel situations
- Con: Adding new coaching scenarios requires code changes
- Future: Could add LLM layer on top for conversational coaching while keeping rule engines as the foundation
