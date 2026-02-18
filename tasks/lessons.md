# Lessons Learned

<!-- Updated after corrections. Review at session start. -->

## Display & Units
- **Water**: Always display in liters (glasses × 0.25), never raw glass count
- **Protein messages**: Show actual grams (e.g. 70/156g) not just percentages — users need actionable numbers

## Light Mode
- `text-grappler-400/500/600` must map to dark enough values (slate-600/500/500 minimum) for readability on white
- Glassmorphic `white/[0.0x]` patterns are invisible in light mode — override with slate-tinted colors
- Badge styles need explicit light-mode overrides (pastel bg + darker text)

## UX Patterns
- Never hide actionable info behind overlays — weight bump suggestions must be visible during rest timer
- Full-screen overlays should always be minimizable so users can check underlying content
