/**
 * Template Marketplace — Training block template sharing & discovery
 *
 * Browse, filter, rate, and create combat-sport-focused program templates.
 * Templates are stored as lightweight metadata (preview only, not full programs).
 * When a user "downloads" a template, the workout generator hydrates it
 * into a real mesocycle using their profile and equipment.
 *
 * Pure functions only — no React, no store, no side effects.
 */

import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type SportTag = 'general' | 'grappling' | 'striking' | 'mma';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type TemplateCategory = 'featured' | 'popular' | 'new' | 'sport_specific' | 'beginner_friendly';

export interface ProgramWeekPreview {
  weekNumber: number;
  label: string; // e.g. 'Accumulation Week 1'
  sessionCount: number;
  focusMuscles: string[];
  averageRPE: number;
}

export interface ProgramTemplate {
  id: string;
  name: string;
  author: string;
  authorId: string;
  description: string;
  sport: SportTag[];
  goal: string; // e.g. 'Peaking for MMA', 'Grappler Strength Base'
  experienceLevel: ExperienceLevel[];
  durationWeeks: number;
  sessionsPerWeek: number;
  tags: string[];
  rating: number; // 0-5
  ratingCount: number;
  downloads: number;
  preview: ProgramWeekPreview[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFilters {
  sport?: string;
  goal?: string;
  experienceLevel?: string;
  minWeeks?: number;
  maxWeeks?: number;
  minRating?: number;
  searchQuery?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimum downloads to qualify for "popular" category */
const POPULAR_THRESHOLD = 50;

/** Minimum rating to qualify for "featured" */
const FEATURED_MIN_RATING = 4.0;

/** Minimum rating count to be considered for "featured" */
const FEATURED_MIN_RATING_COUNT = 10;

/** Templates created within this many days are considered "new" */
const NEW_TEMPLATE_DAYS = 30;

// ═══════════════════════════════════════════════════════════════════════════════
// Filtering & Sorting
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Filter templates by multiple criteria. All filters are AND-combined.
 * Text search matches against name, description, goal, and tags.
 */
export function filterTemplates(
  templates: ProgramTemplate[],
  filters: TemplateFilters,
): ProgramTemplate[] {
  return templates.filter((t) => {
    if (filters.sport && !t.sport.includes(filters.sport as SportTag)) return false;
    if (filters.goal && !t.goal.toLowerCase().includes(filters.goal.toLowerCase())) return false;
    if (
      filters.experienceLevel &&
      !t.experienceLevel.includes(filters.experienceLevel as ExperienceLevel)
    )
      return false;
    if (filters.minWeeks != null && t.durationWeeks < filters.minWeeks) return false;
    if (filters.maxWeeks != null && t.durationWeeks > filters.maxWeeks) return false;
    if (filters.minRating != null && t.rating < filters.minRating) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const searchable = [t.name, t.description, t.goal, ...t.tags]
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  });
}

/**
 * Sort templates by the given criterion. Returns a new array.
 */
export function sortTemplates(
  templates: ProgramTemplate[],
  sortBy: 'rating' | 'downloads' | 'newest' | 'duration',
): ProgramTemplate[] {
  const sorted = [...templates];

  switch (sortBy) {
    case 'rating':
      // Weighted: higher rating count breaks ties
      sorted.sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
      break;
    case 'downloads':
      sorted.sort((a, b) => b.downloads - a.downloads);
      break;
    case 'newest':
      sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    case 'duration':
      sorted.sort((a, b) => a.durationWeeks - b.durationWeeks);
      break;
  }

  return sorted;
}

/**
 * Categorize templates into buckets for the marketplace landing page.
 * A template can appear in multiple categories.
 */
export function categorizeTemplates(
  templates: ProgramTemplate[],
): Record<TemplateCategory, ProgramTemplate[]> {
  const now = Date.now();
  const newCutoff = NEW_TEMPLATE_DAYS * 24 * 60 * 60 * 1000;

  return {
    featured: templates.filter(
      (t) => t.rating >= FEATURED_MIN_RATING && t.ratingCount >= FEATURED_MIN_RATING_COUNT,
    ),
    popular: sortTemplates(
      templates.filter((t) => t.downloads >= POPULAR_THRESHOLD),
      'downloads',
    ),
    new: sortTemplates(
      templates.filter((t) => now - new Date(t.createdAt).getTime() < newCutoff),
      'newest',
    ),
    sport_specific: templates.filter(
      (t) => t.sport.some((s) => s !== 'general'),
    ),
    beginner_friendly: templates.filter((t) => t.experienceLevel.includes('beginner')),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Template CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new program template with generated ID and timestamps.
 * Starts with zero rating and zero downloads.
 */
export function createProgramTemplate(params: {
  name: string;
  author: string;
  authorId: string;
  description: string;
  sport: SportTag[];
  goal: string;
  experienceLevel: ExperienceLevel[];
  durationWeeks: number;
  sessionsPerWeek: number;
  tags: string[];
  preview: ProgramWeekPreview[];
}): ProgramTemplate {
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    name: params.name,
    author: params.author,
    authorId: params.authorId,
    description: params.description,
    sport: params.sport,
    goal: params.goal,
    experienceLevel: params.experienceLevel,
    durationWeeks: params.durationWeeks,
    sessionsPerWeek: params.sessionsPerWeek,
    tags: params.tags,
    rating: 0,
    ratingCount: 0,
    downloads: 0,
    preview: params.preview,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Apply a new rating to a template using cumulative average.
 * Rating is clamped to 0-5 range. Returns a new template object.
 */
export function rateTemplate(
  template: ProgramTemplate,
  newRating: number,
): ProgramTemplate {
  const clamped = Math.max(0, Math.min(5, newRating));
  const totalRating = template.rating * template.ratingCount + clamped;
  const newCount = template.ratingCount + 1;

  return {
    ...template,
    rating: Math.round((totalRating / newCount) * 100) / 100, // 2 decimal precision
    ratingCount: newCount,
    updatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Built-in Templates
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns curated built-in templates for users who haven't discovered community content yet.
 * These serve as starting points and demonstrate the template format.
 *
 * IDs are deterministic (not random) so they can be referenced stably.
 */
export function getBuiltInTemplates(): ProgramTemplate[] {
  const now = new Date().toISOString();
  const base = {
    authorId: 'system',
    author: 'Roots Gains',
    rating: 4.5,
    ratingCount: 100,
    downloads: 0,
    createdAt: now,
    updatedAt: now,
  };

  return [
    {
      ...base,
      id: 'builtin-grappler-strength-base',
      name: 'Grappler Strength Base',
      description:
        'Build a foundation of strength for grappling with emphasis on posterior chain, grip endurance, and hip power. Periodized from accumulation to intensification.',
      sport: ['grappling'],
      goal: 'Grappler Strength Base',
      experienceLevel: ['intermediate', 'advanced'],
      durationWeeks: 8,
      sessionsPerWeek: 4,
      tags: ['grappling', 'strength', 'posterior chain', 'grip', 'bjj', 'wrestling'],
      preview: [
        { weekNumber: 1, label: 'Accumulation 1', sessionCount: 4, focusMuscles: ['back', 'legs', 'grip'], averageRPE: 6.5 },
        { weekNumber: 2, label: 'Accumulation 2', sessionCount: 4, focusMuscles: ['back', 'legs', 'grip'], averageRPE: 7.0 },
        { weekNumber: 3, label: 'Accumulation 3', sessionCount: 4, focusMuscles: ['back', 'legs', 'shoulders'], averageRPE: 7.5 },
        { weekNumber: 4, label: 'Deload', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 5.0 },
        { weekNumber: 5, label: 'Intensification 1', sessionCount: 4, focusMuscles: ['back', 'legs', 'grip'], averageRPE: 7.5 },
        { weekNumber: 6, label: 'Intensification 2', sessionCount: 4, focusMuscles: ['back', 'legs', 'grip'], averageRPE: 8.0 },
        { weekNumber: 7, label: 'Intensification 3', sessionCount: 4, focusMuscles: ['back', 'legs', 'shoulders'], averageRPE: 8.5 },
        { weekNumber: 8, label: 'Test/Deload', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 5.5 },
      ],
    },
    {
      ...base,
      id: 'builtin-mma-peaking',
      name: 'MMA Peaking Protocol',
      description:
        'Six-week peaking block for MMA fighters approaching competition. Shifts from strength emphasis to power and conditioning while managing fatigue for fight readiness.',
      sport: ['mma'],
      goal: 'Peaking for MMA',
      experienceLevel: ['intermediate', 'advanced'],
      durationWeeks: 6,
      sessionsPerWeek: 3,
      tags: ['mma', 'peaking', 'power', 'conditioning', 'fight camp'],
      preview: [
        { weekNumber: 1, label: 'Strength Maintenance', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 7.0 },
        { weekNumber: 2, label: 'Power Emphasis', sessionCount: 3, focusMuscles: ['legs', 'shoulders', 'core'], averageRPE: 7.5 },
        { weekNumber: 3, label: 'Power + Conditioning', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 8.0 },
        { weekNumber: 4, label: 'Peak Power', sessionCount: 3, focusMuscles: ['legs', 'back', 'core'], averageRPE: 8.5 },
        { weekNumber: 5, label: 'Taper Start', sessionCount: 2, focusMuscles: ['full body'], averageRPE: 6.5 },
        { weekNumber: 6, label: 'Fight Week', sessionCount: 1, focusMuscles: ['full body'], averageRPE: 4.0 },
      ],
    },
    {
      ...base,
      id: 'builtin-striking-power',
      name: 'Striking Power Block',
      description:
        'Four-week power development block for strikers. Focuses on rotational power, hip extension, and reactive strength to improve knockout potential.',
      sport: ['striking'],
      goal: 'Striking Power Development',
      experienceLevel: ['intermediate', 'advanced'],
      durationWeeks: 4,
      sessionsPerWeek: 3,
      tags: ['striking', 'power', 'rotational', 'boxing', 'muay thai', 'kickboxing'],
      preview: [
        { weekNumber: 1, label: 'Strength Foundation', sessionCount: 3, focusMuscles: ['legs', 'core', 'shoulders'], averageRPE: 7.0 },
        { weekNumber: 2, label: 'Power Introduction', sessionCount: 3, focusMuscles: ['legs', 'core', 'back'], averageRPE: 7.5 },
        { weekNumber: 3, label: 'Peak Power', sessionCount: 3, focusMuscles: ['legs', 'core', 'shoulders'], averageRPE: 8.0 },
        { weekNumber: 4, label: 'Reactive Power', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 7.5 },
      ],
    },
    {
      ...base,
      id: 'builtin-offseason-hypertrophy',
      name: 'Off-Season Hypertrophy',
      description:
        'Twelve-week hypertrophy block for the off-season. High volume, progressive overload, and balanced muscle development. Ideal when not in fight camp.',
      sport: ['general'],
      goal: 'Off-Season Muscle Building',
      experienceLevel: ['beginner', 'intermediate', 'advanced'],
      durationWeeks: 12,
      sessionsPerWeek: 5,
      tags: ['hypertrophy', 'muscle', 'off-season', 'volume', 'bodybuilding'],
      preview: [
        { weekNumber: 1, label: 'Anatomical Adaptation', sessionCount: 5, focusMuscles: ['full body'], averageRPE: 6.0 },
        { weekNumber: 2, label: 'Accumulation 1', sessionCount: 5, focusMuscles: ['chest', 'back', 'legs'], averageRPE: 6.5 },
        { weekNumber: 3, label: 'Accumulation 2', sessionCount: 5, focusMuscles: ['chest', 'back', 'legs'], averageRPE: 7.0 },
        { weekNumber: 4, label: 'Accumulation 3', sessionCount: 5, focusMuscles: ['shoulders', 'arms', 'legs'], averageRPE: 7.5 },
        { weekNumber: 5, label: 'Deload', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 5.0 },
        { weekNumber: 6, label: 'Volume Block 1', sessionCount: 5, focusMuscles: ['chest', 'back', 'legs'], averageRPE: 7.0 },
        { weekNumber: 7, label: 'Volume Block 2', sessionCount: 5, focusMuscles: ['chest', 'back', 'legs'], averageRPE: 7.5 },
        { weekNumber: 8, label: 'Volume Block 3', sessionCount: 5, focusMuscles: ['shoulders', 'arms', 'legs'], averageRPE: 8.0 },
        { weekNumber: 9, label: 'Volume Block 4', sessionCount: 5, focusMuscles: ['chest', 'back', 'legs'], averageRPE: 8.5 },
        { weekNumber: 10, label: 'Deload', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 5.0 },
        { weekNumber: 11, label: 'Intensification 1', sessionCount: 5, focusMuscles: ['chest', 'back', 'legs'], averageRPE: 8.0 },
        { weekNumber: 12, label: 'Intensification 2', sessionCount: 5, focusMuscles: ['full body'], averageRPE: 8.5 },
      ],
    },
    {
      ...base,
      id: 'builtin-competition-cut-peak',
      name: 'Competition Cut & Peak',
      description:
        'Six-week block for athletes cutting weight for competition. Preserves strength while managing reduced recovery capacity from caloric deficit. Pairs with weight-cut-engine nutrition phases.',
      sport: ['grappling', 'mma'],
      goal: 'Competition Weight Cut',
      experienceLevel: ['intermediate', 'advanced'],
      durationWeeks: 6,
      sessionsPerWeek: 3,
      tags: ['weight cut', 'competition', 'peaking', 'strength preservation', 'fight camp'],
      preview: [
        { weekNumber: 1, label: 'Strength Maintenance', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 7.5 },
        { weekNumber: 2, label: 'Volume Reduction', sessionCount: 3, focusMuscles: ['legs', 'back'], averageRPE: 7.5 },
        { weekNumber: 3, label: 'Intensity Focus', sessionCount: 3, focusMuscles: ['legs', 'back', 'core'], averageRPE: 8.0 },
        { weekNumber: 4, label: 'Taper Begin', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 7.0 },
        { weekNumber: 5, label: 'Deep Taper', sessionCount: 2, focusMuscles: ['full body'], averageRPE: 6.0 },
        { weekNumber: 6, label: 'Competition Week', sessionCount: 1, focusMuscles: ['full body'], averageRPE: 4.0 },
      ],
    },
    {
      ...base,
      id: 'builtin-beginner-full-body',
      name: 'Beginner Full Body',
      description:
        'Eight-week full-body program for athletes new to structured resistance training. Focuses on movement quality, progressive overload, and building training habits.',
      sport: ['general'],
      goal: 'Build Training Foundation',
      experienceLevel: ['beginner'],
      durationWeeks: 8,
      sessionsPerWeek: 3,
      tags: ['beginner', 'full body', 'foundation', 'technique', 'general fitness'],
      preview: [
        { weekNumber: 1, label: 'Movement Learning', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 5.0 },
        { weekNumber: 2, label: 'Pattern Practice', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 5.5 },
        { weekNumber: 3, label: 'Load Introduction', sessionCount: 3, focusMuscles: ['legs', 'chest', 'back'], averageRPE: 6.0 },
        { weekNumber: 4, label: 'Progressive Overload 1', sessionCount: 3, focusMuscles: ['legs', 'chest', 'back'], averageRPE: 6.5 },
        { weekNumber: 5, label: 'Deload', sessionCount: 2, focusMuscles: ['full body'], averageRPE: 5.0 },
        { weekNumber: 6, label: 'Progressive Overload 2', sessionCount: 3, focusMuscles: ['legs', 'chest', 'back'], averageRPE: 7.0 },
        { weekNumber: 7, label: 'Progressive Overload 3', sessionCount: 3, focusMuscles: ['legs', 'shoulders', 'back'], averageRPE: 7.0 },
        { weekNumber: 8, label: 'Test & Review', sessionCount: 3, focusMuscles: ['full body'], averageRPE: 6.0 },
      ],
    },
  ];
}
