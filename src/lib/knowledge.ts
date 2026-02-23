import { KnowledgeArticle, KnowledgeTip, ContentCategory } from './types';
import type { Insight } from './knowledge-engine';

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
  },

  // HRV/RECOVERY-BASED TRAINING
  {
    id: 'tip-hrv-1',
    content: 'Your HRV baseline is personal. A 45ms reading might be great for you but concerning for someone else. Focus on YOUR trends, not absolute numbers.',
    category: 'recovery'
  },
  {
    id: 'tip-hrv-2',
    content: 'HRV 10%+ below YOUR baseline? Consider reducing intensity by 1-2 RPE today. Your body is telling you something.',
    category: 'recovery'
  },
  {
    id: 'tip-rhr-1',
    content: 'Resting heart rate elevated 5+ BPM above your baseline often signals incomplete recovery, illness onset, or accumulated stress.',
    category: 'recovery'
  },
  {
    id: 'tip-readiness-1',
    content: 'Green recovery (67%+) = push hard, chase PRs. Yellow (34-66%) = maintain intensity, watch volume. Red (<33%) = technique focus only.',
    category: 'recovery'
  },
  {
    id: 'tip-readiness-2',
    content: 'Low readiness days aren\'t wasted days. Light technique work maintains neural pathways without digging into recovery debt.',
    category: 'recovery'
  },

  // ACWR / INJURY PREVENTION
  {
    id: 'tip-acwr-1',
    content: 'ACWR (Acute:Chronic Workload Ratio) between 0.8-1.3 is the "sweet spot". Below 0.8 = undertraining. Above 1.5 = injury danger zone.',
    category: 'periodization'
  },
  {
    id: 'tip-acwr-2',
    content: 'Never increase weekly volume more than 10%. Spikes above this dramatically increase injury risk, especially combined with grappling.',
    category: 'periodization'
  },
  {
    id: 'tip-acwr-3',
    content: 'Your total training load = lifting + grappling + life stress. A hard rolling week should mean lighter lifting, not more.',
    category: 'periodization'
  },

  // GRAPPLING-SPECIFIC RECOVERY
  {
    id: 'tip-grappling-recovery-1',
    content: 'After hard rolling, grip muscles need 48-72 hours to fully recover. Don\'t schedule heavy pulling the day after intense gi training.',
    category: 'grappling'
  },
  {
    id: 'tip-grappling-recovery-2',
    content: 'Neck soreness after grappling? Light neck circles and isometric holds speed recovery better than complete rest.',
    category: 'grappling'
  },
  {
    id: 'tip-grappling-recovery-3',
    content: 'Did hard grappling today? Your app auto-reduced volume by up to 30%. This isn\'t weakness — it\'s smart periodization.',
    category: 'grappling'
  },
  {
    id: 'tip-grappling-recovery-4',
    content: 'Training fingers too: grip work + grappling = overuse risk. Add finger extensor work (rubber band extensions) 3x/week for balance.',
    category: 'grappling'
  },

  // STRIKING-SPECIFIC
  {
    id: 'tip-striking-1',
    content: 'Rotational power comes from the hips, not the arms. Medicine ball rotational throws and cable woodchops build knockout power.',
    category: 'striking'
  },
  {
    id: 'tip-striking-2',
    content: 'Shoulder endurance determines how long you can keep your hands up. High-rep lateral raises and front holds build boxing stamina.',
    category: 'striking'
  },
  {
    id: 'tip-striking-3',
    content: 'Calf strength = footwork speed. Don\'t skip calf raises if you\'re a striker.',
    category: 'striking'
  },
  {
    id: 'tip-striking-4',
    content: 'Heavy bag work the day after leg day? Bad idea. Schedule striking and leg training with 48+ hours between.',
    category: 'striking'
  },
  {
    id: 'tip-striking-5',
    content: 'Core anti-rotation strength prevents you from being off-balanced by your own punches. Pallof press and suitcase carries are essential.',
    category: 'striking'
  },
  {
    id: 'tip-striking-6',
    content: 'Neck strength protects against knockouts. Iron neck or manual resistance neck training 2-3x/week is non-negotiable for strikers.',
    category: 'striking'
  },
  {
    id: 'tip-striking-7',
    content: 'Explosive hip extension powers kicks and punches alike. Kettlebell swings and hip thrusts translate directly to striking power.',
    category: 'striking'
  },

  // MMA-SPECIFIC
  {
    id: 'tip-mma-1',
    content: 'MMA demands everything: power, endurance, strength. Undulating periodization lets you train all qualities without burning out.',
    category: 'mma'
  },
  {
    id: 'tip-mma-2',
    content: 'Neck strength prevents knockouts and protects against chokes. 5 minutes of neck work 3x/week is non-negotiable for MMA.',
    category: 'mma'
  },
  {
    id: 'tip-mma-3',
    content: 'MMA fighters need pulling AND pushing strength. Don\'t neglect bench press just because grappling is pull-dominant.',
    category: 'mma'
  },
  {
    id: 'tip-mma-4',
    content: 'Cage work taxes the shoulders. Extra rear delt and rotator cuff work prevents the rounded "fighter shoulders" that lead to injury.',
    category: 'mma'
  },
  {
    id: 'tip-mma-5',
    content: 'Fight camps should reduce lifting volume by 30-40% while maintaining intensity. You\'re peaking for the fight, not the gym.',
    category: 'mma'
  },

  // GENERAL FITNESS / LIFTING HOBBYISTS
  {
    id: 'tip-fitness-1',
    content: 'You don\'t need to train like an athlete to look like one. 3 days/week of consistent lifting beats 6 days of inconsistent training.',
    category: 'general_fitness'
  },
  {
    id: 'tip-fitness-2',
    content: 'Aesthetics goal? Prioritize compound movements first, then add isolation work for lagging body parts.',
    category: 'general_fitness'
  },
  {
    id: 'tip-fitness-3',
    content: 'The best program is one you\'ll actually do. Enjoyment and consistency trump optimization every time.',
    category: 'general_fitness'
  },
  {
    id: 'tip-fitness-4',
    content: 'Not training for a sport? You have more recovery to spend on lifting. Take advantage with higher volume if you enjoy it.',
    category: 'general_fitness'
  },
  {
    id: 'tip-fitness-5',
    content: 'Strength training 2-3x/week is enough to build significant muscle and strength for most people. More isn\'t always better.',
    category: 'general_fitness'
  },
  {
    id: 'tip-fitness-6',
    content: 'Don\'t compare your progress to social media lifters. Many have years of training, favorable genetics, or pharmaceutical assistance.',
    category: 'general_fitness'
  },

  // PR & PROGRESS TRACKING
  {
    id: 'tip-pr-1',
    content: 'Not every workout needs to be a PR attempt. Chasing PRs when fatigued leads to form breakdown and injury. Save PR attempts for high-readiness days.',
    category: 'lifting_technique'
  },
  {
    id: 'tip-pr-2',
    content: 'Estimated 1RM is calculated using the Brzycki formula. It\'s most accurate in the 1-10 rep range. Higher reps become less reliable.',
    category: 'muscle_science'
  },
  {
    id: 'tip-pr-3',
    content: 'A PR isn\'t just more weight. Same weight for more reps, better form, or lower RPE is also progress worth celebrating.',
    category: 'motivation'
  },
  {
    id: 'tip-pr-4',
    content: 'Track every workout. Small weekly improvements compound into massive gains over months. You can\'t manage what you don\'t measure.',
    category: 'motivation'
  },

  // EQUIPMENT ADAPTATION
  {
    id: 'tip-equipment-1',
    content: 'No barbell? Dumbbell Romanian deadlifts and Bulgarian split squats can maintain your strength when traveling.',
    category: 'lifting_technique'
  },
  {
    id: 'tip-equipment-2',
    content: 'Hotel gym tip: High-rep dumbbell work (15-20 reps) maintains muscle with lighter weights. Focus on slow eccentrics and pauses.',
    category: 'lifting_technique'
  },
  {
    id: 'tip-equipment-3',
    content: 'Home gym essentials: Adjustable dumbbells, pull-up bar, resistance bands. You can build serious strength with just these.',
    category: 'general_fitness'
  },
  {
    id: 'tip-equipment-4',
    content: 'No squat rack? Goblet squats, lunges, and single-leg work can build impressive leg strength with minimal equipment.',
    category: 'lifting_technique'
  },

  // EXERCISE SWAPPING
  {
    id: 'tip-swap-1',
    content: 'Swapping exercises? Choose alternatives that hit the same movement pattern and muscle groups. The app\'s match score helps with this.',
    category: 'lifting_technique'
  },
  {
    id: 'tip-swap-2',
    content: 'If an exercise causes joint pain, swap it. Pain is not gain — it\'s a signal to find a better variation for your body.',
    category: 'lifting_technique'
  },

  // BODYWEIGHT & WEIGHT FLUCTUATIONS
  {
    id: 'tip-weight-1',
    content: 'Daily weight can fluctuate 2-4 lbs from water, sodium, and food volume. Weekly averages matter more than daily numbers.',
    category: 'nutrition'
  },
  {
    id: 'tip-weight-2',
    content: 'Weigh yourself at the same time daily (morning, after bathroom, before eating) for consistent tracking.',
    category: 'nutrition'
  },
  {
    id: 'tip-weight-3',
    content: 'Weight stalled but lifts going up? You\'re likely recomping — building muscle while losing fat. Trust the process.',
    category: 'nutrition'
  },

  // COMPETITION PREP (ALL COMBAT SPORTS)
  {
    id: 'tip-comp-1',
    content: 'Competition week: reduce lifting volume by 40-50%, maintain intensity. You\'re preserving strength, not building it.',
    category: 'periodization'
  },
  {
    id: 'tip-comp-2',
    content: 'Last heavy lifting session should be 5-7 days before competition. Light technique work only in the final 3 days.',
    category: 'periodization'
  },
  {
    id: 'tip-comp-3',
    content: 'Taper for competition: Reduce volume first, then frequency. Maintain intensity until the last 3 days.',
    category: 'periodization'
  },
  {
    id: 'tip-comp-4',
    content: 'Fight week is not the time to try new exercises or max out. Stick to familiar movements at moderate intensity.',
    category: 'mma'
  },

  // MOBILITY
  {
    id: 'tip-mobility-1',
    content: 'Hip mobility directly affects guard game and kicking power. 5 minutes of hip circles and 90/90 stretches daily pays dividends.',
    category: 'recovery'
  },
  {
    id: 'tip-mobility-2',
    content: 'Dynamic stretching before training, static stretching after. This order optimizes performance and recovery.',
    category: 'recovery'
  },
  {
    id: 'tip-mobility-3',
    content: 'Tight hip flexors from sitting? Couch stretch and half-kneeling hip flexor stretches for 2 min each side, daily.',
    category: 'recovery'
  },

  // INJURY PREVENTION
  {
    id: 'tip-injury-1',
    content: 'Logging minor aches helps identify patterns. That nagging shoulder might be connected to last week\'s volume spike.',
    category: 'recovery'
  },
  {
    id: 'tip-injury-2',
    content: 'Rule of 7: If discomfort persists beyond 7 days or gets worse, see a professional. Early intervention prevents chronic issues.',
    category: 'recovery'
  },
  {
    id: 'tip-injury-3',
    content: 'Warming up is not optional. 10 minutes of movement prep prevents months of injury rehab.',
    category: 'lifting_technique'
  },

  // MESOCYCLE & PERIODIZATION
  {
    id: 'tip-meso-1',
    content: 'A mesocycle typically lasts 4-6 weeks. Each week should progressively increase volume or intensity, then deload.',
    category: 'periodization'
  },
  {
    id: 'tip-meso-2',
    content: 'End-of-mesocycle performance dip is normal. It means you accumulated enough fatigue to trigger adaptation during deload.',
    category: 'periodization'
  },

  // EXERCISE-SPECIFIC CUES
  {
    id: 'tip-pullup-1',
    content: 'Pull-ups: Start each rep from a dead hang with shoulders packed. Pull elbows to your hips, not behind you.',
    category: 'lifting_technique',
    exerciseId: 'pull-up'
  },
  {
    id: 'tip-hipthrust-1',
    content: 'Hip thrusts: Chin tucked, ribs down. Push through heels and squeeze glutes at the top. Direct carryover to bridge escapes.',
    category: 'lifting_technique',
    exerciseId: 'hip-thrust'
  },
  {
    id: 'tip-kbswing-1',
    content: 'Kettlebell swings: It\'s a hip hinge, not a squat. Snap the hips, don\'t lift with the arms. Power comes from the posterior chain.',
    category: 'lifting_technique',
    exerciseId: 'kettlebell-swing'
  },
  {
    id: 'tip-facepull-1',
    content: 'Face pulls: Pull to your forehead, externally rotate at the end. Essential for shoulder health, especially for fighters.',
    category: 'lifting_technique',
    exerciseId: 'face-pull'
  },
  // ── Diet & Training Integration Tips ──────────────────────────────────────
  {
    id: 'tip-diet-cut-volume',
    content: 'During a cut, maintain heavy compound loads but reduce volume ~20%. Your body can\'t recover from the same training stress in a deficit. Strength is neurally mediated and survives deficits better than hypertrophy (Murphy & Koehler, 2022).',
    category: 'dieting'
  },
  {
    id: 'tip-diet-cut-rest',
    content: 'In a caloric deficit, take 25-30% longer rest between sets. Glycogen stores are lower and CNS recovery is compromised. Longer rest lets you maintain the loads that actually preserve muscle.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-cut-rpe',
    content: 'During a cut, aim for RPE 7-8.5 instead of always grinding to RPE 9-10. You need a fatigue buffer — recovery capacity is reduced and injury risk rises with accumulated fatigue in a deficit.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-protein-timing',
    content: 'Distribute protein evenly across 4-5 meals (30-50g each). A meta-analysis by Schoenfeld et al. (2018) found protein distribution matters more than total daily timing for muscle retention.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-protein-cut',
    content: 'During a cut, protein needs go UP, not down. Aim for 2.0-2.4 g/kg to minimize muscle loss. The leaner you are, the higher you need to go (Helms et al., 2014).',
    category: 'dieting'
  },
  {
    id: 'tip-diet-fat-floor',
    content: 'Never drop dietary fat below 0.8 g/kg (men) or 1.0 g/kg (women). Fat is essential for testosterone, estrogen, and overall hormonal function. Going too low causes hormonal disruption — RED-S in women (Melin et al., 2019).',
    category: 'dieting'
  },
  {
    id: 'tip-diet-surplus-training',
    content: 'In a surplus, you can handle ~10% more training volume and push RPE higher. Your body recovers faster with more energy available. This is prime time for progressive overload.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-deload-cut',
    content: 'Deload more frequently during a cut — every 3-4 weeks instead of 5-6. Your recovery capacity is reduced, and accumulated fatigue can mimic overtraining when combined with energy restriction.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-break',
    content: 'After 6-8 weeks of cutting, take a 1-2 week diet break at maintenance. Byrne et al. (2017) showed intermittent dieting preserves metabolic rate and improves long-term fat loss vs continuous restriction.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-carbs-training',
    content: 'On training days, eat more carbs around your workout (before and after). Carbs fuel high-intensity training and replenish glycogen. On rest days, slightly lower carbs and higher fat is fine.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-weight-fluctuation',
    content: 'Daily weight can fluctuate 1-3 lbs from water, sodium, and food volume. Use a 7-day moving average to track real trends. Don\'t panic over a single weigh-in — look at the weekly direction.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-recomp',
    content: 'Body recomposition (gaining muscle while losing fat) is possible for beginners and detrained lifters, but becomes much harder for intermediates. For most trained lifters, dedicated cut/bulk phases are more effective (Barakat et al., 2020).',
    category: 'dieting'
  },
  {
    id: 'tip-diet-rate-loss',
    content: 'Aim to lose 0.5-0.7% of body weight per week during a cut. Faster rates (>1% BW/week) significantly increase muscle loss, especially in leaner individuals (Garthe et al., 2011).',
    category: 'dieting'
  },
  {
    id: 'tip-diet-women-cut',
    content: 'Women should cut more conservatively (~0.5% BW/week vs 0.7% for men). Aggressive deficits are more likely to disrupt menstrual function, thyroid, and cortisol in women (Melin et al., 2019).',
    category: 'dieting'
  },
  {
    id: 'tip-diet-women-fat',
    content: 'Women need a higher minimum fat intake (1.0 g/kg) than men (0.8 g/kg) during a cut. Low fat disrupts estrogen production and menstrual health — a key risk factor for RED-S (Relative Energy Deficiency in Sport).',
    category: 'dieting'
  },
  {
    id: 'tip-diet-surplus-size',
    content: 'A smaller surplus (5-10% above maintenance) is nearly as effective as a large one for muscle gain, with far less fat gain. Helms et al. (2023) showed a 15% surplus mostly added extra fat, not extra muscle.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-creatine',
    content: 'Creatine monohydrate (3-5g daily) is the most evidence-backed supplement for strength and muscle. It works in both surplus and deficit. Don\'t cycle it — just take it every day.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-adherence',
    content: 'The best diet is the one you can stick to. Adherence trumps optimization. A moderate deficit you can maintain for 8 weeks beats an aggressive one you abandon after 2.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-combat-weight',
    content: 'Combat athletes: don\'t cut weight AND train hard simultaneously. Reduce training volume by 20-30% during weight cuts. Your sport performance depends on both strength and energy availability.',
    category: 'dieting'
  },
  {
    id: 'tip-diet-sleep-deficit',
    content: 'Sleep becomes even more critical during a caloric deficit. Poor sleep (< 6 hrs) during a cut shifts weight loss toward muscle rather than fat. Prioritize 7-9 hours (Nedeltcheva et al., 2010).',
    category: 'dieting'
  }
];

// Full educational articles for the Knowledge section
export const knowledgeArticles: KnowledgeArticle[] = [
  {
    id: 'article-undulating-periodization',
    title: 'Why Undulating Periodization Works for Grapplers',
    tldr: 'Vary intensity within each week to build strength, power, and endurance from just 2-3 lifting sessions.',
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
    tldr: 'Mechanical tension, eccentric emphasis, and 10-20 sets/muscle/week — the three levers that actually drive growth.',
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
    tldr: 'Your brain adapts before your muscles do — neural recruitment, rate coding, and why heavy training is non-negotiable.',
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
    tldr: 'The 6 movement patterns every grappler needs, a sample 3-day split, and how to never let lifting hurt mat time.',
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
    tldr: '3-4 second eccentrics produce 15% more hypertrophy per set. Here\'s how to implement them.',
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
    tldr: 'Four types of grip strength, a 5-exercise circuit, and gi vs no-gi training differences.',
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
    tldr: 'Sleep and protein are Tier 1. Cold water immersion is Tier 2. BCAAs and compression gear are marketing.',
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
    tldr: 'Fat loss vs water cut — two different processes. Training day vs rest day nutrition, and the only 4 supplements worth buying.',
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
    tldr: 'Recovery slows, joints need more warm-up, but smart programming means you can train harder at 40 than most do at 25.',
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
    tldr: 'RPE-based training adapts to your daily readiness. Green/yellow/red light system for when to push and when to back off.',
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
  },
  {
    id: 'article-hrv-baselines',
    title: 'Understanding Your HRV & RHR Baselines',
    tldr: 'Your HRV is only meaningful relative to YOU. How to build a 14-day baseline and interpret daily readings.',
    category: 'recovery',
    tags: ['HRV', 'recovery', 'wearables', 'readiness', 'science'],
    readTime: 6,
    publishedAt: new Date('2025-03-15'),
    source: 'Plews et al. 2024, Buchheit 2014',
    content: `
## Why Personal Baselines Matter

A common mistake: comparing your HRV to internet averages. Someone with a baseline HRV of 45ms seeing 50ms is doing great. Someone with a baseline of 80ms seeing 50ms is in serious recovery debt.

**Your numbers are only meaningful relative to YOU.**

## What is HRV?

Heart Rate Variability measures the variation in time between heartbeats. Higher HRV generally indicates better parasympathetic tone, greater recovery capacity, and more adaptable stress response.

Lower HRV often signals incomplete recovery, accumulated fatigue, illness onset, or high life stress.

## How We Calculate Your Baseline

This app tracks your last 14 days of data to establish rolling baselines:

- **HRV Baseline**: Your personal 14-day average
- **HRV Standard Deviation**: How much your HRV normally varies
- **RHR Baseline**: Your personal 14-day average resting HR

### Interpreting Your Daily Readings

- **HRV > baseline + 1 SD**: Excellent recovery - green light for hard training
- **HRV within 1 SD**: Normal - train as planned
- **HRV < baseline - 1 SD**: Below normal - consider reducing intensity
- **HRV < baseline - 2 SD**: Significantly low - rest or light technique only

## Building Reliable Baselines

For accurate baselines:
1. Measure at the same time daily (morning, before getting up)
2. 14+ days of data needed for reliable baseline
3. Do not panic over single-day dips
4. Week-over-week trends matter more than daily fluctuations
`
  },
  {
    id: 'article-acwr-injury',
    title: 'ACWR: The Injury Prevention Framework',
    tldr: 'It\'s not high load that causes injuries — it\'s spikes in load. The 10% rule that prevents most training injuries.',
    category: 'periodization',
    tags: ['injury', 'ACWR', 'periodization', 'science', 'grappling'],
    readTime: 7,
    publishedAt: new Date('2025-03-20'),
    source: 'Gabbett 2016, 2020 updates',
    content: `
## What is ACWR?

The Acute:Chronic Workload Ratio compares your recent training load (this week) to your average load over the past month. It is one of the most validated injury prediction tools in sports science.

**ACWR = Acute Load (this week) / Chronic Load (4-week average)**

## The Risk Zones

- **< 0.8**: Undertraining - losing fitness, but low injury risk
- **0.8 - 1.3**: Sweet Spot - optimal training, lowest injury risk
- **1.3 - 1.5**: Caution - elevated injury risk, monitor closely
- **> 1.5**: High Risk - significantly elevated injury risk

### The Key Insight

It is not high training load that causes injuries - it is **spikes** in training load. An athlete who gradually builds to 15 hours/week is safer than one who jumps from 8 to 12 hours in a single week.

## Why This Matters for Grapplers

Grapplers face unique challenges:
- Dual Training Load: Lifting + grappling both count toward total load
- Unpredictable Mat Time: Hard rolling days are not always planned
- Competition Spikes: Tournament weeks can spike load dramatically

## The 10% Rule

Never increase total weekly load by more than 10%. This single rule prevents most training-related injuries.
`
  },
  {
    id: 'article-grappling-recovery',
    title: 'Recovery Protocol for Combat Athletes',
    tldr: 'Grip recovery, neck health protocols, and the 48-hour rule after hard sparring or competition.',
    category: 'grappling',
    tags: ['grappling', 'recovery', 'BJJ', 'wrestling', 'MMA'],
    readTime: 6,
    publishedAt: new Date('2025-03-25'),
    source: 'Sports science research on combat sports 2023-2025',
    content: `
## The Grappler's Recovery Challenge

Combat sports impose unique recovery demands:
- Grip fatigue accumulates faster than other muscle groups
- Neck and spine face constant loading
- Joint stress from submissions and positions
- CNS fatigue from problem-solving under physical stress

## Grip Recovery Protocol

### Post-Training (Same Day)
- Light finger extensions with rubber band (3x20)
- Forearm stretches (wrist flexors and extensors)

### Between Sessions
- No heavy pulling 24-48 hours after hard gi training
- Finger extensor work 3x/week minimum

## Neck Health Protocol

### Daily (5 minutes)
- Neck circles: 10 each direction
- Chin tucks: 3x10 holds
- Isometric holds: front/back/sides, 10s each

## The 48-Hour Rule

After hard grappling (competition-style rounds or tournament):

**Hours 0-12**: Light movement, hydration focus, protein intake (40-50g), sleep priority

**Hours 12-24**: Active recovery only, continue elevated protein

**Hours 24-48**: Light drilling okay, lifting with 20-30% volume reduction

**After 48 Hours**: Normal training can resume if recovery indicators are good
`
  },
  {
    id: 'article-striking-strength',
    title: 'Strength Training for Strikers',
    tldr: 'Rotational power, hip extension, shoulder endurance, and core anti-rotation — the 4 pillars of knockout power.',
    category: 'striking',
    tags: ['striking', 'boxing', 'kickboxing', 'power'],
    readTime: 6,
    publishedAt: new Date('2025-03-01'),
    content: `
## Why Strikers Need Strength Training

Knockout power isn't just about technique — it's physics. Force = Mass × Acceleration. Strength training increases both your ability to generate force and the speed at which you can apply it.

## The Striker's Priority List

### 1. Rotational Power
Punches and kicks are rotational movements. The power chain goes: feet → hips → core → shoulders → fist/shin.

**Key Exercises:**
- Medicine ball rotational throws
- Cable woodchops
- Landmine rotations
- Russian twists (weighted)

### 2. Hip Extension Power
Your hips are the engine. Explosive hip extension powers everything from jabs to head kicks.

**Key Exercises:**
- Kettlebell swings
- Hip thrusts
- Box jumps
- Power cleans

### 3. Shoulder Endurance
Keeping your hands up for 3-5 rounds requires serious shoulder stamina.

**Key Exercises:**
- High-rep lateral raises (20-30 reps)
- Front raise holds
- Battle ropes
- Shadow boxing with light weights (carefully)

### 4. Core Anti-Rotation
Your core must resist rotation to transfer power efficiently and absorb body shots.

**Key Exercises:**
- Pallof press
- Suitcase carries
- Dead bugs
- Ab wheel rollouts

## Sample Weekly Split

### Day 1 - Power (Before Technical Work)
- Box Jumps 4x5
- Medicine Ball Rotational Throws 3x8 each side
- Kettlebell Swings 4x10
- Pallof Press 3x12 each side

### Day 2 - Strength (Light Sparring Day)
- Trap Bar Deadlift 4x5
- Bench Press 4x6
- Weighted Pull-ups 4x6
- Farmer's Walks 3x40m

### Day 3 - Endurance/Prehab
- High-rep shoulder circuit
- Core stability work
- Neck strengthening
- Calf raises for footwork

## Key Principles

1. **Never lift heavy before sparring** - Fatigued muscles = slower reactions = getting hit
2. **Prioritize power over size** - You want fast-twitch fibers, not bodybuilder bulk
3. **Train neck religiously** - It's your chin's insurance policy
4. **Don't neglect legs** - Footwork is everything, and leg strength = kicking power
`
  },
  {
    id: 'article-mma-programming',
    title: 'Strength & Conditioning for MMA',
    tldr: 'All three energy systems, concurrent training splits for off-season vs fight camp, and the 4 common programming mistakes.',
    category: 'mma',
    tags: ['MMA', 'fighting', 'conditioning', 'programming'],
    readTime: 8,
    publishedAt: new Date('2025-03-05'),
    content: `
## The MMA Training Challenge

MMA fighters need everything: knockout power, submission strength, wrestling explosiveness, AND cardio for 3-5 rounds. Traditional bodybuilding or powerlifting programs don't cut it.

## Energy System Demands

### Striking Exchanges
- ATP-PCr system (0-10 seconds)
- High power output, short duration

### Grappling Scrambles
- Glycolytic system (10 seconds - 2 minutes)
- Sustained high-intensity efforts

### Full Rounds
- Oxidative system (2+ minutes)
- Ability to recover between bursts

## The Solution: Concurrent Training

Train all qualities year-round, adjusting emphasis based on fight schedule:

### Off-Season (No Fight Scheduled)
- **60%** Strength/Hypertrophy
- **25%** Power
- **15%** Conditioning

### Fight Camp (8-12 Weeks Out)
- **30%** Strength (maintenance)
- **30%** Power
- **40%** Sport-specific conditioning

### Peak Week
- **10%** Light movement/activation
- **90%** Rest and recovery

## Essential Exercises for MMA

### For Takedowns
- Power cleans
- Barbell rows
- Deadlifts
- Single-leg work

### For Ground Control
- Weighted pull-ups
- Hip thrusts
- Farmer's walks
- Turkish get-ups

### For Striking Power
- Medicine ball throws
- Kettlebell swings
- Plyometrics
- Rotational core work

### For Durability
- Neck training
- Grip work
- Shoulder prehab
- Hip mobility

## Common Mistakes

1. **Too much volume** - You're already training martial arts 4-6x/week. Lifting should supplement, not compete.

2. **Ignoring conditioning** - Strength means nothing if you gas in round 2.

3. **Training through injuries** - One bad injury can end a career. Listen to your body.

4. **Cutting weight while building strength** - These goals conflict. Plan your weight class well in advance.

## Recovery is Part of Training

MMA is brutal on the body. You cannot out-train bad recovery:
- 8+ hours sleep
- 1g protein per lb bodyweight
- Deload every 4-6 weeks
- Active recovery days, not just rest days
`
  },
  {
    id: 'article-general-strength',
    title: 'Building Strength: A Beginner\'s Complete Guide',
    tldr: 'The Big 5 movement patterns, rep ranges by experience level, and the 80/20 of getting results.',
    category: 'general_fitness',
    tags: ['beginner', 'strength', 'programming', 'basics'],
    readTime: 7,
    publishedAt: new Date('2025-02-25'),
    content: `
## Strength Training Fundamentals

Whether you want to build muscle, get stronger, improve health, or just feel better — the fundamentals are the same.

## The Big 5 Movement Patterns

Every good program includes these:

### 1. Squat (Quad-Dominant)
- Back squat, front squat, goblet squat
- Works: Quads, glutes, core

### 2. Hinge (Hip-Dominant)
- Deadlift, Romanian deadlift, kettlebell swing
- Works: Hamstrings, glutes, lower back

### 3. Horizontal Push
- Bench press, push-ups, dumbbell press
- Works: Chest, front delts, triceps

### 4. Horizontal Pull
- Barbell row, cable row, dumbbell row
- Works: Lats, rhomboids, biceps

### 5. Vertical Pull
- Pull-ups, lat pulldown, chin-ups
- Works: Lats, biceps, rear delts

## How Much, How Often?

### For Beginners (0-1 year)
- 3 days per week, full body
- 3-4 sets per exercise
- 6-12 reps per set
- Focus on learning form

### For Intermediates (1-3 years)
- 3-4 days per week
- 4-5 sets per exercise
- Vary rep ranges (strength, hypertrophy)
- Start tracking progressive overload

### For Advanced (3+ years)
- 4-6 days per week
- Periodized programming
- Autoregulation (RPE-based)
- Specialized blocks

## Progressive Overload

The key to getting stronger: gradually increase demands over time.

### Ways to Progress
1. Add weight (most obvious)
2. Add reps at same weight
3. Add sets
4. Improve technique
5. Reduce rest times
6. Slow down tempo

## Common Beginner Mistakes

1. **Program hopping** - Stick with one program for 8-12 weeks minimum
2. **Ego lifting** - Light weight with good form beats heavy weight with bad form
3. **Skipping legs** - Don't be that person
4. **No tracking** - If you're not logging, you're guessing
5. **Expecting fast results** - Visible changes take 3-6 months of consistent work

## The 80/20 of Getting Results

- **Consistency** > Perfect program
- **Sleep** > Supplements
- **Compound lifts** > Isolation exercises
- **Protein intake** > Meal timing
- **Progressive overload** > Training to failure every set
`
  },
  {
    id: 'article-progressive-overload',
    title: 'Progressive Overload: Beyond Just Adding Weight',
    tldr: '7 ways to progress when adding weight stalls — reps, sets, tempo, ROM, technique, density, and when to use each.',
    category: 'general_fitness',
    tags: ['progression', 'programming', 'intermediate', 'plateau'],
    readTime: 5,
    publishedAt: new Date('2025-03-10'),
    content: `
## What is Progressive Overload?

Progressive overload is the gradual increase of stress placed on the body during training. It's the fundamental principle behind all strength and muscle gains.

But here's what most people miss: **adding weight is just ONE way to overload.**

## 7 Ways to Progress

### 1. Add Weight
The classic. If you benched 135x8 last week, try 140x8 this week.

**Best for:** Compound lifts, strength phases

### 2. Add Reps
Same weight, more reps. 135x8 becomes 135x10.

**Best for:** Hypertrophy, when weight jumps feel too big

### 3. Add Sets
More total volume. 3x8 becomes 4x8.

**Best for:** Breaking plateaus, intermediate lifters

### 4. Improve Technique
Better form = better muscle activation = more growth stimulus.

**Best for:** Everyone, always

### 5. Increase Range of Motion
Deeper squat, fuller stretch on RDLs, pause at bottom of bench.

**Best for:** Hypertrophy, mobility, joint health

### 6. Slow Down Tempo
3-second eccentric instead of 1-second. Same weight feels much harder.

**Best for:** Hypertrophy, mind-muscle connection, injury rehab

### 7. Reduce Rest Time
Same workout in less time = higher training density.

**Best for:** Conditioning, time-crunched sessions

## When to Use Each Method

| Situation | Best Progression Method |
|-----------|------------------------|
| New to lifting | Add reps, then weight |
| Strength plateau | Add sets or improve technique |
| Hypertrophy focus | Tempo, ROM, or add sets |
| Time-limited | Reduce rest |
| Coming back from injury | Tempo and ROM |

## The Progression Hierarchy

When you can't add weight, work down this list:
1. Can I add 1-2 reps?
2. Can I add a set?
3. Can I slow the eccentric?
4. Can I increase range of motion?
5. Can I improve my technique?

If you're progressing in ANY of these, you're still making gains.

## Tracking Progress

You must track to know if you're progressing:
- Log every workout
- Note weight, reps, sets, RPE
- Review weekly/monthly trends
- Celebrate small wins

This app tracks all of this automatically. Use it.
`
  },
  {
    id: 'article-dieting-training-integration',
    title: 'How Your Diet Phase Should Change Your Training',
    tldr: 'Cutting? Drop volume, keep intensity. Bulking? Push volume harder. The research on why most people get this backwards.',
    category: 'dieting',
    tags: ['dieting', 'training', 'cut', 'bulk', 'programming'],
    readTime: 7,
    publishedAt: new Date('2025-03-20'),
    source: 'Helms et al. 2015, Murphy & Koehler 2022, Roth et al. 2023',
    content: `
## Your Diet Phase Directly Affects Training

Most people keep training the same whether they're cutting, maintaining, or bulking. This is a mistake backed by strong evidence.

### During a Cut (Caloric Deficit)

Your recovery capacity drops significantly in a deficit. The research is clear:

**Volume:** Reduce by 15-20%. You cannot recover from the same volume with less fuel. Murphy & Koehler (2022) showed that maintaining volume in a deficit leads to accumulated fatigue without additional muscle retention.

**Intensity:** Keep loads heavy but reduce RPE by 0.5-1 point. Heavy loads preserve strength neurally. Dropping to light weights is the #1 mistake — it removes the stimulus that tells your body to keep muscle.

**Rest Periods:** Extend by 25-30%. Glycogen is depleted faster in a deficit. Longer rest lets you maintain the loads that actually matter.

**Deload Frequency:** Every 3-4 weeks instead of 5-6. Recovery debt accumulates faster.

### During a Bulk (Caloric Surplus)

More fuel = more recovery capacity. Take advantage:

**Volume:** Increase by 10%. This is prime time for progressive overload. Your body can handle more training stress.

**Intensity:** Push RPE slightly higher (+0.3). You can handle closer-to-failure training with more calories available.

**Rest Periods:** Can be shortened by ~10%. Better glycogen status means faster recovery between sets.

**Deload Frequency:** Every 5-6 weeks. You recover better, so you can accumulate more productive training before needing to deload.

### During Maintenance

Train normally. This is your baseline programming.

## Practical Takeaways

1. **Never drop intensity during a cut** — drop volume instead
2. **A surplus is wasted if you don't train harder** — add volume
3. **Adjust deload timing to your diet phase** — cut = more frequent deloads
4. **This app auto-adjusts** — your diet phase is factored into workout generation
`
  },
  {
    id: 'article-cutting-guide',
    title: 'The Evidence-Based Guide to Cutting Weight',
    tldr: '0.5-0.7% BW/week, protein up not down, fat floors for hormone health, and red flags that mean stop immediately.',
    category: 'dieting',
    tags: ['dieting', 'cut', 'fat-loss', 'muscle-retention'],
    readTime: 8,
    publishedAt: new Date('2025-03-25'),
    source: 'Garthe et al. 2011, Helms et al. 2014, Byrne et al. 2017',
    content: `
## How to Cut Without Losing Muscle

Losing fat while keeping muscle is a science, not a guessing game. Here's what the research says.

### Rate of Loss

**Men:** 0.5-0.7% of bodyweight per week. Garthe et al. (2011) showed that athletes losing weight at ~0.7% BW/week retained significantly more muscle than those losing at 1%+.

**Women:** 0.3-0.5% of bodyweight per week. Women are more susceptible to hormonal disruption from aggressive deficits (Melin et al., 2019). Slower is safer.

### Protein Requirements During a Cut

Protein needs go UP during a deficit, not down:
- **Men:** 2.2-2.4 g/kg bodyweight
- **Women:** 2.0-2.2 g/kg bodyweight

The leaner you get, the higher protein needs to go to prevent muscle loss (Helms et al., 2014).

### Fat Floors (Minimum Fat Intake)

Never drop dietary fat below:
- **Men:** 0.8 g/kg bodyweight
- **Women:** 1.0 g/kg bodyweight

Low fat disrupts hormone production. For women, this is a risk factor for RED-S (Relative Energy Deficiency in Sport) — a condition that impairs bone health, immune function, and menstrual health (Melin et al., 2019).

### Diet Breaks

Byrne et al. (2017) — the MATADOR study — showed that intermittent dieting (2 weeks deficit, 1-2 weeks maintenance) preserved metabolic rate better than continuous restriction.

**Recommended timing:**
- Men: Diet break every 6-8 weeks
- Women: Diet break every 4-6 weeks

### Maximum Cut Duration

- Men: 12-16 weeks before a mandatory extended break
- Women: 8-12 weeks before a mandatory extended break

### Training During a Cut

See "How Your Diet Phase Should Change Your Training" for the full breakdown. Key point: maintain intensity, reduce volume.

## Red Flags to Watch For

Stop your cut if you experience:
- Persistent fatigue lasting 2+ weeks
- Loss of menstrual period (women)
- Significant strength loss (>10% on compound lifts)
- Mood disturbances, irritability, or depression
- Chronic sleep disruption
- Frequent illness

These are signs of Relative Energy Deficiency. Return to maintenance immediately.
`
  },
  {
    id: 'article-bulking-guide',
    title: 'Smart Bulking: Maximize Muscle, Minimize Fat',
    tldr: 'A 10-12% surplus builds the same muscle as 15% with way less fat. Optimal rates, macro splits, and when to stop.',
    category: 'dieting',
    tags: ['dieting', 'bulk', 'muscle-gain', 'surplus'],
    readTime: 6,
    publishedAt: new Date('2025-03-28'),
    source: 'Helms et al. 2023, Iraki et al. 2019',
    content: `
## The Science of Gaining Muscle

Building muscle requires a caloric surplus — but bigger is NOT better when it comes to that surplus.

### Optimal Surplus Size

Helms et al. (2023) showed that a 15% surplus produced roughly the same muscle gain as a 5-10% surplus, but with significantly more fat gain.

**Recommended surplus:**
- Men: 10-12% above maintenance
- Women: 8-10% above maintenance

### Rate of Weight Gain

- **Beginners:** 0.5-1% BW/month (higher muscle:fat ratio)
- **Intermediates:** 0.25-0.5% BW/month
- **Advanced:** 0.1-0.25% BW/month

Gaining faster than these rates primarily adds fat, not muscle.

### Macro Distribution During a Bulk

**Protein:** 1.6-2.0 g/kg. Slightly lower than during a cut because your body has enough energy to be more protein-efficient.

**Fat:** 0.8-1.0 g/kg. Important for hormonal health and overall energy.

**Carbs:** Fill remaining calories. Carbs fuel high-intensity training and support recovery — they're your best friend during a bulk.

### Training During a Bulk

This is when you push hardest:
- Add 10% more training volume
- Push RPE slightly higher
- Progressive overload aggressively
- Deload every 5-6 weeks

### Maximum Bulk Duration

- Men: 16-20 weeks
- Women: 12-16 weeks

After this, a maintenance phase (4-6 weeks) helps stabilize new weight before deciding next steps.

### Common Bulking Mistakes

1. **"Dirty bulking"** — eating everything in sight just adds fat
2. **Not training hard enough** — a surplus without training stimulus becomes fat storage
3. **Too long without assessment** — check progress every 4 weeks
4. **Neglecting sleep** — muscle is built during recovery, and sleep is king
`
  },
  {
    id: 'article-women-nutrition',
    title: 'Nutrition for Female Athletes: What the Science Says',
    tldr: 'Energy availability thresholds, RED-S warning signs, higher fat minimums, and why slower cuts are physiologically necessary.',
    category: 'dieting',
    tags: ['dieting', 'women', 'hormones', 'RED-S', 'nutrition'],
    readTime: 8,
    publishedAt: new Date('2025-04-01'),
    source: 'Melin et al. 2019, Loucks & Thuma 2003, Mountjoy et al. 2018',
    content: `
## Why Women Need Different Nutrition Strategies

Women's physiology differs from men's in ways that directly impact nutrition for athletic performance. Ignoring these differences leads to poor outcomes — and potentially serious health consequences.

### Energy Availability: The Critical Number

Energy availability (EA) = (Energy Intake - Exercise Energy Expenditure) / Fat-Free Mass

Loucks & Thuma (2003) identified the threshold: when EA drops below 30 kcal/kg FFM/day, hormonal disruption begins. For women, this threshold is less forgiving than for men.

### RED-S (Relative Energy Deficiency in Sport)

RED-S is not just about eating disorders. It affects any athlete in a sustained energy deficit — even unintentionally.

**Symptoms include:**
- Menstrual irregularity or loss (amenorrhea)
- Decreased bone density
- Impaired immune function
- Increased injury risk
- Mood disturbances
- Decreased training adaptation

**Prevention:**
- Never go below 1200 kcal/day
- Maintain fat intake above 1.0 g/kg
- Take diet breaks every 4-6 weeks during cuts
- Monitor menstrual regularity as a health marker

### Macronutrient Differences

**Protein:** Women can retain muscle with slightly less protein during a cut (2.0-2.2 g/kg vs 2.2-2.4 for men), but should not go lower.

**Fat:** Higher minimum (1.0 g/kg vs 0.8 for men). Fat is essential for estrogen production. Low estrogen = poor bone health, impaired recovery, and mood disturbances.

**Carbs:** Similar needs to men relative to training intensity. Don't fear carbs — they fuel performance.

### Menstrual Cycle Considerations

While individual responses vary, general patterns:
- **Follicular phase (days 1-14):** Higher carb tolerance, potentially better strength performance
- **Luteal phase (days 15-28):** Slightly higher metabolic rate, may benefit from slightly more calories

However, the research is still evolving. The most important factor is overall energy availability, not cycle-phase micro-adjustments.

### Cutting Rates for Women

- Maximum: 0.5% BW/week (vs 0.7% for men)
- Recommended: 0.3-0.5% BW/week
- Diet breaks: Every 4-6 weeks (vs 6-8 for men)
- Maximum cut duration: 8-12 weeks (vs 12-16 for men)

### Key Takeaways

1. Energy availability matters more than calories alone
2. Fat intake directly affects hormonal health
3. Slower cuts protect against RED-S
4. Menstrual regularity is a health indicator — not a nuisance
5. More frequent diet breaks are physiologically important, not a luxury
`
  },
  {
    id: 'article-combat-sport-periodization',
    title: 'Periodization for Combat Sports Athletes',
    tldr: 'Annual planning from off-season to fight week, sport-specific priorities, and a weekly structure that protects mat time.',
    category: 'periodization',
    tags: ['periodization', 'combat', 'MMA', 'grappling', 'striking', 'competition'],
    readTime: 7,
    publishedAt: new Date('2025-03-15'),
    content: `
## The Combat Athlete's Dilemma

You need to be strong, powerful, AND well-conditioned. You also need to spend most of your time practicing your actual sport. How do you fit it all in?

## Annual Planning

### Off-Season (No Competition in Sight)
**Goal:** Build your physical base

- Higher lifting volume (4x/week possible)
- Focus on weaknesses (strength, muscle, power)
- Technical drilling in your sport
- Light sparring only

### Pre-Competition (8-12 Weeks Out)
**Goal:** Peak for your event

- Reduce lifting volume 30-40%
- Maintain intensity
- Increase sport-specific work
- Ramp up sparring intensity

### Competition Week
**Goal:** Rest and prime

- Minimal lifting (activation only)
- Light technical work
- Focus on weight management (if applicable)
- Mental preparation

### Post-Competition (1-2 Weeks)
**Goal:** Recover

- No hard training
- Active recovery
- Address any injuries
- Mental reset

## Weekly Structure Example

### Pre-Competition Phase

**Monday:** AM - Strength (Lower), PM - Technical drilling
**Tuesday:** Sport practice (hard sparring)
**Wednesday:** AM - Power/Plyos, PM - Light drilling
**Thursday:** Active recovery / Mobility
**Friday:** AM - Strength (Upper), PM - Technical drilling
**Saturday:** Competition simulation sparring
**Sunday:** Complete rest

## Adapting to Your Sport

### Grapplers
- Prioritize grip endurance and pulling strength
- Hip power for takedowns and sweeps
- Core anti-rotation for scrambles

### Strikers
- Prioritize rotational power and shoulder endurance
- Explosive hip extension for kicks
- Footwork (calf strength and agility)

### MMA
- Balance of everything
- Extra emphasis on conditioning
- Neck training is mandatory

## The 10% Rule for Combat Athletes

Never increase total training load (lifting + sport) by more than 10% per week. Combat sports are already demanding. Spikes in load = injury risk.

## Key Takeaways

1. Lifting supports your sport, not the other way around
2. Reduce volume as competition approaches
3. Maintain intensity until final week
4. Recovery is when adaptation happens
5. Track everything — including sport training load
`
  },
  // ── NEW ARTICLES: First Principles & Unregretted User Minutes ──────────────
  {
    id: 'article-mental-toughness',
    title: 'Mental Toughness: The Skill Nobody Trains',
    tldr: 'Process focus, discomfort tolerance, and identity alignment — three trainable skills that separate elite from average.',
    category: 'motivation',
    tags: ['mindset', 'psychology', 'performance', 'combat'],
    readTime: 7,
    publishedAt: new Date('2025-03-01'),
    source: 'Based on sport psychology research and elite athlete protocols',
    content: `
## Why Mindset Is a Trainable Skill

Most fighters and lifters treat mental toughness like a personality trait — you either have it or you don't. That's wrong. Mental resilience is a skill, and like any skill, it develops through deliberate practice.

## The Three Pillars of Mental Toughness

### 1. Process Over Outcome
Elite performers don't think "I need to win." They think "I need to execute the next rep / the next technique." This isn't positive thinking — it's attentional control.

**How to train it:**
- Before each set, name ONE cue (e.g., "drive through heels")
- After each set, rate execution quality, not just weight moved
- In sparring, focus on implementing one technique, not "winning rounds"

### 2. Discomfort Tolerance
The ability to stay composed when things hurt. The last 3 reps of a hard set. Round 3 of sparring when you're gassed. This is where adaptation happens — and where most people quit.

**How to train it:**
- Deliberately choose the harder option when both work (barbell over machine, free sparring over drills)
- Practice "one more" — when you want to stop, do one more rep, one more round
- Cold exposure, breath holds, and tempo training all build this capacity

### 3. Identity Alignment
You don't rise to the level of your goals. You fall to the level of your identity. If you see yourself as "someone who trains," showing up stops being a decision.

**How to train it:**
- Never miss twice in a row — one skip is life, two is a new habit
- Track consistency, not just performance. The streak matters
- Surround yourself with people who train. Environment > willpower

## The Plateau Protocol

Every athlete hits plateaus. Here's the evidence-based sequence:
1. **First 2 weeks:** Stay the course. Most plateaus are noise
2. **Week 3-4:** Change ONE variable (exercise selection, rep range, or training order)
3. **Week 5-6:** Take a full deload, then return with a new mesocycle
4. **If still stuck:** Honest assessment — are you sleeping enough? Eating enough? Is life stress too high?

## The Pre-Competition Mindset

Research from sport psychology shows that anxiety and excitement have nearly identical physiological signatures. The difference is the label you put on it.

- Reframe "I'm nervous" → "I'm ready"
- Visualize successful execution (not winning — executing)
- Have a physical pre-competition routine that signals "game time"

## Daily Practice

Mental toughness isn't built in big moments. It's built in small daily decisions:
- Training when you don't feel like it (but not when injured)
- Logging your workouts honestly (no ego numbers)
- Going to bed on time instead of scrolling
- Eating according to your plan, not your cravings
`
  },
  {
    id: 'article-sleep-performance',
    title: 'Sleep: The Performance Multiplier You\'re Ignoring',
    tldr: '75% of growth hormone is released during deep sleep. 5 hours instead of 8 drops testosterone 10-15%. The 10-3-2-1-0 rule.',
    category: 'recovery',
    tags: ['sleep', 'recovery', 'hormones', 'performance'],
    readTime: 6,
    publishedAt: new Date('2025-03-10'),
    source: 'Walker (2017), Mah et al. (2011), Dattilo et al. (2020)',
    content: `
## Why Sleep Is Non-Negotiable

Sleep isn't rest. It's when your body actually builds muscle, consolidates motor skills, and regulates the hormones that drive performance. Cutting sleep is cutting gains — literally.

## What Happens During Sleep

### Growth Hormone Release
~75% of daily GH is released during deep sleep (stages 3-4). GH drives muscle repair, fat metabolism, and connective tissue recovery. Less sleep = less GH = slower recovery.

### Testosterone Production
Men who sleep 5 hours instead of 8 show a 10-15% drop in testosterone. That's equivalent to aging 10-15 years. For women, similar disruptions affect estrogen and recovery hormones.

### Motor Skill Consolidation
Learned movement patterns (technique, form) are consolidated during REM sleep. A study on basketball players found that extending sleep to 10 hours improved free-throw accuracy by 9% and sprint times by 5%.

### Inflammation Regulation
Sleep deprivation increases inflammatory markers (IL-6, TNF-alpha) that delay muscle recovery and increase injury risk. One night of poor sleep can increase inflammation for 48+ hours.

## The Combat Athlete's Sleep Problem

Fighters and combat athletes face unique sleep challenges:
- **Evening training** elevates cortisol and core temperature, delaying sleep onset
- **Weight cuts** disrupt sleep architecture (less deep sleep, more waking)
- **Competition anxiety** causes fragmented sleep before events
- **Impact sports** can cause micro-concussions that affect sleep quality

## Practical Sleep Protocol

### The 10-3-2-1-0 Rule
- **10 hours before bed:** No caffeine
- **3 hours before bed:** No heavy meals or alcohol
- **2 hours before bed:** No hard training
- **1 hour before bed:** No screens
- **0:** Number of times you hit snooze

### Environment
- Room temperature: 65-68°F (18-20°C)
- Complete darkness (blackout curtains or eye mask)
- Consistent wake time — even weekends (±30 min max)

### After Evening Training
- Cold shower (2-3 minutes) to drop core temperature
- Magnesium glycinate (200-400mg) — the one supplement with actual sleep evidence
- 10 minutes of gentle stretching or breathing
- Low lighting immediately after training

## Minimum Effective Sleep

For strength and hypertrophy maintenance: **7 hours minimum**
For optimal recovery and performance: **8-9 hours**
For athletes in hard training blocks: **9+ hours** (naps count)

If you're doing everything right in training and nutrition but not progressing, sleep is almost always the bottleneck.
`
  },
  {
    id: 'article-stress-management',
    title: 'Managing Life Stress as a Training Variable',
    tldr: 'Your body has one stress budget — work, sleep, relationships, and training all draw from the same pool.',
    category: 'recovery',
    tags: ['stress', 'recovery', 'cortisol', 'adaptation', 'allostatic load'],
    readTime: 5,
    publishedAt: new Date('2025-03-15'),
    source: 'Selye stress model; Halson (2014) overtraining research',
    content: `
## Your Body Has One Stress Budget

Your nervous system doesn't distinguish between a hard squat session, a work deadline, a fight with your partner, or poor sleep. It all draws from the same recovery pool.

This is called **allostatic load** — the total stress your body is managing at any given time.

## Why This Matters for Training

When allostatic load is high:
- Strength output drops 5-15% (CNS fatigue)
- Recovery takes 50-100% longer
- Injury risk spikes (ACWR becomes unreliable)
- Sleep quality deteriorates (even with the same hours)
- Motivation tanks (not laziness — cortisol)

## The Practical Framework

### Low Life Stress = Push Training Hard
- High volume, high intensity
- New exercises and challenging progressions
- Extra training sessions are productive
- This is when PRs happen

### Moderate Life Stress = Train Smart
- Maintain volume but back off intensity slightly
- Stick to familiar exercises
- Autoregulate based on RPE (don't chase programmed numbers)
- Prioritize sleep over extra sessions

### High Life Stress = Protect the Habit
- Reduce volume by 30-50%
- Keep intensity moderate (RPE 6-7 max)
- Shorten sessions (30-40 min is enough)
- The goal is maintenance and stress relief, not progression
- SHOWING UP matters more than what you do

## Signs Your Stress Budget Is Overspent

- HRV drops below personal baseline for 3+ days
- Resting heart rate elevated 5+ bpm above normal
- Strength regression on lifts you've been progressing
- Persistent DOMS that doesn't resolve in 48 hours
- Poor sleep despite good sleep hygiene
- Loss of training motivation that lasts >1 week

## The Counterintuitive Truth

During high-stress periods, the athletes who reduce training volume actually come out stronger than those who grind through. Why? Because they avoid digging a recovery hole that takes weeks to climb out of.

Training is a stimulus. Recovery is when you adapt. If recovery is compromised, more stimulus just makes things worse.
`
  },
  {
    id: 'article-nutrition-fundamentals',
    title: 'Nutrition First Principles: What Actually Matters',
    tldr: 'Calories are 70% of results, protein is 20%, everything else is 10%. The hierarchy most people get completely inverted.',
    category: 'nutrition',
    tags: ['nutrition', 'macros', 'fundamentals', 'hierarchy'],
    readTime: 6,
    publishedAt: new Date('2025-03-20'),
    source: 'Helms et al. Nutrition Pyramid; Aragon & Schoenfeld, 2020',
    content: `
## The Nutrition Hierarchy (In Order of Impact)

Stop obsessing over meal timing and supplements. Here's what actually moves the needle, ranked by importance:

### 1. Calories (70% of results)
Energy balance determines weight change. Period. No food is "fattening" in isolation — surplus causes fat gain, deficit causes fat loss.

- **To lose fat:** ~500 cal deficit/day = ~0.5kg/week loss
- **To gain muscle:** ~200-300 cal surplus/day
- **To maintain:** Match intake to expenditure

### 2. Protein (20% of results)
The only macro with a real minimum target for athletes:
- **1.6-2.2g per kg bodyweight** for muscle building/preservation
- **2.2-2.7g per kg** during aggressive cuts (to preserve muscle)
- Spread across 3-5 meals, ~30-50g per feeding

### 3. Carbs & Fats (8% of results)
After calories and protein are set, carbs and fats are largely interchangeable for body composition. But for performance:
- **Fighters/grapplers:** Favor carbs (fuel for high-intensity work)
- **Minimum fats:** ~0.5g/kg bodyweight (hormonal health)
- Fill remaining calories as you prefer

### 4. Micronutrients, Timing, Supplements (2% of results)
Important for health, nearly irrelevant for body composition:
- Eat vegetables and fruit daily (fiber + micronutrients)
- Protein timing: within a few hours of training (the "window" is wide)
- Only supplements with real evidence: creatine, caffeine, vitamin D (if deficient)

## Common Mistakes Combat Athletes Make

### 1. Under-eating on training days
High-volume training days require MORE food, not less. Underfueling training is underfueling recovery.

### 2. Protein too low during cuts
The leaner you are and the harder you cut, the MORE protein you need. This is when most people eat less of everything — including protein.

### 3. Ignoring fiber
25-40g/day of fiber fills you up, feeds gut bacteria, and makes cutting dramatically easier. Most athletes get less than 15g.

### 4. Supplement obsession
No supplement replaces sleep, sufficient protein, or a calorie target hit consistently. Creatine works. Most other supplements don't justify their cost.

## The 80/20 Rule

Get 80% of your calories from whole, minimally processed foods. The other 20% can be whatever you want. This approach is sustainable, socially compatible, and equally effective as "clean eating" for body composition.

Adherence beats perfection. The best diet is the one you can follow for months, not days.
`
  },
  {
    id: 'article-overtraining-vs-underrecovery',
    title: 'You\'re Not Overtrained — You\'re Under-Recovered',
    tldr: 'True overtraining is extremely rare. What you have is bad sleep, low protein, or no deloads. Fix those first.',
    category: 'recovery',
    tags: ['overtraining', 'recovery', 'fatigue', 'deload'],
    readTime: 5,
    publishedAt: new Date('2025-04-01'),
    source: 'Kreher & Schwartz (2012); Meeusen et al. (2013)',
    content: `
## True Overtraining Is Extremely Rare

Overtraining Syndrome (OTS) takes months of extreme training with inadequate recovery. It's seen in elite endurance athletes, rarely in recreational lifters or combat athletes.

What most people call "overtraining" is actually one of these:

### 1. Functional Overreaching (Normal)
- Performance temporarily drops after hard training
- Recovers fully with 1-2 weeks of deload
- **This is actually necessary for adaptation**

### 2. Non-Functional Overreaching (Warning)
- Performance drops and doesn't recover with normal rest
- Takes 2-4 weeks to recover
- Signs: persistent fatigue, mood changes, sleep disruption
- **Usually caused by insufficient recovery, not too much training**

### 3. Overtraining Syndrome (Rare)
- Months of recovery needed
- Hormonal disruption, immune suppression, chronic fatigue
- Requires medical intervention
- **Almost never happens to recreational athletes**

## The Real Problem: Under-Recovery

When you feel overtrained, audit these first:

1. **Sleep:** Getting less than 7 hours consistently? Fix this first
2. **Nutrition:** In a caloric deficit? Under-eating protein? This directly limits recovery
3. **Life stress:** Job pressure, relationships, financial worry all compete with training recovery
4. **Training monotony:** Same exercises, same intensity, no variation — CNS fatigue accumulates
5. **No deloads:** Every 4-6 weeks, reduce volume by 40-60% for one week

## The Deload Decision Tree

- **Planned deload every 4-6 weeks:** Reduces accumulated fatigue before it becomes a problem
- **Reactive deload when:** RPE ratings spike on normal weights, HRV drops 3+ days, motivation is consistently low
- **How to deload:** Keep frequency, reduce volume 40-60%, reduce intensity 10-15%. Don't skip the gym — just go lighter

## Recovery Is Training

The adaptation model is simple:
- Training provides the stimulus (stress)
- Recovery provides the adaptation (growth)
- Without adequate recovery, more training makes things worse

If you're stuck in a plateau and tempted to train MORE, try training LESS with better recovery first. You might be surprised.
`
  },
  {
    id: 'article-striking-conditioning',
    title: 'Conditioning for Strikers: Energy Systems Explained',
    tldr: 'Three energy systems, all used within a single round. Build aerobic base first, add lactate tolerance, then peak.',
    category: 'striking',
    tags: ['striking', 'conditioning', 'energy systems', 'boxing', 'muay thai'],
    readTime: 7,
    publishedAt: new Date('2025-04-10'),
    source: 'Guidetti et al. (2002); Del Vecchio et al. (2011)',
    content: `
## Why Strikers Gas Out

A 3-minute boxing round demands all three energy systems simultaneously. Understanding this is the key to never gassing out again.

### The Three Energy Systems

**1. Phosphagen (ATP-CP) — 0-10 seconds**
Powers explosive combinations, slips, and power shots. Like a phone battery that drains fast but recharges fast.
- Trained by: Short sprints, heavy bag power rounds, explosive medicine ball throws
- Recovery: 2-3 minutes between efforts

**2. Glycolytic — 10 seconds to 2 minutes**
Sustains extended exchanges and high-pressure sequences. The "burn" you feel in round 2 is lactate accumulation from this system.
- Trained by: Pad work intervals (30s on/30s off), battle ropes, assault bike intervals
- This is where most fights are won or lost

**3. Aerobic — 2+ minutes**
Your base. Determines how fast you recover between exchanges and between rounds. Fighters with a strong aerobic base appear to have endless cardio.
- Trained by: Long runs, swimming, cycling at Zone 2 (conversational pace), shadowboxing at low intensity

## The Striker's Conditioning Hierarchy

### 1. Build the Aerobic Base (Off-Season)
3-4 sessions/week of Zone 2 cardio, 30-60 minutes. This isn't sexy but it's the foundation everything else builds on.

### 2. Add Lactate Tolerance (Pre-Camp)
2-3 sessions/week of high-intensity intervals:
- 30s max effort / 30s rest x 6-10 rounds
- Heavy bag rounds: 10s burst / 20s pace x 3 minutes
- Shark tank sparring: fresh opponent every 30-60 seconds

### 3. Sport-Specific Peaking (Fight Camp)
Conditioning should mirror fight demands:
- Round-length intervals matching your sport (2 min for Muay Thai, 3 min for boxing)
- Simulate fatigue then decision making (technical drills while tired)
- Taper conditioning volume 7-10 days before competition

## Strength Training for Striking Power

Punching power is primarily:
- **Lower body force production** (ground reaction force)
- **Core rotational stiffness** (force transfer)
- **Upper body rate of force development** (snap)

Key exercises:
- Trap bar deadlift / squat (lower body power)
- Medicine ball rotational throws (core transfer)
- Plyometric push-ups (upper body snap)
- Heavy farmer carries (grip endurance + whole-body stability)
`
  },
  {
    id: 'article-mma-weight-management',
    title: 'Weight Management for MMA: Fight Week to Off-Season',
    tldr: 'Walk around within 8-12% of fight weight. Chronic fat loss then acute water cut. Rehydration protocol post-weigh-in.',
    category: 'mma',
    tags: ['mma', 'weight cut', 'fight week', 'nutrition', 'rehydration'],
    readTime: 8,
    publishedAt: new Date('2025-04-15'),
    source: 'Reale et al. (2017); Artioli et al. (2016)',
    content: `
## The Reality of Weight Cutting in MMA

Weight cutting is part of MMA. But the difference between smart cutting and dangerous cutting can mean the difference between a dominant performance and a hospital visit.

## Off-Season Body Composition

The goal off-season is to be within **8-12% of your competition weight** at fight-camp start. If you're walking around 20%+ over your weight class, you're either in the wrong weight class or not managing off-season nutrition.

### Off-Season Strategy
- Eat at slight surplus (200-300 cal/day) to build muscle
- Protein at 2g/kg bodyweight minimum
- Strength train 3-4x/week
- Gradual lean mass accrual only — no dirty bulks

## Fight Camp (8-12 Weeks Out)

### Phase 1: Chronic Weight Loss (8-4 Weeks Out)
- 500 cal/day deficit maximum
- High protein (2.2-2.7g/kg) to preserve muscle
- Time carbs around training sessions
- Target: lose 0.5-0.7% bodyweight per week

### Phase 2: Acute Weight Cut (Fight Week)
Water manipulation for the final 3-5% of bodyweight:
- **5-7 days out:** Water load (8-10L/day)
- **3 days out:** Reduce water to 4L
- **2 days out:** Reduce to 2L
- **1 day out:** Sip only
- **Weigh-in day:** Minimal to no water until after weigh-in

## Rehydration Protocol (After Weigh-In)

### First 2 Hours
- Oral rehydration solution (ORS) — not just water
- Small, frequent sips (1-1.5L per hour max)
- Electrolytes: sodium, potassium, magnesium
- Light, easily digestible carbs (white rice, bananas, honey)

### 2-12 Hours Before Fight
- Continue hydrating (aim to replace 150% of weight lost)
- Moderate carb-rich meals (glycogen replenishment)
- Avoid high-fat and high-fiber foods (slow digestion)

## Red Flags: When a Cut Is Too Much

Stop the cut and reassess if:
- Heart rate at rest exceeds 100 bpm
- Severe cramping or dizziness
- Dark brown urine that doesn't lighten with fluids
- More than 8% bodyweight being cut via water manipulation

No fight is worth permanent organ damage. Move up a weight class if cuts are consistently brutal.
`
  },
  {
    id: 'article-injury-prevention',
    title: 'Injury Prevention: The Principles That Actually Work',
    tldr: 'Strength training cuts injuries 66%. Stretching alone? Nearly zero. Load management, full ROM, and fixing asymmetries.',
    category: 'general_fitness',
    tags: ['injury', 'prevention', 'prehab', 'mobility', 'longevity'],
    readTime: 6,
    publishedAt: new Date('2025-04-20'),
    source: 'Lauersen et al. (2014) meta-analysis; Gabbett (2016) ACWR',
    content: `
## Most Injuries Are Preventable

A landmark meta-analysis by Lauersen et al. found that strength training reduced sports injuries by 66% and overuse injuries by nearly 50%. Stretching alone? Nearly zero benefit.

## The Four Pillars of Injury Prevention

### 1. Manage Training Load (Most Important)
The acute:chronic workload ratio (ACWR) is your guardrail:
- **Sweet spot:** 0.8-1.3
- **Danger zone:** >1.5 (you spiked volume too fast)
- **Rule of thumb:** Never increase weekly volume by more than 10%

### 2. Strength Through Full Range of Motion
- Train exercises to full ROM (ATG squats, full-stretch RDLs)
- Include eccentric-emphasis work (3-4 second lowering phases)
- Strengthen commonly weak areas: rotator cuff, hip flexors, ankle dorsiflexion

### 3. Address Asymmetries
A >15% strength difference between limbs doubles injury risk:
- Include unilateral work (split squats, single-leg RDLs, single-arm rows)
- Test bilateral differences periodically

### 4. Adequate Recovery
Under-recovered athletes get injured. Period.
- Sleep 7+ hours, nutrition matches training demands
- Deload every 4-6 weeks

## Combat Sport-Specific Prehab

### For Grapplers
- **Neck strengthening:** Isometric holds, plate-loaded neck curls
- **Grip endurance:** Dead hangs, farmer walks
- **Shoulder stability:** Face pulls, external rotation work

### For Strikers
- **Wrist/hand conditioning:** Knuckle push-ups, wrist curls
- **Rotator cuff:** Band pull-aparts, Cuban presses
- **Ankle mobility:** Banded ankle mobilizations

## When Injury Happens
1. **First 48 hours:** PEACE (Protect, Elevate, Avoid anti-inflammatories, Compress, Educate)
2. **After 48 hours:** LOVE (Load, Optimism, Vascularization, Exercise)
3. **Key principle:** Early, pain-free movement beats complete rest
4. **Train around it:** Injured shoulder? Train legs, core, other arm
`
  },
  {
    id: 'article-motivation-consistency',
    title: 'Consistency > Motivation: Building Unbreakable Training Habits',
    tldr: 'Motivation is an emotion — it comes and goes. Systems, environment design, and the "never miss twice" rule.',
    category: 'motivation',
    tags: ['motivation', 'habits', 'consistency', 'psychology', 'discipline'],
    readTime: 5,
    publishedAt: new Date('2025-05-01'),
    source: 'Clear (2018) Atomic Habits; Duckworth (2016) Grit research',
    content: `
## Motivation Is Unreliable. Systems Aren't.

Motivation is an emotion. It comes and goes like weather. The athletes who succeed long-term aren't more motivated — they have better systems.

## The Hierarchy of Behavior Change

### 1. Environment Design (Strongest)
Make training the path of least resistance:
- Pack your gym bag the night before
- Train at the same time daily (becomes automatic in ~6 weeks)
- Remove friction: gym clothes out, pre-workout ready, route planned
- Train at a gym near work/home (every extra 10 min commute = 20% more skipped sessions)

### 2. Identity-Based Habits
Stop saying "I'm trying to get fit." Start saying "I'm an athlete who trains." When faced with "should I train today?" — athletes train. Decision made.

### 3. The Two-Minute Rule
On low-motivation days, commit to just showing up for 2 minutes. Put on gym clothes. Walk through the door.

~90% of the time, once you start, you finish. And the times you don't? You still maintained the habit chain.

### 4. Never Miss Twice
One missed session is life. Two missed sessions is the start of a new pattern. This single rule prevents the "I already missed Monday so I'll start again next week" spiral.

## The Motivation Traps

### Trap 1: Waiting for inspiration
"I'll train when I feel like it." You'll eventually train 0-1 days a week.

### Trap 2: All-or-nothing thinking
A 20-minute session beats zero. A maintenance workout beats no workout. Imperfect action > perfect inaction.

### Trap 3: Comparing yourself to others
Your only valid comparison is you vs. you from last month.

### Trap 4: Novelty addiction
Program hopping every 3 weeks kills progress. Run a program for its full duration before judging it.

## When Motivation Tanks

If you've lost motivation for 2+ weeks:
1. **Overreached:** Take a deload week
2. **Goals are stale:** Set a new short-term target
3. **Training is monotonous:** Change secondary exercises, not the program structure
4. **Life stress is high:** Scale back volume, protect the habit
5. **Burnout:** Take a full week off. Muscle memory will bring you back fast
`
  },
  {
    id: 'article-grappling-conditioning',
    title: 'Grappling Conditioning: Build a Gas Tank That Never Quits',
    tldr: 'Aerobic system provides 55-65% of energy in a BJJ match. Build the base, add grip endurance, then sport-specific intervals.',
    category: 'grappling',
    tags: ['grappling', 'conditioning', 'bjj', 'wrestling', 'cardio'],
    readTime: 7,
    publishedAt: new Date('2025-05-10'),
    source: 'Andreato et al. (2017); James et al. (2016)',
    content: `
## Why Grapplers Gas Out

Grappling demands sustained isometric contractions (grip, pins, frames) while simultaneously requiring explosive bursts (takedowns, sweeps, submissions). This combination destroys athletes without proper conditioning.

## The Grappling Energy Demands

Research shows a competitive BJJ match uses:
- **Aerobic system:** 55-65% of energy
- **Glycolytic system:** 25-35% (sustained scrambles)
- **Phosphagen system:** 10-15% (explosive takedowns, submissions)

Your aerobic base is MORE important than you think.

## The Grappling Conditioning Pyramid

### Base: Aerobic Capacity (Build Year-Round)
**3-4x per week, 30-60 minutes:**
- Zone 2 cardio (can hold a conversation)
- Best modalities: cycling, swimming, rowing (low joint impact)
- Target: maintain conversation while working

### Middle: Muscular Endurance
**2-3x per week, 15-25 minutes:**
- Grip endurance: dead hangs (work up to 2 min), gi pull-ups, towel hangs
- Core endurance: planks, hollow holds, Pallof presses (all for time)
- Higher rep ranges in the gym (12-20 reps for accessory work)

### Top: Sport-Specific Intervals
**1-2x per week (not on sparring days):**
- Match simulation: 30s max effort / 30s rest x 10 rounds
- Positional sparring with fresh partners rotating every 60s
- Assault bike or rower intervals: 20s sprint / 40s recovery x 8-12

## The Secret: Efficiency > Engine

Elite grapplers don't just have better cardio. They're more efficient:
- They use structure (frames, wedges) instead of muscle to hold positions
- They breathe continuously instead of holding breath during exchanges
- They relax in dominant positions and save energy for transitions

## Weekly Template (Competition Prep)

- **Monday:** Mat training (technical) + Zone 2 cardio (30 min)
- **Tuesday:** Strength training (lower focus) + grip work
- **Wednesday:** Mat training (hard sparring)
- **Thursday:** Zone 2 cardio (45 min) + core endurance
- **Friday:** Strength training (upper focus) + sport-specific intervals
- **Saturday:** Mat training (competition rounds)
- **Sunday:** Full rest or light Zone 2 (20 min walk/swim)
`
  },
  {
    id: 'article-mobility-combat',
    title: 'Mobility for Combat Athletes: Move Better, Fight Better',
    tldr: 'Flexibility without strength is a liability. Hip, T-spine, shoulder, and ankle priorities — 5 minutes daily, zero excuses.',
    category: 'general_fitness',
    tags: ['mobility', 'flexibility', 'movement', 'combat', 'longevity'],
    readTime: 5,
    publishedAt: new Date('2025-05-15'),
    source: 'Behm et al. (2021) stretching review; Afonso et al. (2021)',
    content: `
## Mobility vs. Flexibility

**Flexibility** = passive range of motion (someone pushes your leg up)
**Mobility** = active range of motion under load (you can USE that range)

For combat athletes, flexibility without strength is a liability. You need mobility.

## The Combat Athlete's Mobility Priorities

### 1. Hip Mobility (Highest Priority)
Every combat sport demands hip mobility: guard play, high kicks, level changes, sprawls.

**Key movements:**
- 90/90 switches (2 min daily)
- Deep squat holds (accumulate 5 min/day)
- Cossack squats (loaded, 8-10 per side)
- Hip CARs (controlled articular rotations)

### 2. Thoracic Spine
Rotation power comes from the T-spine. Limited T-spine = compensating with lumbar spine = back pain.

**Key movements:** Open books, cat-cow with rotation, foam roller T-spine extensions

### 3. Shoulders
Grapplers need overhead and behind-the-back range. Strikers need full extension.

**Key movements:** Wall slides, band dislocates, prone Y-T-W raises, hanging

### 4. Ankles
Poor ankle dorsiflexion limits squat depth, sprawl ability, and single-leg stability.

**Key movements:** Wall ankle mobilizations (banded), heel-elevated squat holds

## When to Mobilize

### Before Training (5-10 min)
- CARs for joints you'll load. Dynamic movements. NO long static stretching

### After Training (5-10 min)
- Static stretching is fine here. Focus on restricted areas

### Dedicated Sessions (15-20 min, 2-3x/week)
- Where real gains happen. Loaded stretching at end-range, 60-120 second holds

## The Minimum Effective Dose

If you do nothing else:
1. **Deep squat hold:** 2 minutes daily (hips + ankles)
2. **Dead hang:** 1 minute daily (shoulders + thoracic spine)
3. **90/90 hip switches:** 1 minute per side daily (hip rotation)

That's 5 minutes. Zero excuses.
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

// ── Contextual Insights ─────────────────────────────────────────────────────
// Bite-size teaching moments surfaced in the HomeTab feed.
// Each one should take ≤15 seconds to read and leave you smarter.

export const insights: Insight[] = [
  // ─── MUSCLE SCIENCE ───────────────────────────────────────────────────────
  {
    id: 'ins-mps-window',
    headline: 'The anabolic window is wider than you think',
    body: 'Muscle protein synthesis stays elevated for 24-48 hours post-training. The "30-minute window" is a myth — total daily protein matters far more than timing.',
    category: 'muscle_science',
    context: ['post_workout', 'lift_day'],
    tags: ['protein', 'recovery', 'myth-busting'],
    source: 'Schoenfeld & Aragon, 2018 meta-analysis'
  },
  {
    id: 'ins-stretch-hypertrophy',
    headline: 'Stretched positions build more muscle',
    body: 'Training at long muscle lengths (deep stretch under load) produces ~2x more hypertrophy than shortened positions. Go deep on RDLs, incline curls, and overhead tricep work.',
    category: 'muscle_science',
    context: ['lift_day', 'any'],
    tags: ['hypertrophy', 'technique', 'research'],
    source: 'Maeo et al., 2022; Pedrosa et al., 2023'
  },
  {
    id: 'ins-fiber-types',
    headline: 'Your muscles are a spectrum',
    body: 'Type I fibers (slow-twitch) resist fatigue. Type II (fast-twitch) produce power but fatigue fast. Combat athletes need both — heavy compounds train Type II, higher reps train Type I.',
    category: 'muscle_science',
    context: ['lift_day', 'combat_day'],
    tags: ['muscle fibers', 'physiology']
  },
  {
    id: 'ins-neural-gains',
    headline: 'First 6 weeks of strength are in your brain',
    body: 'Early strength gains come from neural adaptations — your nervous system learning to recruit more motor units simultaneously. True muscle growth kicks in around week 6-8.',
    category: 'muscle_science',
    context: ['new_block', 'lift_day'],
    tags: ['neural', 'beginner', 'adaptation']
  },
  {
    id: 'ins-satellite-cells',
    headline: 'Muscle memory is real biology',
    body: 'Training creates permanent satellite cell nuclei in muscle fibers. Even after years of detraining, these nuclei remain — making regaining lost muscle 2-3x faster than building it new.',
    category: 'muscle_science',
    context: ['any'],
    tags: ['muscle memory', 'detraining', 'comeback']
  },
  {
    id: 'ins-eccentric-tendons',
    headline: 'Slow eccentrics strengthen tendons',
    body: 'Controlled lowering phases (3-4 seconds) build stronger, thicker tendons. This is especially important for grapplers and strikers who rely on connective tissue resilience.',
    category: 'muscle_science',
    context: ['lift_day', 'injured'],
    tags: ['eccentric', 'tendon', 'injury prevention']
  },

  // ─── NUTRITION SCIENCE ────────────────────────────────────────────────────
  {
    id: 'ins-protein-per-meal',
    headline: '~40g protein per meal is the sweet spot',
    body: 'Recent research shows per-meal MPS maxes out around 40g for most people (not 20-30g as previously thought). But total daily intake still matters most — aim for 1.6-2.2g/kg.',
    category: 'nutrition',
    context: ['any'],
    tags: ['protein', 'meal planning', 'macros'],
    source: 'Trommelen et al., 2023'
  },
  {
    id: 'ins-creatine',
    headline: 'Creatine: the most studied supplement in history',
    body: '3-5g daily of creatine monohydrate improves strength, power, and even cognitive function. No loading phase needed. No cycling needed. Works for everyone.',
    category: 'nutrition',
    context: ['any'],
    tags: ['supplements', 'creatine', 'evidence-based'],
    source: 'ISSN Position Stand, 2017'
  },
  {
    id: 'ins-caffeine-timing',
    headline: 'Caffeine peaks at 45-60 minutes',
    body: 'For maximum training benefit, consume caffeine 45-60 minutes before your session. Effective dose: 3-6mg/kg bodyweight. Avoid within 8-10 hours of sleep.',
    category: 'nutrition',
    context: ['lift_day', 'morning', 'combat_day'],
    tags: ['caffeine', 'performance', 'timing']
  },
  {
    id: 'ins-cut-protein-higher',
    headline: 'Cutting? Raise your protein even higher',
    body: 'During a caloric deficit, protein needs increase to preserve muscle. Aim for 2.3-3.1g/kg of lean body mass — significantly higher than during maintenance or bulking.',
    category: 'nutrition',
    context: ['cutting'],
    tags: ['cutting', 'protein', 'muscle preservation'],
    source: 'Helms et al., 2014'
  },
  {
    id: 'ins-hydration-performance',
    headline: '2% dehydration = 10-20% performance drop',
    body: 'Even mild dehydration impairs strength, power, and cognitive function. For combat athletes, this is critical — reaction time and decision-making suffer first.',
    category: 'nutrition',
    context: ['any', 'combat_day'],
    tags: ['hydration', 'performance', 'combat']
  },
  {
    id: 'ins-fiber-satiety',
    headline: 'Fiber is the secret weapon of every successful cut',
    body: 'High-fiber foods (vegetables, legumes, whole grains) increase satiety with fewer calories. Aim for 25-40g/day. It also feeds gut bacteria that regulate metabolism.',
    category: 'dieting',
    context: ['cutting'],
    tags: ['fiber', 'satiety', 'dieting']
  },
  {
    id: 'ins-sodium-combat',
    headline: 'Sodium isn\'t the enemy athletes think',
    body: 'Active people lose 500-1000mg sodium per hour of training via sweat. Restricting sodium impairs muscle contractions and blood volume. Season your food — your body needs it.',
    category: 'nutrition',
    context: ['any', 'combat_day'],
    tags: ['sodium', 'electrolytes', 'hydration']
  },

  // ─── RECOVERY SCIENCE ─────────────────────────────────────────────────────
  {
    id: 'ins-sleep-testosterone',
    headline: 'Sleep is your #1 performance enhancer',
    body: 'Sleeping <6 hours reduces testosterone by up to 15% and impairs muscle protein synthesis. 7-9 hours is non-negotiable. No supplement replaces adequate sleep.',
    category: 'recovery',
    context: ['rest_day', 'evening', 'low_readiness'],
    tags: ['sleep', 'testosterone', 'hormones'],
    source: 'Leproult & Van Cauter, 2011'
  },
  {
    id: 'ins-deload-adaptation',
    headline: 'Deloads are when you actually grow',
    body: 'Training creates the stimulus. Deloading allows supercompensation — your body rebuilds stronger than before. Skipping deloads leads to accumulated fatigue, not more gains.',
    category: 'recovery',
    context: ['deload_week', 'rest_day'],
    tags: ['deload', 'supercompensation', 'programming']
  },
  {
    id: 'ins-active-recovery',
    headline: 'Move on rest days — just not hard',
    body: 'Light activity (walking, easy cycling, mobility work) on rest days increases blood flow to recovering muscles without adding training stress. 20-30 minutes of Zone 1 cardio is ideal.',
    category: 'recovery',
    context: ['rest_day'],
    tags: ['active recovery', 'blood flow', 'rest day']
  },
  {
    id: 'ins-cold-exposure',
    headline: 'Cold plunges: great for recovery, bad for hypertrophy',
    body: 'Cold water immersion reduces inflammation — helpful for combat athletes between sessions. But post-lifting, it blunts the inflammatory signaling needed for muscle growth. Time it strategically.',
    category: 'recovery',
    context: ['post_workout', 'combat_day'],
    tags: ['cold plunge', 'inflammation', 'timing'],
    source: 'Roberts et al., 2015'
  },
  {
    id: 'ins-stress-recovery',
    headline: 'Life stress is training stress',
    body: 'Your body doesn\'t distinguish between gym stress and work/relationship stress. High life stress = reduced recovery capacity. Autoregulate — train lighter when life is heavy.',
    category: 'recovery',
    context: ['low_readiness', 'any'],
    tags: ['stress', 'autoregulation', 'allostatic load']
  },
  {
    id: 'ins-hrv-morning',
    headline: 'HRV: your body\'s readiness signal',
    body: 'Heart Rate Variability measures autonomic nervous system balance. Higher HRV = better recovered. Track it first thing in the morning, lying down, for consistent readings.',
    category: 'recovery',
    context: ['morning', 'any'],
    tags: ['HRV', 'wearable', 'readiness']
  },

  // ─── PERIODIZATION & PROGRAMMING ─────────────────────────────────────────
  {
    id: 'ins-volume-landmarks',
    headline: 'Know your volume landmarks',
    body: 'MV (Maintenance Volume): ~6 sets/week to maintain. MEV: ~8-10 to grow minimally. MAV: 12-20 for optimal growth. MRV: beyond this, you can\'t recover. Train between MEV and MAV.',
    category: 'periodization',
    context: ['lift_day', 'new_block'],
    tags: ['volume', 'sets', 'programming'],
    source: 'Dr. Mike Israetel, RP Strength'
  },
  {
    id: 'ins-rpe-autoregulation',
    headline: 'RPE is autoregulation, not guessing',
    body: 'RPE 7 = could do 3 more reps. RPE 8 = could do 2 more. RPE 9 = could do 1 more. RPE 10 = absolute failure. Most hypertrophy work should live at RPE 7-9.',
    category: 'periodization',
    context: ['lift_day'],
    tags: ['RPE', 'autoregulation', 'intensity']
  },
  {
    id: 'ins-frequency-matters',
    headline: 'Frequency > volume per session',
    body: 'Splitting 20 weekly sets across 3 sessions beats cramming them into 1. MPS peaks at ~5-10 sets per muscle per session. After that, junk volume creeps in.',
    category: 'periodization',
    context: ['lift_day', 'any'],
    tags: ['frequency', 'volume', 'split'],
    source: 'Schoenfeld et al., 2016'
  },
  {
    id: 'ins-progressive-overload',
    headline: 'Progressive overload has 4 levers',
    body: 'More weight isn\'t the only way to progress. You can also add reps, add sets, reduce rest time, or improve technique (range of motion, tempo). Use all of them.',
    category: 'periodization',
    context: ['lift_day'],
    tags: ['progressive overload', 'progression', 'strategy']
  },
  {
    id: 'ins-undulating',
    headline: 'Why undulating beats linear for fighters',
    body: 'Daily undulating periodization (varying rep ranges each session) develops both strength and hypertrophy simultaneously. Perfect for combat athletes who can\'t dedicate whole blocks to one quality.',
    category: 'periodization',
    context: ['combat_day', 'lift_day'],
    tags: ['DUP', 'undulating', 'combat athletes']
  },

  // ─── COMBAT SPORTS ────────────────────────────────────────────────────────
  {
    id: 'ins-grappling-strength',
    headline: 'Grappling demands isometric strength',
    body: 'Controlling an opponent requires sustained muscle contractions — isometric holds. Add paused reps, iso-holds, and farmer carries to build the "squeeze strength" grapplers need.',
    category: 'grappling',
    context: ['combat_day', 'lift_day'],
    tags: ['isometric', 'grappling', 'grip']
  },
  {
    id: 'ins-weight-cut-science',
    headline: 'Water cuts work through osmosis',
    body: 'Acute weight cuts manipulate sodium/water balance. Water loading → water restriction forces continued excretion via osmotic momentum. Never water cut more than 5-8% bodyweight.',
    category: 'grappling',
    context: ['fight_camp'],
    tags: ['weight cut', 'competition', 'water'],
  },
  {
    id: 'ins-striking-power',
    headline: 'Punching power starts at the floor',
    body: 'Force production for strikes follows the kinetic chain: feet → hips → core → shoulder → fist. Hip rotation generates ~50% of punch force. Train rotational power with med ball throws.',
    category: 'striking',
    context: ['combat_day', 'lift_day'],
    tags: ['striking', 'power', 'kinetic chain']
  },
  {
    id: 'ins-combat-conditioning',
    headline: 'Rounds demand both energy systems',
    body: 'A 5-minute MMA round uses aerobic capacity for sustained output and anaerobic power for explosive bursts. Train both: Zone 2 cardio (base) + interval sprints (top end).',
    category: 'mma',
    context: ['combat_day'],
    tags: ['conditioning', 'energy systems', 'MMA']
  },
  {
    id: 'ins-grip-endurance',
    headline: 'Grip fails before everything else in grappling',
    body: 'Forearm endurance is often the first limiter in rolling. Dead hangs, gi pull-ups, and thick-grip training build the sustained squeeze strength that wins late-round scrambles.',
    category: 'grappling',
    context: ['combat_day', 'lift_day'],
    tags: ['grip', 'endurance', 'forearms']
  },
  {
    id: 'ins-fight-camp-taper',
    headline: 'Peak performance needs a taper',
    body: 'Reduce training volume by 40-60% in the final 7-10 days before competition while maintaining intensity. This dissipates fatigue while preserving fitness. You should feel restless — that\'s correct.',
    category: 'mma',
    context: ['fight_camp'],
    tags: ['taper', 'peaking', 'competition']
  },

  // ─── LIFTING TECHNIQUE ────────────────────────────────────────────────────
  {
    id: 'ins-breathing-brace',
    headline: 'Breathe and brace like a belt',
    body: 'Valsalva maneuver: inhale into your belly (not chest), brace your core 360° like you\'re about to be punched, hold through the rep. This creates intra-abdominal pressure that protects your spine.',
    category: 'lifting_technique',
    context: ['lift_day'],
    tags: ['bracing', 'technique', 'safety']
  },
  {
    id: 'ins-tempo-control',
    headline: 'Tempo is a free variable most ignore',
    body: 'A 3-1-1-0 tempo (3s eccentric, 1s pause, 1s concentric, 0s top) more than doubles time under tension vs. bouncing reps. Especially effective on isolation work for stubborn muscle groups.',
    category: 'lifting_technique',
    context: ['lift_day'],
    tags: ['tempo', 'time under tension', 'hypertrophy']
  },
  {
    id: 'ins-mind-muscle',
    headline: 'Mind-muscle connection is measurable',
    body: 'EMG studies show that focusing on the target muscle during isolation exercises increases its activation by 20-30%. Doesn\'t help on heavy compounds — save it for curls and laterals.',
    category: 'lifting_technique',
    context: ['lift_day'],
    tags: ['mind-muscle', 'isolation', 'activation'],
    source: 'Calatayud et al., 2016'
  },
  {
    id: 'ins-warmup-ramp',
    headline: 'Ramp sets > static stretching before lifting',
    body: 'Warm up with progressively heavier sets of the exercise itself. Static stretching before heavy lifting can reduce force output by 5-8%. Save stretching for after.',
    category: 'lifting_technique',
    context: ['lift_day', 'morning'],
    tags: ['warmup', 'stretching', 'preparation']
  },

  // ─── TRAINING MINDSET ─────────────────────────────────────────────────────
  {
    id: 'ins-consistency-beats-intensity',
    headline: '80% effort × 100% consistency wins',
    body: 'A moderate workout you actually do beats a perfect workout you skip. The biggest predictor of results isn\'t program design — it\'s showing up. Protect the habit above all.',
    category: 'motivation',
    context: ['any', 'low_readiness'],
    tags: ['consistency', 'adherence', 'mindset']
  },
  {
    id: 'ins-compare-yourself',
    headline: 'You vs. you last month',
    body: 'Comparing to others ignores genetics, training age, recovery resources, and life context. Track YOUR progressive overload, YOUR body composition, YOUR movement quality over time.',
    category: 'motivation',
    context: ['any'],
    tags: ['mindset', 'comparison', 'self-improvement']
  },
  {
    id: 'ins-discomfort-growth',
    headline: 'Discomfort is the signal, not the enemy',
    body: 'RPE 8-9 feels uncomfortable. The last 2-3 reps of an effective set should be hard. Learning to push through productive discomfort (not pain) is what separates intermediate from advanced.',
    category: 'motivation',
    context: ['lift_day'],
    tags: ['effort', 'RPE', 'growth mindset']
  },
  {
    id: 'ins-bad-workout',
    headline: 'Bad workouts still count',
    body: 'A session where every set felt heavy and slow still provided a training stimulus. You maintained the habit, preserved muscle, and practiced the skill. Some days are just hard — that\'s normal.',
    category: 'motivation',
    context: ['post_workout', 'low_readiness'],
    tags: ['bad day', 'consistency', 'resilience']
  },
  {
    id: 'ins-fight-nerves',
    headline: 'Pre-fight anxiety is performance fuel',
    body: 'The adrenaline from nervousness is chemically identical to excitement. Reframe "I\'m nervous" as "I\'m ready." Studies show this appraisal shift improves performance under pressure.',
    category: 'motivation',
    context: ['fight_camp', 'combat_day'],
    tags: ['anxiety', 'reframing', 'performance psychology'],
    source: 'Brooks, 2014'
  },

  // ─── GENERAL FITNESS & LONGEVITY ──────────────────────────────────────────
  {
    id: 'ins-zone2-base',
    headline: 'Zone 2 cardio is the foundation of everything',
    body: 'Low-intensity cardio (conversational pace) builds mitochondrial density, capillary networks, and fat oxidation capacity. 2-3 hours/week. It\'s boring — that\'s why it works as a filter.',
    category: 'general_fitness',
    context: ['rest_day', 'any'],
    tags: ['zone 2', 'cardio', 'aerobic base'],
    source: 'Dr. Iñigo San Millán'
  },
  {
    id: 'ins-walking-underrated',
    headline: '10k steps: the most underrated "supplement"',
    body: 'Daily walking improves insulin sensitivity, enhances recovery, burns 300-500 calories, and reduces cortisol. It\'s low stress, requires no recovery, and stacks with any program.',
    category: 'general_fitness',
    context: ['rest_day', 'any'],
    tags: ['walking', 'NEAT', 'recovery']
  },
  {
    id: 'ins-mobility-aging',
    headline: 'Mobility is the first thing you lose',
    body: 'Range of motion decreases ~1% per year after 30 if not maintained. 10-15 minutes of daily mobility work (not just stretching — loaded movement through full ROM) preserves it indefinitely.',
    category: 'general_fitness',
    context: ['rest_day', 'morning'],
    tags: ['mobility', 'aging', 'longevity']
  },
  {
    id: 'ins-vo2max-longevity',
    headline: 'VO2max predicts lifespan better than smoking status',
    body: 'Elite-level cardiorespiratory fitness (top 2.3%) reduces all-cause mortality by 80% vs. the bottom 25%. Resistance training + cardio = the most powerful longevity intervention known.',
    category: 'general_fitness',
    context: ['any'],
    tags: ['VO2max', 'longevity', 'mortality'],
    source: 'Mandsager et al., 2018'
  },

  // ─── DIETING & BODY COMPOSITION ───────────────────────────────────────────
  {
    id: 'ins-deficit-rate',
    headline: 'Cut too fast and you lose muscle',
    body: 'Aim for 0.5-1% bodyweight loss per week during a cut. Faster than that increases lean mass loss, especially for lean individuals. Patience preserves your hard-earned muscle.',
    category: 'dieting',
    context: ['cutting'],
    tags: ['cutting', 'rate of loss', 'muscle preservation'],
    source: 'Helms et al., 2014'
  },
  {
    id: 'ins-diet-breaks',
    headline: 'Diet breaks make cuts more effective',
    body: 'Taking 1-2 weeks at maintenance calories every 4-8 weeks of cutting reverses metabolic adaptation, restores hormones, and improves long-term adherence. The tortoise wins.',
    category: 'dieting',
    context: ['cutting'],
    tags: ['diet break', 'metabolic adaptation', 'adherence'],
    source: 'Byrne et al., 2018 (MATADOR study)'
  },
  {
    id: 'ins-bulk-surplus',
    headline: 'Lean bulking: 200-300 cal surplus is enough',
    body: 'Muscle growth is slow — ~0.5-1kg per month for intermediates. Eating 500+ over maintenance just adds unnecessary fat. A small surplus maximizes the muscle:fat gain ratio.',
    category: 'dieting',
    context: ['bulking'],
    tags: ['bulking', 'surplus', 'lean gains']
  },
  {
    id: 'ins-refeed-leptin',
    headline: 'Refeeds restore the hunger hormone',
    body: 'Leptin (satiety hormone) drops during caloric restriction, increasing hunger. A 1-2 day carb-focused refeed at maintenance partially restores leptin, reduces hunger, and provides a psychological break.',
    category: 'dieting',
    context: ['cutting'],
    tags: ['refeed', 'leptin', 'hormones']
  },

  // ─── INJURY PREVENTION ────────────────────────────────────────────────────
  {
    id: 'ins-injury-patterns',
    headline: 'Most gym injuries are overuse, not accidents',
    body: 'Tendinopathy, impingement, and strain happen from too much volume too fast. The acute:chronic workload ratio is your guide — don\'t spike volume more than 10% week over week.',
    category: 'general_fitness',
    context: ['injured', 'lift_day'],
    tags: ['injury', 'ACWR', 'volume management']
  },
  {
    id: 'ins-train-around-injury',
    headline: 'Injured ≠ immobile',
    body: 'An injured shoulder doesn\'t mean skip the gym. Train legs, core, and the other arm. Maintaining activity preserves muscle, boosts mood, and often speeds recovery of the injured area.',
    category: 'general_fitness',
    context: ['injured'],
    tags: ['injury', 'modification', 'training around']
  },

  // ─── NEW INSIGHTS: First Principles ─────────────────────────────────────────
  {
    id: 'ins-allostatic-load',
    headline: 'Your body has one stress budget',
    body: 'Work deadlines, poor sleep, and hard training all draw from the same recovery pool. When life stress is high, reduce training volume — you\'ll actually progress faster than grinding through.',
    category: 'recovery',
    context: ['any', 'lift_day'],
    tags: ['stress', 'recovery', 'allostatic load'],
    source: 'Selye general adaptation syndrome model'
  },
  {
    id: 'ins-sleep-gh',
    headline: '75% of growth hormone is released during deep sleep',
    body: 'Cutting sleep from 8 to 6 hours doesn\'t just make you tired — it directly reduces muscle repair, fat metabolism, and connective tissue recovery. Sleep is where gains are built.',
    category: 'recovery',
    context: ['any', 'rest_day'],
    tags: ['sleep', 'hormones', 'growth hormone'],
    source: 'Van Cauter et al., 2000'
  },
  {
    id: 'ins-calorie-hierarchy',
    headline: 'Calories are 70% of your nutrition results',
    body: 'Energy balance drives body composition more than food quality, meal timing, or supplements. Get calories and protein right first — everything else is fine-tuning.',
    category: 'nutrition',
    context: ['any', 'cutting', 'bulking'],
    tags: ['calories', 'fundamentals', 'hierarchy']
  },
  {
    id: 'ins-environment-beats-willpower',
    headline: 'Environment beats willpower every time',
    body: 'Pack your gym bag the night before. Train at the same time daily. Every extra 10 min of commute = 20% more skipped sessions. Make training the path of least resistance.',
    category: 'motivation',
    context: ['any'],
    tags: ['habits', 'environment', 'consistency'],
    source: 'Clear, Atomic Habits (2018)'
  },
  {
    id: 'ins-never-miss-twice',
    headline: 'The one rule that prevents all spirals',
    body: 'Never miss twice. One skipped session is life. Two is a new pattern. This single rule prevents the "I\'ll start again Monday" spiral that kills more programs than any injury.',
    category: 'motivation',
    context: ['any'],
    tags: ['consistency', 'habits', 'mindset']
  },
  {
    id: 'ins-process-over-outcome',
    headline: 'Focus on execution, not the scoreboard',
    body: 'Elite performers think "execute the next rep" not "I need to hit a PR." Before each set, name ONE cue. After each set, rate execution quality. This is how real progress happens.',
    category: 'motivation',
    context: ['lift_day', 'combat_day'],
    tags: ['mindset', 'process', 'performance']
  },
  {
    id: 'ins-aerobic-base-grappling',
    headline: 'Your grappling cardio problem is aerobic, not anaerobic',
    body: 'Research shows 55-65% of grappling energy comes from the aerobic system. The athlete with "endless cardio" isn\'t doing more sprints — they have a better aerobic base. Zone 2 work is the foundation.',
    category: 'grappling',
    context: ['combat_day', 'rest_day'],
    tags: ['conditioning', 'aerobic', 'cardio'],
    source: 'Andreato et al., 2017'
  },
  {
    id: 'ins-strength-training-prevents-injury',
    headline: 'Strength training cuts injury risk by 66%',
    body: 'A meta-analysis of 26,000+ athletes found strength training reduced sports injuries by 66%. Stretching alone showed nearly zero benefit. Strong muscles protect joints and connective tissue.',
    category: 'general_fitness',
    context: ['lift_day', 'any'],
    tags: ['injury prevention', 'strength', 'evidence'],
    source: 'Lauersen et al., 2014 meta-analysis'
  },
  {
    id: 'ins-overtraining-rare',
    headline: 'You\'re probably not overtrained — you\'re under-recovered',
    body: 'True overtraining syndrome takes months of extreme training. What most people call "overtraining" is actually poor sleep, insufficient food, or high life stress. Fix recovery before cutting training.',
    category: 'recovery',
    context: ['any'],
    tags: ['overtraining', 'recovery', 'fatigue'],
    source: 'Kreher & Schwartz, 2012'
  },
  {
    id: 'ins-glycolytic-fight',
    headline: 'Most fights are won or lost in the glycolytic zone',
    body: 'The 10-second to 2-minute energy system powers sustained exchanges. Train it with 30s on/30s off intervals, pad work bursts, and heavy bag rounds. This is your fight-finishing engine.',
    category: 'striking',
    context: ['combat_day', 'any'],
    tags: ['energy systems', 'conditioning', 'striking']
  },
  {
    id: 'ins-hip-mobility-5min',
    headline: '5 minutes of mobility covers 80% of what you need',
    body: 'Deep squat hold (2 min) + dead hang (1 min) + 90/90 hip switches (1 min per side). These three movements address the most common mobility deficits in combat athletes. No excuses.',
    category: 'general_fitness',
    context: ['rest_day', 'any'],
    tags: ['mobility', 'minimum effective dose', 'movement']
  },
  {
    id: 'ins-grappling-efficiency',
    headline: 'Efficient grapplers use structure, not muscle',
    body: 'Elite grapplers conserve energy by using frames, wedges, and skeletal structure instead of muscular force to hold positions. Breathe continuously, relax in dominant positions, grip strategically.',
    category: 'grappling',
    context: ['combat_day'],
    tags: ['efficiency', 'technique', 'energy conservation']
  },
  {
    id: 'ins-asymmetry-injury',
    headline: '15% strength difference between limbs doubles injury risk',
    body: 'Include unilateral work: split squats, single-leg RDLs, single-arm rows. Test bilateral differences periodically and don\'t just train your dominant side harder — equalize.',
    category: 'general_fitness',
    context: ['lift_day'],
    tags: ['asymmetry', 'injury prevention', 'unilateral']
  },
  {
    id: 'ins-anxiety-is-fuel',
    headline: 'Anxiety and excitement are the same signal',
    body: 'Research shows pre-competition anxiety and excitement have nearly identical physiological signatures. The only difference is the label you apply. Reframe "I\'m nervous" to "I\'m ready."',
    category: 'motivation',
    context: ['combat_day'],
    tags: ['mindset', 'competition', 'anxiety'],
    source: 'Brooks (2014) reappraisal research'
  },
  {
    id: 'ins-weight-class-reality',
    headline: 'Walking 20%+ above fight weight? Wrong weight class',
    body: 'You should be within 8-12% of competition weight at fight-camp start. Bigger cuts mean more muscle lost, worse performance, and dangerous dehydration. Move up before you hurt yourself.',
    category: 'mma',
    context: ['cutting', 'any'],
    tags: ['weight class', 'weight cut', 'safety']
  },
  {
    id: 'ins-eccentric-power',
    headline: 'The lowering phase is where the magic happens',
    body: 'Emphasizing the eccentric (3-4 sec lowering) produces more hypertrophy per set, stronger tendons, and better injury prevention. Most people rush through the most valuable part of every rep.',
    category: 'lifting_technique',
    context: ['lift_day'],
    tags: ['eccentric', 'technique', 'hypertrophy'],
    source: 'Schoenfeld et al., 2017'
  },
  {
    id: 'ins-punching-power-ground',
    headline: 'Punching power starts at your feet',
    body: 'The kinetic chain for a punch: feet push ground → hips rotate → core stiffens → arm extends. Weak legs or core leaks = weaker punches. Deadlifts and med ball throws build knockout power.',
    category: 'striking',
    context: ['combat_day', 'lift_day'],
    tags: ['power', 'kinetic chain', 'striking']
  },
  {
    id: 'ins-80-20-nutrition',
    headline: '80% whole food, 20% whatever you want',
    body: 'This approach is sustainable, socially compatible, and equally effective as "clean eating" for body composition. Adherence beats perfection. The best diet is one you can follow for months, not days.',
    category: 'nutrition',
    context: ['any', 'cutting', 'bulking'],
    tags: ['adherence', 'flexible dieting', 'sustainability']
  },
];

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
  dieting: {
    name: 'Dieting',
    description: 'Cut, bulk, and body composition strategies',
    icon: '⚖️'
  },
  grappling: {
    name: 'Grappling',
    description: 'BJJ, wrestling, and submission grappling',
    icon: '🥋'
  },
  motivation: {
    name: 'Training Mindset',
    description: 'Practical strategies for long-term progress',
    icon: '🧠'
  },
  striking: {
    name: 'Striking',
    description: 'Boxing, kickboxing, and Muay Thai training',
    icon: '🥊'
  },
  mma: {
    name: 'MMA',
    description: 'Mixed martial arts specific training',
    icon: '👊'
  },
  general_fitness: {
    name: 'General Fitness',
    description: 'Strength, muscle building, and longevity',
    icon: '💪'
  }
};
