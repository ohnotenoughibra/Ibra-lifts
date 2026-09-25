// 4 tabs: Home / Train / Body / Tools.
// 'train' = workouts. 'body' = body tracking + stats.
// 'tools' = the universal tool catalog (search + recents + pinned + categories + quick log).
// Promoting Tools from a bottom-sheet launcher to a real tab means exiting an
// overlay returns the user to the Tools tab — not to whichever tab they happened
// to be on when they tapped the launcher.
export type TabType = 'home' | 'train' | 'body' | 'tools';
export type OverlayView = 'builder' | 'nutrition' | 'wearable' | 'competition' | 'mobility' | 'coach' | 'strength' | 'periodization' | 'recovery' | 'injury' | 'overload' | 'custom_exercise' | 'templates' | 'volume_map' | 'grappling' | 'quick_actions' | 'grip_strength' | 'program_browser' | 'illness' | 'cycle_tracking' | 'fatigue' | 'fight_camp' | 'badge_showcase' | 'warm_up' | 'movement_library' | 'conditioning' | 'training_journal' | 'knowledge_hub' | 'profile_settings' | 'rehab' | 'injury_aware_workout' | 'plyometrics' | 'energy_systems' | 'athletic_benchmarks' | 'technique_log' | 'camp_timeline' | 'coach_report' | 'sparring_tracker' | 'cardio_planner' | 'crews' | 'sprints' | null;
