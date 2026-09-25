/**
 * Build src/lib/exercise-library.generated.ts from free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db — Unlicense / public domain).
 *
 *   npx tsx scripts/import-free-exercise-db.ts [path/to/exercises.json]
 *
 * Without a path it downloads dist/exercises.json. The output is committed,
 * so the app never fetches anything at runtime.
 *
 * What gets in: strength / powerlifting / olympic / plyometric work with
 * equipment the app can filter on. What stays out: stretches, cardio
 * machines, foam rolling, odd strongman implements (no gear type to check),
 * and anything that duplicates a curated exercise (the curated version,
 * with its tuned values and cues, always wins).
 *
 * Library exercises are searchable, swappable and loggable. The programme
 * generator keeps picking from the curated set only.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { exercises as curated } from '../src/lib/exercises';
import type { Exercise, EquipmentType, MuscleGroup, MovementPattern, ExerciseCategory, Equipment } from '../src/lib/types';

interface Raw {
  id: string; name: string; force: string | null; level: string; mechanic: string | null;
  equipment: string | null; primaryMuscles: string[]; secondaryMuscles: string[];
  instructions: string[]; category: string;
}

const URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

const MUSCLE: Record<string, MuscleGroup> = {
  quadriceps: 'quadriceps', shoulders: 'shoulders', abdominals: 'core', chest: 'chest', hamstrings: 'hamstrings',
  triceps: 'triceps', biceps: 'biceps', lats: 'back', 'middle back': 'back', 'lower back': 'back', calves: 'calves',
  forearms: 'forearms', glutes: 'glutes', traps: 'traps', adductors: 'quadriceps', abductors: 'glutes', neck: 'traps',
};

const KEEP_CATEGORIES = new Set(['strength', 'powerlifting', 'olympic weightlifting', 'plyometrics', 'strongman']);

/** Gear from the dataset's equipment field, or inferred from the name for "other"/null. */
function gear(r: Raw): EquipmentType[] | null {
  const n = r.name.toLowerCase();
  switch (r.equipment) {
    case 'barbell': return /trap bar|hex bar/.test(n) ? ['trap_bar'] : /landmine/.test(n) ? ['landmine'] : ['barbell'];
    case 'dumbbell': return ['dumbbell'];
    case 'kettlebells': return ['kettlebell'];
    case 'cable': return ['cable'];
    case 'machine': return ['machine'];
    case 'bands': return ['resistance_band'];
    case 'medicine ball': return ['medicine_ball'];
    case 'e-z curl bar': return ['ez_bar'];
    case 'body only':
      if (/pull-?up|chin|muscle up|hanging|toes to bar/.test(n)) return ['pull_up_bar'];
      if (/\bdips?\b/.test(n)) return ['dip_station'];
      if (/box/.test(n)) return ['box'];
      return ['bodyweight'];
    case 'exercise ball': return null; // no stability-ball gear type to filter on
    default: {
      if (/pull-?up|chin|muscle up|rope climb|hanging/.test(n)) return ['pull_up_bar'];
      if (/\bdips?\b|parallel bar/.test(n)) return ['dip_station'];
      if (/ab roller|ab wheel/.test(n)) return ['ab_wheel'];
      if (/battl\w* rope/.test(n)) return ['battle_ropes'];
      if (/\bplate\b/.test(n)) return ['barbell'];
      if (/inverted row/.test(n)) return ['barbell'];
      if (/box/.test(n)) return ['box'];
      if (/push-?up|lunge|bodyweight|glute-ham|hamstring slide|neck/.test(n)) return ['bodyweight'];
      return null; // sleds, stones, logs, kegs … can't be filtered by gear → skip
    }
  }
}

function tiers(types: EquipmentType[]): Equipment[] {
  const minimalOk: EquipmentType[] = ['bodyweight', 'resistance_band', 'dumbbell', 'kettlebell', 'pull_up_bar', 'medicine_ball', 'ab_wheel'];
  const homeOk: EquipmentType[] = [...minimalOk, 'barbell', 'bench', 'box', 'dip_station', 'ez_bar', 'trap_bar', 'landmine', 'battle_ropes'];
  if (types.every(t => minimalOk.includes(t))) return ['full_gym', 'home_gym', 'minimal'];
  if (types.every(t => homeOk.includes(t))) return ['full_gym', 'home_gym'];
  return ['full_gym'];
}

function pattern(r: Raw, prim: MuscleGroup[]): MovementPattern {
  const n = r.name.toLowerCase();
  if (r.category === 'plyometrics' || r.category === 'olympic weightlifting' || /jump|throw|clean|snatch|jerk|slam|bound|hop\b|swing/.test(n)) return 'explosive';
  if (/carry|walk\b|farmer|yoke|suitcase/.test(n)) return 'carry';
  if (/twist|rotation|woodchop|wood chop|russian|windmill|pallof/.test(n)) return 'rotation';
  if (/deadlift|good morning|rdl|romanian|hip thrust|glute bridge|back extension|hyperextension|pull[- ]through|stiff[- ]leg|glute-ham|kettlebell swing/.test(n)) return 'hinge';
  if (/squat|lunge|step-?up|leg press|split|pistol|hack/.test(n)) return 'squat';
  if (r.force === 'push') return 'push';
  if (r.force === 'pull') return 'pull';
  if (prim.includes('quadriceps')) return 'squat';
  if (prim.includes('hamstrings') || prim.includes('glutes')) return 'hinge';
  return r.force === 'static' ? 'rotation' : 'pull';
}

function category(r: Raw, types: EquipmentType[]): ExerciseCategory {
  const n = r.name.toLowerCase();
  if (r.category === 'plyometrics' || r.category === 'olympic weightlifting') return 'power';
  if (/pinch|wrist|finger|towel|gripper|grip strength|plate hold/.test(n)) return 'grip';
  if (r.mechanic === 'isolation') return 'isolation';
  if (r.mechanic === 'compound') return 'compound';
  return types.includes('machine') || types.includes('cable') ? 'isolation' : 'compound';
}

const norm = (s: string) => s.toLowerCase()
  .replace(/military/g, 'overhead').replace(/pull-?ups?/g, 'pull up').replace(/chin-?ups?/g, 'chin up').replace(/push-?ups?/g, 'push up')
  .replace(/dumbbells?/g, 'db').replace(/barbells?/g, 'bb').replace(/kettlebells?/g, 'kb')
  .replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(the|with|a|an|on|of|and|to)\b/g, ' ')
  .replace(/s\b/g, '').replace(/\s+/g, ' ').trim();
const tokens = (s: string) => new Set(norm(s).split(' ').filter(Boolean));
function similar(a: string, b: string): boolean {
  const A = tokens(a); const B = tokens(b);
  if (norm(a) === norm(b)) return true;
  const inter = Array.from(A).filter(x => B.has(x)).length;
  return inter / Math.max(A.size, B.size) >= 0.85;
}
const IMPLEMENT = new Set(['bb', 'db', 'kb', 'cable', 'machine', 'standing', 'seated', 'medium', 'grip', 'powerlifting']);
const core = (s: string) => new Set(Array.from(tokens(s)).filter(t => !IMPLEMENT.has(t)));
/** "Barbell Squat" ≈ curated "Back Squat" (same gear + pattern, name is a subset). */
function coveredBy(c: Exercise, name: string, types: EquipmentType[], pat: MovementPattern): boolean {
  if (similar(c.name, name)) return true;
  if (c.movementPattern !== pat) return false;
  if (!(c.equipmentTypes ?? []).some(t => types.includes(t))) return false;
  const L = core(name); const C = core(c.name);
  return L.size > 0 && Array.from(L).every(t => C.has(t));
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function sentence(s: string, max = 180): string {
  const first = s.split(/(?<=\.)\s/)[0] ?? s;
  return first.length > max ? first.slice(0, max - 1).trimEnd() + '…' : first;
}

async function main() {
  const path = process.argv[2];
  const raw: Raw[] = path ? JSON.parse(readFileSync(path, 'utf8')) : await (await fetch(URL)).json();
  const out: Exercise[] = [];
  const skipped: Record<string, number> = {};
  const skip = (why: string) => { skipped[why] = (skipped[why] ?? 0) + 1; };
  const seen = new Set<string>();

  for (const r of raw) {
    if (!KEEP_CATEGORIES.has(r.category)) { skip(`category:${r.category}`); continue; }
    const types = gear(r);
    if (!types) { skip('no gear type'); continue; }
    const primPre = Array.from(new Set(r.primaryMuscles.map(m => MUSCLE[m]).filter(Boolean))) as MuscleGroup[];
    if (curated.some(c => coveredBy(c, r.name, types, pattern(r, primPre)))) { skip('duplicate of curated'); continue; }
    const id = `lib-${slug(r.id || r.name)}`;
    if (seen.has(id)) { skip('duplicate id'); continue; }
    seen.add(id);

    const prim = Array.from(new Set(r.primaryMuscles.map(m => MUSCLE[m]).filter(Boolean))) as MuscleGroup[];
    if (prim.length === 0) { skip('no muscles'); continue; }
    const sec = Array.from(new Set(r.secondaryMuscles.map(m => MUSCLE[m]).filter(m => m && !prim.includes(m)))) as MuscleGroup[];
    const cat = category(r, types);
    const n = r.name.toLowerCase();
    const expert = r.level === 'expert' ? 1 : 0;
    const ex: Exercise = {
      id,
      name: r.name.replace(/\s+/g, ' ').trim(),
      category: cat,
      primaryMuscles: prim,
      secondaryMuscles: sec,
      movementPattern: pattern(r, prim),
      equipmentRequired: tiers(types),
      equipmentTypes: types,
      grapplerFriendly: false,
      // Neutral defaults — curated exercises carry hand-tuned values and win ties.
      aestheticValue: cat === 'isolation' ? 6 : cat === 'power' ? 3 : 5,
      strengthValue: Math.min(10, (cat === 'compound' ? 6 : cat === 'power' ? 5 : 3) + expert),
      description: sentence(r.instructions[0] ?? r.name),
      cues: r.instructions.slice(1, 4).map(i => sentence(i, 140)),
      ...((r.force === 'static' && cat !== 'power') || /\bhold\b|plank|isometric|dead hang|l-sit|wall sit/.test(n) ? { measurementType: 'time' as const } : {}),
      ...(/one[- ]arm|single[- ]arm|one[- ]leg|single[- ]leg|unilateral/.test(n) ? { isUnilateral: true } : {}),
    };
    out.push(ex);
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  const header = `/* eslint-disable */
// GENERATED by scripts/import-free-exercise-db.ts — do not edit by hand.
// Source: free-exercise-db (github.com/yuhonas/free-exercise-db), Unlicense / public domain.
// ${out.length} exercises. Re-run the script to refresh.
import type { Exercise } from './types';

export const libraryExercises: Exercise[] = `;
  writeFileSync('src/lib/exercise-library.generated.ts', header + JSON.stringify(out) + ';\n');
  console.log(`wrote ${out.length} exercises`);
  console.log('skipped', skipped);
}

main().catch(e => { console.error(e); process.exit(1); });
