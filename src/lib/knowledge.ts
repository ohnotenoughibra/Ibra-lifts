import { KnowledgeArticle, KnowledgeTip, ContentCategory } from './types';

// In-workout tips that pop up during sessions
export const workoutTips: KnowledgeTip[] = [
  // MUSCLE SCIENCE
  {
    id: 'tip-muscle-fiber-1',
    content: 'Your muscles contain two main fiber types: Type I (slow-twitch) for endurance, and Type II (fast-twitch) for power. Grapplers need both!',
    category: 'muscle_science'
  },
  {
    id: 'tip-muscle-fiber-2',
    content: 'Type II muscle fibers have the greatest potential for hypertrophy. Heavy compound lifts and explosive movements target these fibers.',
    category: 'muscle_science'
  },
  {
    id: 'tip-hypertrophy-1',
    content: 'Muscle growth requires mechanical tension, metabolic stress, and muscle damage. Heavy compounds provide tension, higher reps provide metabolic stress.',
    category: 'muscle_science'
  },
  {
    id: 'tip-hypertrophy-2',
    content: '2024-2025 research confirms: training at long muscle lengths (deep stretches) produces superior hypertrophy. Go deep on Romanian deadlifts and flies!',
    category: 'muscle_science'
  },
  {
    id: 'tip-protein-synthesis',
    content: 'Muscle protein synthesis peaks 24-48 hours after training. This is why full-body training 2-3x per week is optimal for grapplers.',
    category: 'muscle_science'
  },
  {
    id: 'tip-nervous-system',
    content: 'Strength gains in the first 4-6 weeks are primarily neural adaptations - your nervous system learning to recruit more muscle fibers.',
    category: 'muscle_science'
  },

  // LIFTING TECHNIQUE
  {
    id: 'tip-eccentric-1',
    content: '2025 meta-analysis: Emphasizing the eccentric (lowering) phase builds more muscle. Try 3-4 second eccentrics on isolation work.',
    category: 'lifting_technique'
  },
  {
    id: 'tip-eccentric-2',
    content: 'Eccentric training also strengthens tendons more than concentric-only training. Great for injury prevention in grappling.',
    category: 'lifting_technique',
    exerciseId: 'romanian-deadlift'
  },
  {
    id: 'tip-rpe-1',
    content: 'RPE 7-8 is optimal for most hypertrophy sets. RPE 9-10 should be reserved for the last set or testing.',
    category: 'lifting_technique'
  },
  {
    id: 'tip-rpe-2',
    content: 'True RPE 10 means you couldn\'t do another rep even with a gun to your head. Most people underestimate their RPE by 1-2 points.',
    category: 'lifting_technique'
  },
  {
    id: 'tip-breathing',
    content: 'Valsalva maneuver: Big breath, brace core, hold through the rep. This protects your spine under heavy loads.',
    category: 'lifting_technique'
  },
  {
    id: 'tip-grip-1',
    content: 'Crush grip the bar on all pulling movements. This activates more motor units and improves performance.',
    category: 'lifting_technique'
  },
  {
    id: 'tip-deadlift-1',
    content: 'Think "push the floor away" rather than "pull the bar up" for better leg drive in deadlifts.',
    category: 'lifting_technique',
    exerciseId: 'deadlift'
  },
  {
    id: 'tip-squat-1',
    content: 'Screw your feet into the floor (external rotation force) to activate glutes and stabilize knees.',
    category: 'lifting_technique',
    exerciseId: 'back-squat'
  },
  {
    id: 'tip-bench-1',
    content: 'Leg drive isn\'t pushing your body up - it\'s driving your upper back into the bench for stability.',
    category: 'lifting_technique',
    exerciseId: 'bench-press'
  },
  {
    id: 'tip-row-1',
    content: 'Lead with your elbow, not your hand. Imagine pulling your elbow through the wall behind you.',
    category: 'lifting_technique',
    exerciseId: 'barbell-row'
  },

  // PERIODIZATION
  {
    id: 'tip-periodization-1',
    content: 'Undulating periodization (varying intensity daily/weekly) produces superior strength gains in trained athletes vs linear models.',
    category: 'periodization'
  },
  {
    id: 'tip-periodization-2',
    content: 'Your strength days build the foundation, hypertrophy days add muscle, and power days teach you to use that muscle explosively.',
    category: 'periodization'
  },
  {
    id: 'tip-deload-1',
    content: 'Deloads aren\'t weakness - they\'re when adaptation happens. Your body supercompensates during recovery.',
    category: 'periodization'
  },
  {
    id: 'tip-deload-2',
    content: 'Skipping deloads leads to accumulated fatigue, plateaus, and injury. Take them seriously.',
    category: 'periodization'
  },
  {
    id: 'tip-volume-1',
    content: '10-20 working sets per muscle group per week is the hypertrophy sweet spot. More isn\'t always better.',
    category: 'periodization'
  },
  {
    id: 'tip-frequency-1',
    content: 'Training a muscle 2x per week produces more hypertrophy than 1x per week at the same volume.',
    category: 'periodization'
  },

  // RECOVERY
  {
    id: 'tip-recovery-1',
    content: 'Sleep is the ultimate performance enhancer. 7-9 hours optimizes hormone levels, muscle repair, and neural recovery.',
    category: 'recovery'
  },
  {
    id: 'tip-recovery-2',
    content: 'Growth hormone peaks during deep sleep. Poor sleep = poor gains.',
    category: 'recovery'
  },
  {
    id: 'tip-recovery-3',
    content: 'Post-workout nutrition window is real but wider than thought. Aim for protein within 2-3 hours, not 30 minutes.',
    category: 'recovery'
  },
  {
    id: 'tip-recovery-4',
    content: '1.6-2.2g of protein per kg bodyweight daily maximizes muscle protein synthesis for trained individuals.',
    category: 'recovery'
  },
  {
    id: 'tip-recovery-5',
    content: 'Active recovery (light movement, walking) beats complete rest for reducing soreness.',
    category: 'recovery'
  },
  {
    id: 'tip-soreness-1',
    content: 'Soreness (DOMS) doesn\'t equal growth. You can build muscle without being sore, and be sore without growing.',
    category: 'recovery'
  },

  // NUTRITION
  {
    id: 'tip-nutrition-1',
    content: 'Creatine monohydrate: The most researched, safest, and effective supplement. 5g daily, timing doesn\'t matter.',
    category: 'nutrition'
  },
  {
    id: 'tip-nutrition-2',
    content: 'Caffeine improves strength performance by 3-5%. But cycle off periodically to maintain sensitivity.',
    category: 'nutrition'
  },
  {
    id: 'tip-nutrition-3',
    content: 'Building muscle and losing fat simultaneously is possible but difficult. Most efficient: alternate bulk/cut phases.',
    category: 'nutrition'
  },
  {
    id: 'tip-nutrition-4',
    content: 'Carbs aren\'t the enemy. They fuel high-intensity training and spare muscle protein.',
    category: 'nutrition'
  },

  // GRAPPLING-SPECIFIC
  {
    id: 'tip-grappling-1',
    content: 'Gordon Ryan attributes his dominant back control to years of heavy deadlifting. The back is the grappler\'s engine.',
    category: 'grappling'
  },
  {
    id: 'tip-grappling-2',
    content: 'Turkish Get-Ups train every position you\'ll encounter getting up from the ground. Essential for grapplers.',
    category: 'grappling',
    exerciseId: 'turkish-getup'
  },
  {
    id: 'tip-grappling-3',
    content: 'Hip thrust strength directly translates to bridge escapes and hip bump sweeps.',
    category: 'grappling',
    exerciseId: 'hip-thrust'
  },
  {
    id: 'tip-grappling-4',
    content: 'Grip endurance often determines who wins in overtime. Train your grip with longer holds and farmer\'s walks.',
    category: 'grappling',
    exerciseId: 'farmers-walk'
  },
  {
    id: 'tip-grappling-5',
    content: 'Strong hips = strong shots. Squats and deadlifts build the foundation for explosive takedowns.',
    category: 'grappling'
  },
  {
    id: 'tip-grappling-6',
    content: 'Anti-rotation core work (Pallof press) prevents opponents from off-balancing you.',
    category: 'grappling',
    exerciseId: 'pallof-press'
  },
  {
    id: 'tip-grappling-7',
    content: 'Pulling strength is more important than pushing for most grappling situations. Prioritize rows and pull-ups.',
    category: 'grappling'
  },
  {
    id: 'tip-grappling-8',
    content: 'Neck strength protects against chokes and injuries. Add light neck work 2-3x per week.',
    category: 'grappling'
  },

  // PRACTICAL MINDSET (replacing generic motivation quotes)
  {
    id: 'tip-mindset-1',
    content: 'Consistency beats intensity. 3 solid sessions per week for a year crushes 6 sessions per week for 2 months.',
    category: 'motivation'
  },
  {
    id: 'tip-mindset-2',
    content: 'Bad workout > no workout. Even a 60% effort session maintains neural pathways and keeps the habit alive.',
    category: 'motivation'
  },
  {
    id: 'tip-mindset-3',
    content: 'Track your lifts. You can\'t manage what you don\'t measure. Small weekly improvements compound into massive gains over months.',
    category: 'motivation'
  },
  {
    id: 'tip-mindset-4',
    content: 'Most lifters quit programs too early. Stick with your current block for the full mesocycle before judging results.',
    category: 'motivation'
  },
  {
    id: 'tip-mindset-5',
    content: 'Autoregulation > rigid programming. If you slept 4 hours, drop the weight 10% and focus on quality reps. Smart training beats ego training.',
    category: 'motivation'
  },
  {
    id: 'tip-mindset-6',
    content: 'Your competition prep starts months before the event. The last week is just maintenance — the work was already done.',
    category: 'motivation'
  }
];

// Full educational articles for the Knowledge section
export const knowledgeArticles: KnowledgeArticle[] = [
  {
    id: 'article-undulating-periodization',
    title: 'Why Undulating Periodization Works for Grapplers',
    category: 'periodization',
    tags: ['programming', 'science', 'grappling'],
    readTime: 5,
    publishedAt: new Date('2025-01-15'),
    source: 'Based on 2023-2025 meta-analyses on periodization',
    content: `
## What is Undulating Periodization?

Unlike traditional linear periodization (where you focus on one quality at a time), undulating periodization varies training stress within each week. You might have a heavy strength day, a moderate hypertrophy day, and a lighter power day - all in the same week.

## The Science

A 2024 meta-analysis by Grgic et al. found that daily undulating periodization (DUP) produced significantly greater strength gains in trained individuals compared to linear models, especially when training frequency was limited to 2-3 sessions per week.

### Why This Matters for Grapplers:

1. **Limited Training Time**: With mat time taking priority, you can't afford 5-6 lifting sessions. DUP maximizes results from 2-3 sessions.

2. **Multiple Qualities**: Grappling requires strength, power, AND endurance. DUP develops all simultaneously.

3. **Fatigue Management**: Varying intensity prevents accumulated fatigue that could hurt your grappling practice.

4. **Continuous Adaptation**: Your body constantly faces different stimuli, preventing plateaus.

## How We Program It

- **Day 1 (Strength)**: Heavy loads (85-95% 1RM), low reps (3-5), full recovery
- **Day 2 (Hypertrophy)**: Moderate loads (65-80% 1RM), moderate reps (6-12), shorter rest
- **Day 3 (Power)**: Light loads (40-60% 1RM), explosive execution, full recovery

This ensures you're always fresh enough for your main sport while still progressing in the weight room.
`
  },
  {
    id: 'article-hypertrophy-science',
    title: 'The Science of Building Muscle in 2025',
    category: 'muscle_science',
    tags: ['hypertrophy', 'science', 'training'],
    readTime: 7,
    publishedAt: new Date('2025-02-01'),
    source: 'Current hypertrophy research 2024-2025',
    content: `
## The Three Pillars of Hypertrophy

Modern research identifies three primary mechanisms driving muscle growth:

### 1. Mechanical Tension
The most important factor. Generated by lifting heavy loads through a full range of motion. This is why compound movements are king.

### 2. Metabolic Stress
The "pump" and burn from moderate-rep training. Creates a favorable hormonal and cellular environment for growth.

### 3. Muscle Damage
Micro-tears in muscle fibers that stimulate repair and growth. Emphasized by eccentric training and novel stimuli.

## 2025 Research Updates

### Lengthened Partial Training
Studies in 2024-2025 show training muscles at long lengths (deep stretches) produces superior hypertrophy. Practical applications:
- Deep Romanian deadlifts
- Full-stretch flies
- Incline curls for biceps

### Eccentric Emphasis
A 2025 meta-analysis confirmed that emphasizing the eccentric (lowering) phase by 3-4 seconds produces more hypertrophy per set than faster tempos.

### Volume Landmarks
- **Minimum Effective Volume**: ~10 sets/muscle/week
- **Maximum Adaptive Volume**: ~20-25 sets/muscle/week
- **Maximum Recoverable Volume**: Individual, but usually 25-30 sets

Going above MAV doesn't add growth and increases injury risk.

## Practical Takeaways

1. Train 6-12 reps for most hypertrophy work
2. Control the eccentric for 3+ seconds
3. Full range of motion, emphasizing the stretch
4. 10-20 sets per muscle group per week
5. Train each muscle 2x per week minimum
6. Progressive overload over time
`
  },
  {
    id: 'article-strength-adaptations',
    title: 'How Strength Actually Develops',
    category: 'muscle_science',
    tags: ['strength', 'science', 'neural'],
    readTime: 6,
    publishedAt: new Date('2025-01-20'),
    content: `
## Neural vs. Muscular Adaptations

When you get stronger, it's not just about bigger muscles. In fact, beginners often see huge strength gains with minimal muscle growth. Here's what's happening:

### Neural Adaptations (Weeks 1-8)

1. **Improved Motor Unit Recruitment**: Your brain learns to activate more muscle fibers simultaneously.

2. **Rate Coding**: Motor units fire faster and more synchronously.

3. **Reduced Co-Contraction**: Opposing muscles stop fighting against the movement.

4. **Improved Skill**: The movement becomes more efficient.

### Muscular Adaptations (Ongoing)

1. **Hypertrophy**: More contractile proteins = more force potential.

2. **Fiber Type Shifts**: Type IIx fibers convert to Type IIa with training.

3. **Architectural Changes**: Muscle pennation angle and fascicle length adapt.

## Why Heavy Training Matters

To maximize neural adaptations, you need to train heavy (85%+ 1RM). This:
- Recruits high-threshold motor units (the strongest ones)
- Develops rate coding
- Improves your "skill" at being strong

Light weights, even to failure, don't fully recruit all motor units due to the size principle.

## The Strength-Hypertrophy Spectrum

| Rep Range | Primary Adaptation | Secondary |
|-----------|-------------------|-----------|
| 1-3 | Neural/Strength | Minimal hypertrophy |
| 4-6 | Strength | Moderate hypertrophy |
| 6-12 | Hypertrophy | Moderate strength |
| 12-20 | Endurance/metabolic | Some hypertrophy |

For grapplers, the 4-8 rep range offers the best of both worlds.
`
  },
  {
    id: 'article-grappling-strength',
    title: 'Strength Training for Grapplers: The Complete Guide',
    category: 'grappling',
    tags: ['grappling', 'BJJ', 'wrestling', 'programming'],
    readTime: 10,
    publishedAt: new Date('2025-01-25'),
    content: `
## Why Grapplers Need Strength Training

"Strength doesn't matter, technique does." We've all heard it. And it's partially true - against a much weaker opponent, technique wins. But at equal skill levels, the stronger athlete has a massive advantage.

### What Top Grapplers Say

- **Gordon Ryan**: Credits his dominant back control to years of deadlifting
- **Andre Galvao**: Heavy squats for shot power
- **John Danaher**: Recommends strength training for all serious competitors

## The Grappler's Training Hierarchy

1. **Mat time** - Always priority #1
2. **Strength training** - 2-3x per week
3. **Conditioning** - Often built into grappling
4. **Mobility** - Daily maintenance

## Essential Movement Patterns

### 1. Hip Hinge (Deadlifts)
- Builds back strength for clinching and control
- Posterior chain power for sprawls
- Grip endurance

### 2. Squat Patterns
- Leg drive for shots and passes
- Base and balance
- Hip and ankle mobility

### 3. Horizontal Push (Bench, Push-ups)
- Frames and escapes
- Pushing opponents away
- Upper body stability

### 4. Horizontal Pull (Rows)
- Grip fighting
- Collar ties
- Pulling guard/sweeps

### 5. Vertical Pull (Pull-ups)
- Climbing and clinch work
- Grip strength
- Lat engagement for back control

### 6. Carries (Farmer's walks)
- Grip endurance
- Core stability under load
- Full-body conditioning

## Sample Weekly Split for Grapplers

### Day 1 - Strength (After light drilling)
- Deadlift 5x3
- Weighted Pull-ups 4x5
- Bench Press 4x5
- Farmer's Walk 3x40m

### Day 2 - Hypertrophy (On light grappling day)
- Front Squat 4x8
- Barbell Row 4x10
- Incline DB Press 3x12
- Curls, Lateral Raises 3x12

### Day 3 - Power (Before open mat)
- Box Jumps 4x5
- Med Ball Slams 3x8
- Turkish Get-ups 3x3 each
- Kettlebell Swings 4x10

## Managing Fatigue

Never train legs heavy the day before competition or hard sparring. Plan your week so lifting complements rather than competes with mat time.
`
  },
  {
    id: 'article-eccentric-training',
    title: 'Eccentric Training: The Secret Weapon for Muscle Growth',
    category: 'lifting_technique',
    tags: ['technique', 'hypertrophy', 'eccentric'],
    readTime: 5,
    publishedAt: new Date('2025-02-05'),
    source: 'Based on 2025 eccentric training meta-analysis',
    content: `
## What is Eccentric Training?

The eccentric phase is when your muscle lengthens under load - the lowering portion of a lift. Research consistently shows this phase is crucial for hypertrophy.

## Why Eccentrics Build More Muscle

1. **Greater Mechanical Tension**: You can handle 20-40% more weight eccentrically
2. **More Muscle Damage**: Creates stronger growth signal
3. **Longer Time Under Tension**: Increases metabolic stress
4. **Tendon Strengthening**: Crucial for injury prevention

## 2025 Research Highlights

A comprehensive 2025 meta-analysis found:
- 3-4 second eccentrics produced 15% more hypertrophy than 1 second
- Eccentric-emphasis training reduced injury rates by 25%
- The effect was most pronounced in compound movements

## How to Implement

### Tempo Training
Use a tempo notation like "3-1-2-0":
- 3 = eccentric (lowering) seconds
- 1 = pause at bottom
- 2 = concentric (lifting) seconds
- 0 = pause at top

### Best Exercises for Eccentric Emphasis
1. **Romanian Deadlifts** - Feel the hamstring stretch
2. **Incline Curls** - Bicep fully lengthened
3. **Lying Leg Curls** - Emphasize the stretch
4. **Chest Flies** - Deep stretch at bottom
5. **Skull Crushers** - Tricep lengthened position

### Practical Tips
- Start with lighter weights when adding eccentric emphasis
- Focus on 2-3 exercises per session
- Don't go to failure on every set - eccentrics are taxing
- Perfect for your hypertrophy days
`
  },
  {
    id: 'article-grip-training',
    title: 'Grip Strength: The Grappler\'s Secret Weapon',
    category: 'grappling',
    tags: ['grip', 'grappling', 'forearms'],
    readTime: 4,
    publishedAt: new Date('2025-01-10'),
    content: `
## Why Grip Matters for Grapplers

In a close match, grip often determines the winner. When everything else is equal:
- Better grips = better control
- Grip endurance = late-match advantage
- Strong wrists = injury prevention

## Types of Grip Strength

### 1. Crushing Grip
Squeezing force - holding the gi, clinching
- Train with: Heavy farmer's walks, grippers, barbell holds

### 2. Pinch Grip
Thumb opposition - collar grips, lapel control
- Train with: Plate pinches, hub lifts

### 3. Support Grip
Hanging and holding - pull-ups, deadlifts
- Train with: Dead hangs, fat bar work

### 4. Wrist Strength
Controlling angles - wrist fighting, frames
- Train with: Wrist curls, rice bucket, wrist roller

## The Ultimate Grip Circuit

Perform 2-3x per week at the end of your session:

1. **Dead Hang** - 3 x max time
2. **Farmer's Walk** - 3 x 40m heavy
3. **Plate Pinch** - 3 x 30 seconds
4. **Towel Pull-ups** - 3 x max reps
5. **Wrist Roller** - 2 x each direction

## Gi vs. No-Gi Considerations

**Gi grapplers**: More emphasis on crushing and pinch grip
**No-gi grapplers**: More emphasis on wrist control and hand fighting strength

## Recovery Considerations

Grip work is taxing on the forearms and can affect your grappling. Schedule grip training away from hard rolling days.
`
  },
  {
    id: 'article-recovery-science',
    title: 'Recovery Science: What Actually Works',
    category: 'recovery',
    tags: ['recovery', 'sleep', 'science'],
    readTime: 6,
    publishedAt: new Date('2025-03-01'),
    source: 'Current recovery research 2024-2025',
    content: `
## Evidence-Based Recovery Methods

Not all recovery methods are created equal. Here is what the research actually supports.

### Tier 1: High Evidence

#### Sleep (Non-Negotiable)
- 7-9 hours for athletes
- Growth hormone release peaks during deep sleep (stages 3-4)
- Sleep restriction reduces testosterone by 10-15% after one week
- Practical: Consistent bedtime, cool room (65-68F), no screens 30min before bed

#### Nutrition Timing
- 1.6-2.2g protein/kg/day for muscle protein synthesis
- Post-workout protein within 2-3 hours (the anabolic window is wider than the supplement industry claims)
- Carb replenishment matters more for same-day double sessions

#### Progressive Overload Management
- Do not increase volume more than 10% week-over-week
- Deload every 4-6 weeks (or when performance declines 2+ sessions in a row)

### Tier 2: Moderate Evidence

#### Cold Water Immersion
- Effective for reducing perceived soreness
- May blunt hypertrophy adaptations if done immediately post-training
- Best used: competition weeks or between double sessions, not after hypertrophy work

#### Active Recovery
- Light movement (walking, easy cycling) beats complete rest
- Promotes blood flow without adding training stress
- 20-30 min at conversational pace

### Tier 3: Weak/No Evidence

#### Stretching for Recovery
- Static stretching does not reduce DOMS (delayed onset muscle soreness)
- Useful for mobility maintenance, not recovery per se

#### BCAAs
- If you are hitting protein targets, BCAAs add nothing
- Save your money for quality whole food protein

#### Compression Garments
- Minimal effect on actual recovery markers
- May reduce perceived soreness (placebo is real and that is fine)

## The Recovery Hierarchy for Grapplers

1. Sleep 7-9 hours
2. Hit protein targets (1.6-2.2g/kg)
3. Manage training volume intelligently
4. Active recovery on off days
5. Everything else is optional
`
  },
  {
    id: 'article-weight-management',
    title: 'Weight Management for Grapplers',
    category: 'nutrition',
    tags: ['nutrition', 'weight', 'grappling', 'competition'],
    readTime: 7,
    publishedAt: new Date('2025-02-15'),
    content: `
## Cutting Weight vs. Losing Fat

These are fundamentally different processes and confusing them leads to poor outcomes.

### Fat Loss (Long-Term)
- 0.5-1% bodyweight per week is sustainable
- Requires caloric deficit of 300-500 kcal/day
- Preserve muscle by keeping protein high (2.0-2.4g/kg during a cut)
- Keep training intensity high, reduce volume slightly
- Duration: 8-16 weeks

### Water Cut (Competition Week)
- Only for experienced competitors
- Maximum 5-8% bodyweight for 24-hour weigh-ins
- Requires rehydration protocol
- Should be practiced before using in competition
- Can impair performance if done wrong

## Practical Nutrition for Grappler-Lifters

### Training Days
- Higher carbs (3-5g/kg) to fuel sessions
- Protein distributed across 4-5 meals
- Pre-training meal 2-3 hours before
- Post-training protein + carbs within 2-3 hours

### Rest Days
- Moderate carbs (2-3g/kg)
- Same protein intake
- Slightly lower total calories
- Focus on whole foods, fruits, vegetables

### Supplement Shortlist (Evidence-Based Only)
1. **Creatine monohydrate** - 5g daily, no loading needed
2. **Vitamin D** - 2000-4000 IU if not getting sun exposure
3. **Omega-3** - 2-3g EPA+DHA daily for inflammation management
4. **Caffeine** - 3-6mg/kg pre-training for performance (cycle usage)

Everything else is marketing.
`
  },
  {
    id: 'article-training-longevity',
    title: 'Training for Longevity: Lifting in Your 30s and Beyond',
    category: 'lifting_technique',
    tags: ['longevity', 'injury-prevention', 'programming'],
    readTime: 6,
    publishedAt: new Date('2025-03-10'),
    content: `
## Your Body at 30+

You are not broken, but the game changes. Recovery takes longer, joints need more attention, and smart programming matters more than ever.

### What Changes

1. **Recovery capacity decreases** - You can still train hard, but you need more recovery between sessions
2. **Connective tissue needs more warm-up** - Those 5-minute warm-ups no longer cut it
3. **Accumulated wear and tear** - Previous injuries need management, not ignoring
4. **Hormonal shifts** - Testosterone declines ~1% per year after 30 (training helps maintain it)

### Programming Adjustments

#### Warm-Up Protocol (10-15 minutes, non-negotiable)
1. General: 5 min light cardio
2. Activation: Band pull-aparts, glute bridges, bird dogs
3. Specific: Empty bar/light sets of your first exercise
4. Ramping sets to working weight

#### Exercise Selection
- Favor exercises with lower injury risk at same stimulus
- Trap bar deadlifts over conventional if low back is cranky
- DB bench over barbell if shoulders are beat up
- Bulgarian split squats for joint-friendly leg training
- More machine work for isolation is fine, ego-free training is smart training

#### Volume Management
- Higher frequency, lower per-session volume
- Example: 3x/week full body beats 1x/week body part for recovery
- Autoregulate based on readiness, do not force it on bad days

### Grappling-Specific Considerations

As a grappler in your 30s:
- Neck training is mandatory (2-3x/week, light)
- Grip work should be balanced with finger extensor work
- Hip mobility daily, your guard game depends on it
- Shoulder prehab before every upper body session
- Consider reducing sparring intensity on heavy lifting days

### The Long Game

The goal is not to peak at 35. It is to be training at 55. Every session should leave you wanting to come back, not crawling out the door.
`
  },
  {
    id: 'article-autoregulation',
    title: 'Autoregulation: Training Smarter with RPE and Readiness',
    category: 'periodization',
    tags: ['RPE', 'autoregulation', 'programming', 'science'],
    readTime: 5,
    publishedAt: new Date('2025-02-20'),
    source: 'Helms et al. 2024, Zourdos et al. 2023',
    content: `
## Why Rigid Programs Fail

A program that says Squat 315x5 does not account for:
- You slept 4 hours
- You had hard sparring yesterday
- You are stressed from work
- You are fighting off a cold

Autoregulation adapts the training stimulus to your daily readiness.

## RPE Scale (Rate of Perceived Exertion)

| RPE | Meaning | Reps Left |
|-----|---------|-----------|
| 10 | Maximum effort | 0 |
| 9 | Could do 1 more | 1 |
| 8 | Could do 2 more | 2 |
| 7 | Could do 3 more | 3 |
| 6 | Warm-up weight | 4+ |

### How to Use RPE

Instead of Squat 315x5, program Squat 5 reps @ RPE 8.

This means: find the weight where you could do 5 reps but have 2 left in the tank. On a good day that might be 325. On a bad day, 295. Both are productive sessions.

## Readiness-Based Adjustments

### Green Light (Recovery > 67%, slept well, low stress)
- Hit prescribed RPE targets
- Add a top set or extra volume set if feeling strong
- Good day for PRs

### Yellow Light (Recovery 34-66%, moderate sleep/stress)
- Drop RPE targets by 0.5-1 point
- Keep prescribed volume
- Focus on technique quality

### Red Light (Recovery < 33%, poor sleep, high stress)
- Drop RPE by 1-2 points
- Reduce volume by 20-30%
- Consider swapping to active recovery or mobility
- This is NOT weakness, this is intelligent training

## The Roots Gains Auto-Adjustment Engine

This app uses your pre-workout check-in, wearable recovery data, and per-exercise feedback to automatically suggest weight and volume adjustments. Trust the system. It is based on your actual data, not a one-size-fits-all spreadsheet.
`
  }
];

// Get random tip (optionally filtered by exercise or category)
export function getRandomTip(
  exerciseId?: string,
  category?: ContentCategory
): KnowledgeTip {
  let filteredTips = workoutTips;

  if (exerciseId) {
    filteredTips = filteredTips.filter(
      tip => tip.exerciseId === exerciseId || !tip.exerciseId
    );
  }

  if (category) {
    filteredTips = filteredTips.filter(tip => tip.category === category);
  }

  return filteredTips[Math.floor(Math.random() * filteredTips.length)];
}

// Get tips specific to an exercise
export function getTipsForExercise(exerciseId: string): KnowledgeTip[] {
  return workoutTips.filter(tip => tip.exerciseId === exerciseId);
}

// Get articles by category
export function getArticlesByCategory(category: ContentCategory): KnowledgeArticle[] {
  return knowledgeArticles.filter(article => article.category === category);
}

// Get article by ID
export function getArticleById(id: string): KnowledgeArticle | undefined {
  return knowledgeArticles.find(article => article.id === id);
}

// Search articles by tag
export function searchArticlesByTag(tag: string): KnowledgeArticle[] {
  return knowledgeArticles.filter(article =>
    article.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

// Get featured/random article
export function getFeaturedArticle(): KnowledgeArticle {
  return knowledgeArticles[Math.floor(Math.random() * knowledgeArticles.length)];
}

// Categories with descriptions
export const categoryInfo: Record<ContentCategory, { name: string; description: string; icon: string }> = {
  muscle_science: {
    name: 'Muscle Science',
    description: 'How muscles grow and adapt to training',
    icon: '🔬'
  },
  lifting_technique: {
    name: 'Lifting Technique',
    description: 'Perfect your form and execution',
    icon: '🏋️'
  },
  periodization: {
    name: 'Periodization',
    description: 'Programming for long-term progress',
    icon: '📊'
  },
  recovery: {
    name: 'Recovery',
    description: 'Optimize rest and adaptation',
    icon: '😴'
  },
  nutrition: {
    name: 'Nutrition',
    description: 'Fuel your performance',
    icon: '🍎'
  },
  grappling: {
    name: 'Grappling',
    description: 'Sport-specific training advice',
    icon: '🥋'
  },
  motivation: {
    name: 'Training Mindset',
    description: 'Practical strategies for long-term progress',
    icon: '🧠'
  }
};
