// 4 tabs: Home / Train / Body / Tools.
// 'train' = workouts. 'body' = body tracking + stats.
// 'tools' = the universal tool catalog (search + recents + pinned + categories + quick log).
// Promoting Tools from a bottom-sheet launcher to a real tab means exiting an
// overlay returns the user to the Tools tab — not to whichever tab they happened
// to be on when they tapped the launcher.
export type TabType = 'home' | 'train' | 'body' | 'tools';
export type OverlayView = 'builder' | 'nutrition' | 'wearable' | 'competition' | 'mobility' | 'coach' | 'profiler' | 'strength' | 'periodization' | 'recovery' | 'injury' | 'overload' | 'custom_exercise' | 'one_rm' | 'hr_zones' | 'templates' | 'volume_map' | 'grappling' | 'community_share' | 'quick_actions' | 'grip_strength' | 'recovery_coach' | 'recovery_hub' | 'block_suggestion' | 'program_browser' | 'user_guide' | 'illness' | 'cycle_tracking' | 'fatigue' | 'fight_camp' | 'badge_showcase' | 'auto_throttle' | 'corner_coach' | 'training_load' | 'warm_up' | 'plate_calc' | 'circuit_builder' | 'photo_progress' | 'breathing' | 'split_analyzer' | 'movement_library' | 'conditioning' | 'fighters_mind' | 'training_journal' | 'knowledge_hub' | 'profile_settings' | 'wellness_xp' | 'rehab' | 'injury_aware_workout' | 'plyometrics' | 'energy_systems' | 'athletic_benchmarks' | 'technique_log' | 'camp_timeline' | 'coach_report' | 'sparring_tracker' | null;
