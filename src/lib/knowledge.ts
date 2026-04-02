import { KnowledgeArticle, KnowledgeTip, ContentCategory, LearningPath } from './types';
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
    content: 'Post-workout nutrition window is real but wider than thought. Aim for protein within 2-4 hours, not 30 minutes (Ribeiro et al. 2023).',
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
    content: 'Total daily protein (1.6-2.2g/kg) matters most for muscle retention. Aim for 0.25-0.4g/kg per meal across 3-6 meals based on preference. Meal frequency has minimal effect when total is adequate (Stokes et al. 2022; Schoenfeld et al. 2018).',
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Vary intensity across the week with heavy, moderate, and light days to develop all physical qualities simultaneously',
      'Limit lifting to 2-3 sessions per week to preserve mat time and manage fatigue',
      'Use daily undulating periodization to prevent plateaus through constant stimulus variation',
      'Program strength, hypertrophy, and power days in the same week for optimal grappler development',
    ],
    relatedArticleIds: ['article-combat-sport-periodization', 'article-grappling-strength', 'article-autoregulation', 'article-concurrent-training'],
    applyCta: { label: 'View your program', overlayId: 'periodization' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Prioritize mechanical tension through heavy compound lifts as the primary hypertrophy driver',
      'Control the eccentric phase for 3+ seconds to maximize growth stimulus per set',
      'Train each muscle group with 10-20 sets per week distributed across at least 2 sessions',
      'Emphasize full range of motion with deep stretches at long muscle lengths for superior results',
    ],
    relatedArticleIds: ['article-eccentric-training', 'article-progressive-overload', 'article-strength-adaptations', 'article-soreness-not-progress'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Train heavy (85%+ 1RM) to maximize neural adaptations and high-threshold motor unit recruitment',
      'Expect strength gains without visible muscle growth in the first 4-8 weeks of training',
      'Use the 4-8 rep range for the best combination of strength and hypertrophy as a grappler',
      'Understand that light weights to failure do not fully recruit all motor units due to the size principle',
    ],
    relatedArticleIds: ['article-hypertrophy-science', 'article-general-strength', 'article-progressive-overload'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Build your program around 6 movement patterns: hip hinge, squat, horizontal push, horizontal pull, vertical pull, and carries',
      'Keep mat time as priority number one and schedule 2-3 lifting sessions around grappling',
      'Never train legs heavy the day before competition or hard sparring',
      'Use a DUP split with strength, hypertrophy, and power days across the week',
    ],
    relatedArticleIds: ['article-undulating-periodization', 'article-grip-training', 'article-grappling-conditioning', 'article-grappling-recovery'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Use 3-4 second eccentrics on key exercises to produce 15% more hypertrophy per set',
      'Start with lighter weights when adding eccentric emphasis to avoid excessive fatigue',
      'Focus eccentric work on stretch-position exercises like RDLs, incline curls, and flies',
      'Limit eccentric emphasis to 2-3 exercises per session since they are highly taxing',
    ],
    relatedArticleIds: ['article-hypertrophy-science', 'article-progressive-overload', 'article-training-longevity'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Train all four grip types: crushing, pinch, support, and wrist strength',
      'Perform the 5-exercise grip circuit 2-3x per week at the end of sessions',
      'Differentiate training for gi (crushing and pinch) vs no-gi (wrist control) grapplers',
      'Schedule grip training away from hard rolling days to avoid impairing mat performance',
    ],
    relatedArticleIds: ['article-grappling-strength', 'article-grip-endurance-grapplers', 'article-grappling-recovery'],
    applyCta: { label: 'Track grip strength', overlayId: 'grip_strength' },
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Prioritize sleep (7-9 hours) and protein (1.6-2.2g/kg/day) as the only Tier 1 recovery methods',
      'Use cold water immersion strategically during competition weeks, not after hypertrophy sessions',
      'Save money on BCAAs and compression garments — they add nothing beyond protein targets',
      'Never increase training volume more than 10% week-over-week and deload every 4-6 weeks',
    ],
    relatedArticleIds: ['article-sleep-performance', 'article-overtraining-vs-underrecovery', 'article-cold-exposure', 'article-nutrition-fundamentals'],
    applyCta: { label: 'Check recovery', overlayId: 'recovery' },
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
- Post-workout protein within 2-4 hours (the anabolic window is far wider than 30 minutes; Ribeiro et al. 2023)
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Distinguish between long-term fat loss (8-16 weeks) and acute water cuts (competition week only)',
      'Cycle carbs higher on training days (3-5g/kg) and lower on rest days (2-3g/kg)',
      'Keep protein at 2.0-2.4g/kg during a cut to preserve muscle mass',
      'Limit supplements to creatine, vitamin D, omega-3, and caffeine — everything else is marketing',
    ],
    relatedArticleIds: ['article-nutrition-fundamentals', 'article-cutting-guide', 'article-mma-weight-management', 'article-creatine'],
    applyCta: { label: 'Log a meal', overlayId: 'nutrition' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Extend warm-ups to 10-15 minutes with general cardio, activation, and ramping sets',
      'Favor joint-friendly exercise alternatives like trap bar deadlifts and DB bench press',
      'Use higher frequency with lower per-session volume for better recovery after 30',
      'Invest in daily neck training, hip mobility, and shoulder prehab to protect your grappling career',
    ],
    relatedArticleIds: ['article-injury-prevention', 'article-warmup-protocol', 'article-knee-health-athletes', 'article-autoregulation'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Use RPE to adjust training intensity to your daily readiness instead of chasing fixed numbers',
      'Apply the green/yellow/red light system based on recovery score, sleep, and stress levels',
      'Drop RPE targets by 0.5-1 point on yellow-light days and 1-2 points on red-light days',
      'Trust the app auto-adjustment engine — it uses your actual data, not a generic spreadsheet',
    ],
    relatedArticleIds: ['article-rpe-autoregulation', 'article-hrv-baselines', 'article-stress-management', 'article-overtraining-vs-underrecovery'],
    applyCta: { label: 'View your program', overlayId: 'periodization' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Compare HRV only to your personal 14-day rolling baseline, never to internet averages',
      'Measure HRV at the same time daily (morning, lying down) for consistent readings',
      'Use standard deviation bands to interpret daily readings and decide training intensity',
      'Focus on week-over-week trends rather than panicking over single-day dips',
    ],
    relatedArticleIds: ['article-autoregulation', 'article-recovery-science', 'article-stress-management', 'article-overtraining-vs-underrecovery'],
    applyCta: { label: 'Check recovery', overlayId: 'recovery' },
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
    difficulty: 'advanced',
    keyTakeaways: [
      'Keep your acute-to-chronic workload ratio between 0.8 and 1.3 to minimize injury risk',
      'Never increase total weekly training load by more than 10% — spikes cause injuries, not high loads',
      'Track both lifting and grappling volume as part of your total training load',
      'Watch for competition-week spikes that can push ACWR into the danger zone above 1.5',
    ],
    relatedArticleIds: ['article-injury-prevention', 'article-combat-sport-periodization', 'article-concurrent-training'],
    applyCta: { label: 'View your program', overlayId: 'periodization' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Follow the 48-hour rule: no hard training within 48 hours of intense sparring or competition',
      'Perform daily neck health work including circles, chin tucks, and isometric holds',
      'Balance grip training with finger extensor work at least 3x per week to prevent injury',
      'Avoid heavy pulling exercises for 24-48 hours after hard gi training sessions',
    ],
    relatedArticleIds: ['article-recovery-science', 'article-grip-training', 'article-grappling-strength', 'article-neck-strength-fighters'],
    applyCta: { label: 'Check recovery', overlayId: 'recovery' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Build knockout power through the 4 pillars: rotational power, hip extension, shoulder endurance, and core anti-rotation',
      'Never lift heavy before sparring — fatigued muscles mean slower reactions and getting hit',
      'Prioritize power and rate of force development over bodybuilder-style mass',
      'Train neck religiously as your chin\'s insurance policy against knockouts',
    ],
    relatedArticleIds: ['article-power-development', 'article-shoulder-durability-strikers', 'article-neck-strength-fighters', 'article-striking-conditioning'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Train all three energy systems concurrently, adjusting emphasis based on fight schedule',
      'Shift from 60% strength in off-season to 40% conditioning during fight camp',
      'Keep lifting supplementary — avoid competing with 4-6x weekly martial arts sessions',
      'Prioritize 8+ hours sleep, high protein, and deloads every 4-6 weeks for recovery',
    ],
    relatedArticleIds: ['article-combat-sport-periodization', 'article-concurrent-training', 'article-energy-system-development', 'article-striking-strength'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Build your program around the Big 5 movement patterns: squat, hinge, horizontal push, horizontal pull, and vertical pull',
      'Start with 3 full-body sessions per week at 6-12 reps and focus on learning proper form',
      'Apply progressive overload through weight, reps, sets, technique, ROM, tempo, or rest times',
      'Prioritize consistency over perfection — sleep beats supplements, compound lifts beat isolation',
    ],
    relatedArticleIds: ['article-progressive-overload', 'article-strength-adaptations', 'article-hypertrophy-science'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Use the 7 progression methods: weight, reps, sets, technique, ROM, tempo, and rest times',
      'Follow the progression hierarchy when weight stalls — add reps first, then sets, then tempo',
      'Track every workout to know if you are actually progressing over weeks and months',
      'Celebrate progress in any dimension — if reps or technique improve, you are still making gains',
    ],
    relatedArticleIds: ['article-general-strength', 'article-hypertrophy-science', 'article-autoregulation', 'article-eccentric-training'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'During a cut, reduce volume by 15-20% but keep loads heavy to preserve muscle',
      'During a bulk, increase volume by 10% and push RPE slightly higher to capitalize on extra fuel',
      'Extend rest periods by 25-30% during a deficit to maintain working loads',
      'Deload every 3-4 weeks during a cut instead of the usual 5-6 weeks',
    ],
    relatedArticleIds: ['article-cutting-guide', 'article-bulking-guide', 'article-nutrition-fundamentals', 'article-autoregulation'],
    applyCta: { label: 'Log a meal', overlayId: 'nutrition' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Lose weight at 0.5-0.7% bodyweight per week for men, 0.3-0.5% for women',
      'Increase protein to 2.2-2.4g/kg during a cut — needs go up, not down',
      'Never drop dietary fat below 0.8g/kg (men) or 1.0g/kg (women) for hormone health',
      'Stop your cut immediately if you experience persistent fatigue, menstrual loss, or 10%+ strength drops',
    ],
    relatedArticleIds: ['article-dieting-training-integration', 'article-women-nutrition', 'article-nutrition-fundamentals', 'article-bulking-guide'],
    applyCta: { label: 'Log a meal', overlayId: 'nutrition' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Use a 10-12% caloric surplus — bigger surpluses add fat without extra muscle',
      'Gain 0.5-1% bodyweight per month as a beginner, 0.25-0.5% as intermediate',
      'Train harder during a bulk: add 10% volume and push RPE slightly higher',
      'Limit bulk duration to 16-20 weeks then transition to a 4-6 week maintenance phase',
    ],
    relatedArticleIds: ['article-cutting-guide', 'article-dieting-training-integration', 'article-nutrition-fundamentals', 'article-hypertrophy-science'],
    applyCta: { label: 'Log a meal', overlayId: 'nutrition' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Monitor energy availability — never drop below 30 kcal/kg FFM/day to prevent RED-S',
      'Maintain fat intake above 1.0g/kg to protect estrogen production and bone health',
      'Cut weight at 0.3-0.5% BW/week maximum with diet breaks every 4-6 weeks',
      'Treat menstrual irregularity as a health red flag, not a sign of fitness',
    ],
    relatedArticleIds: ['article-cutting-guide', 'article-nutrition-fundamentals', 'article-female-athlete-menstrual-cycle'],
    applyCta: { label: 'Log a meal', overlayId: 'nutrition' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Plan training in phases: off-season (build base), pre-competition (peak), competition (rest and prime), post-competition (recover)',
      'Reduce lifting volume 30-40% as competition approaches while maintaining intensity',
      'Adapt sport-specific priorities: grapplers need grip and pulls, strikers need rotation and power',
      'Never increase total training load (lifting + sport) by more than 10% per week',
    ],
    relatedArticleIds: ['article-undulating-periodization', 'article-mma-programming', 'article-acwr-injury', 'article-concurrent-training'],
    applyCta: { label: 'View your program', overlayId: 'periodization' },
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Train process focus by naming one cue before each set and rating execution quality afterward',
      'Build discomfort tolerance by deliberately choosing harder options and practicing the one-more rule',
      'Adopt an identity-based approach — never miss twice in a row to maintain the habit chain',
      'Reframe pre-competition anxiety as readiness — the physiological signatures are nearly identical',
    ],
    relatedArticleIds: ['article-motivation-consistency', 'article-visualization-motor-imagery', 'article-stress-management'],
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Follow the 10-3-2-1-0 rule: no caffeine 10h, no meals 3h, no training 2h, no screens 1h before bed',
      'Maintain 7-9 hours of sleep minimum — 5 hours drops testosterone 10-15%',
      'Keep your bedroom at 65-68F with complete darkness and a consistent wake time',
      'Use magnesium glycinate (200-400mg) and a cold shower after evening training to aid sleep onset',
    ],
    relatedArticleIds: ['article-recovery-science', 'article-sleep-architecture-athletes', 'article-stress-management', 'article-overtraining-vs-underrecovery'],
    applyCta: { label: 'Check recovery', overlayId: 'recovery' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Treat life stress as a training variable — your body has one shared recovery budget',
      'Scale training down during high-stress periods: reduce volume 30-50% and cap RPE at 6-7',
      'Watch for 3+ day HRV drops, elevated resting HR, and persistent DOMS as overspent stress signals',
      'During high stress, protect the training habit with shorter lighter sessions rather than pushing through',
    ],
    relatedArticleIds: ['article-overtraining-vs-underrecovery', 'article-autoregulation', 'article-hrv-baselines', 'article-sleep-performance'],
    applyCta: { label: 'Check recovery', overlayId: 'recovery' },
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Focus on the nutrition hierarchy: calories (70%), protein (20%), carbs/fats (8%), everything else (2%)',
      'Hit 1.6-2.2g protein per kg bodyweight distributed across 3-5 meals daily',
      'Get 80% of calories from whole foods and allow 20% flexibility for sustainability',
      'Stop obsessing over supplements and timing — consistency with calories and protein is what matters',
    ],
    relatedArticleIds: ['article-cutting-guide', 'article-bulking-guide', 'article-weight-management', 'article-creatine'],
    applyCta: { label: 'Log a meal', overlayId: 'nutrition' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Audit sleep, nutrition, life stress, training monotony, and deload frequency before assuming overtraining',
      'Distinguish functional overreaching (normal, recovers in 1-2 weeks) from non-functional overreaching (warning sign)',
      'Deload every 4-6 weeks by reducing volume 40-60% while maintaining frequency',
      'If stuck in a plateau, try training less with better recovery before training more',
    ],
    relatedArticleIds: ['article-recovery-science', 'article-stress-management', 'article-sleep-performance', 'article-autoregulation'],
    applyCta: { label: 'Check recovery', overlayId: 'recovery' },
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Build the aerobic base first with 3-4 Zone 2 sessions per week before adding lactate tolerance work',
      'Train all three energy systems: phosphagen (0-10s), glycolytic (10s-2min), and aerobic (2min+)',
      'Use sport-specific peaking during fight camp with round-length intervals matching your sport',
      'Develop striking power through lower body force production, core rotational stiffness, and upper body RFD',
    ],
    relatedArticleIds: ['article-energy-system-development', 'article-power-development', 'article-striking-strength', 'article-combat-sport-periodization'],
    applyCta: { label: 'Start conditioning', overlayId: 'conditioning' },
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
    difficulty: 'advanced',
    keyTakeaways: [
      'Stay within 8-12% of competition weight year-round to minimize brutal acute cuts',
      'Use chronic fat loss (0.5-0.7% BW/week) during camp then acute water manipulation for the final 3-5%',
      'Rehydrate with oral rehydration solution containing sodium — not plain water — post-weigh-in',
      'Stop a cut immediately if resting HR exceeds 100 bpm, severe cramping occurs, or urine stays dark brown',
    ],
    relatedArticleIds: ['article-fight-week-protocol', 'article-making-weight-science', 'article-cutting-guide', 'article-nutrition-fundamentals'],
    applyCta: { label: 'Fight prep', overlayId: 'competition' },
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Prioritize strength training for injury prevention — it reduces injuries by 66% vs nearly zero for stretching alone',
      'Never increase weekly training volume by more than 10% to stay in the ACWR sweet spot',
      'Address limb asymmetries greater than 15% with unilateral work to halve your injury risk',
      'Use the PEACE (first 48h) and LOVE (after 48h) framework when injuries occur instead of complete rest',
    ],
    relatedArticleIds: ['article-acwr-injury', 'article-training-through-injuries', 'article-knee-health-athletes', 'article-warmup-protocol'],
    applyCta: { label: 'Log an injury', overlayId: 'injury' },
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Design your environment to make training the path of least resistance — pack bags, plan routes, set times',
      'Apply the never-miss-twice rule to prevent one skipped session from becoming a new pattern',
      'Use the two-minute rule on low-motivation days: commit to just showing up and starting',
      'Avoid the all-or-nothing trap — a 20-minute maintenance workout beats zero',
    ],
    relatedArticleIds: ['article-mental-toughness', 'article-visualization-motor-imagery', 'article-stress-management'],
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
    difficulty: 'intermediate',
    keyTakeaways: [
      'Build the aerobic base first — it provides 55-65% of energy in a BJJ match and drives between-exchange recovery',
      'Layer grip endurance and core endurance on top of the aerobic base with 2-3 sessions per week',
      'Add sport-specific intervals (30s on/30s off) only 1-2x per week and never on sparring days',
      'Improve efficiency alongside fitness — use structure instead of muscle and breathe continuously during exchanges',
    ],
    relatedArticleIds: ['article-grappling-strength', 'article-grip-endurance-grapplers', 'article-energy-system-development', 'article-grappling-recovery'],
    applyCta: { label: 'Start conditioning', overlayId: 'conditioning' },
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
    difficulty: 'beginner',
    keyTakeaways: [
      'Prioritize hip mobility above all else — every combat sport demands it for guard play, kicks, and level changes',
      'Do the minimum effective dose daily: 2-min deep squat hold, 1-min dead hang, 1-min 90/90 switches per side',
      'Use dynamic stretching before training and save static stretching for after sessions or dedicated mobility work',
      'Train mobility under load (loaded stretching at end-range) during dedicated 15-20 minute sessions 2-3x per week',
    ],
    relatedArticleIds: ['article-warmup-protocol', 'article-injury-prevention', 'article-knee-health-athletes', 'article-training-longevity'],
    applyCta: { label: 'Mobility session', overlayId: 'mobility' },
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
  },
  {
    id: 'article-creatine',
    title: 'Creatine: The Most Researched Supplement in History',
    tldr: '3-5g/day of creatine monohydrate boosts power, repeated sprint ability, and cognition — with a spotless safety record across 700+ studies.',
    category: 'nutrition',
    tags: ['creatine', 'supplementation', 'performance', 'science', 'combat'],
    readTime: 7,
    publishedAt: new Date('2026-02-23'),
    source: 'Kreider et al. 2017; Branch 2003; Rawson & Volek 2003; Hultman et al. 1996; Rae et al. 2003',
    difficulty: 'beginner',
    keyTakeaways: [
      'Take 3-5g of creatine monohydrate daily — no loading, no cycling, any time of day',
      'Expect 1-3kg of intracellular water gain initially — this is not fat and looks like fuller muscles',
      'Start supplementation in the offseason so your weight-cut strategy accounts for creatine-loaded bodyweight',
      'Ignore kidney damage myths — over 700 studies and up to 5 years of data show no adverse effects in healthy individuals',
    ],
    relatedArticleIds: ['article-caffeine', 'article-nutrition-fundamentals', 'article-weight-management'],
    applyCta: { label: 'Log a meal', overlayId: 'nutrition' },
    content: `
## 700+ Studies. One Consistent Finding.

No supplement in existence has been studied more than creatine monohydrate. Over 700 peer-reviewed papers spanning three decades have examined its effects on performance, body composition, and health. The verdict is not ambiguous: creatine works, it's safe, and most athletes are leaving performance on the table by not using it.

## How Creatine Actually Works

### Phosphocreatine Resynthesis

Your muscles store energy as **ATP** (adenosine triphosphate). During explosive efforts — a double-leg takedown, a heavy clean, a flurry of punches — ATP is broken down into ADP, releasing energy. The problem: your muscles only store about 5-8 seconds of ATP at maximal effort.

**Creatine phosphate** donates its phosphate group to ADP, rapidly regenerating ATP. More stored creatine = faster ATP resynthesis = more capacity for repeated high-intensity efforts. This is the **phosphocreatine energy system**, and it's the dominant fuel source for efforts lasting 0-10 seconds.

### Cell Volumization

Creatine draws water into muscle cells through osmosis. This **intracellular hydration** isn't cosmetic filler — it creates an anabolic environment. Cellular swelling has been shown to upregulate protein synthesis and reduce protein breakdown (Haussinger et al. 1993). The muscle looks fuller because it literally is fuller, at the cellular level.

## The Effective Dose

The research is remarkably consistent here. **3-5 grams of creatine monohydrate per day**, every day, is the effective dose. That's it.

**Loading protocols** (20g/day for 5-7 days) will saturate your muscles faster — within a week rather than 3-4 weeks — but Hultman et al. (1996) demonstrated that chronic low-dose supplementation (3g/day) reaches the same saturation point. Loading causes GI distress in some people. It's unnecessary.

**Key dosing facts:**
- Take it at any time of day — timing doesn't matter for chronic supplementation
- Mix it in water, coffee, a shake — the vehicle doesn't matter
- Creatine monohydrate is the gold standard. HCL, ethyl ester, buffered — none have outperformed monohydrate in head-to-head research (Jager et al. 2011)
- Don't cycle it. Continuous use maintains saturation without downregulation

## The Weight Gain "Myth"

New creatine users typically gain 1-3 kg in the first 1-2 weeks. This predictably triggers panic. Here's the reality:

**This is intracellular water, not fat.** The water is stored inside the muscle cell, not subcutaneously. You won't look puffy or bloated — you'll look slightly fuller. The scale moves, but the mirror doesn't lie.

For combat athletes with weight classes, this matters contextually. If you're supplementing year-round, this water weight becomes your baseline. It only creates a problem if you start creatine close to a weigh-in. Begin supplementation in the offseason, and your weight-cut strategy accounts for your creatine-loaded bodyweight as normal.

Branch (2003) conducted a comprehensive meta-analysis confirming that creatine-associated weight gain is lean mass and water — **not adipose tissue**.

## Cognitive Benefits: The Lesser-Known Effect

Rae et al. (2003) gave creatine to vegetarians (who have lower baseline creatine stores) and found significant improvements in working memory and processing speed. The brain is a massive consumer of ATP, and creatine supplementation supports neural energy metabolism.

Subsequent research extended these findings to sleep-deprived individuals and high-stress cognitive tasks — both extremely relevant to combat athletes managing training camps, weight cuts, and fight-week stress.

**For fighters:** cognitive sharpness under fatigue is not optional. If creatine provides even a marginal edge in decision-making during the later rounds, that's worth the negligible cost and zero downside.

## Safety Profile: Kidney Concerns Debunked

The "creatine damages kidneys" claim persists in gyms despite being thoroughly disproven. It originates from a misunderstanding: creatine increases **creatinine** levels in blood tests. Creatinine is a marker used to estimate kidney function. Higher creatinine from creatine supplementation reflects increased creatine metabolism, not kidney damage.

Kreider et al. (2017) reviewed the entire body of long-term safety data and concluded: **creatine monohydrate is safe for healthy individuals at recommended doses**, with no adverse effects on renal, hepatic, or cardiac function. Studies extending up to 5 years of continuous use show no issues.

**Caveat:** If you have pre-existing kidney disease, consult your nephrologist. For everyone else, the concern is unfounded.

## Combat Sport Relevance

Creatine's benefits map directly onto combat sport demands:

- **Repeated sprint ability:** Scrambles, exchanges, and transitions require repeated bursts of maximal effort with incomplete recovery. Rawson & Volek (2003) found creatine improved repeated sprint performance by 5-15%
- **Power output:** Single-effort power (a knockout punch, an explosive takedown entry) improves with greater phosphocreatine availability
- **Training volume tolerance:** More ATP resynthesis between sets means more high-quality reps in the weight room, which means faster strength development
- **Recovery between rounds:** Faster phosphocreatine replenishment during rest periods supports sustained output across a 3 or 5-round fight

## The Bottom Line

**The protocol:**
1. Take **3-5g creatine monohydrate daily** — no loading, no cycling
2. Any time of day, mixed in anything
3. Start in the offseason to establish your baseline bodyweight
4. Expect 1-3 kg of intramuscular water gain initially
5. Continue indefinitely — there is no reason to stop

Creatine is cheap, effective, extensively studied, and safe. It improves both physical performance and cognitive function under fatigue. If you're a combat athlete not taking it, you're conceding a free advantage.
`
  },
  {
    id: 'article-caffeine',
    title: "Caffeine: The Athlete's Drug",
    tldr: '3-6 mg/kg caffeine boosts strength, power, and focus — but the half-life means evening doses silently wreck your sleep and recovery.',
    category: 'nutrition',
    tags: ['caffeine', 'supplementation', 'performance', 'pre-workout', 'combat'],
    readTime: 6,
    publishedAt: new Date('2026-02-23'),
    source: 'Goldstein et al. 2010; Grgic et al. 2020; Pickering & Kiely 2019; Beaumont et al. 2017',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Dose at 3-6mg/kg bodyweight 30-60 minutes before training for optimal ergogenic effect',
      'Set a hard caffeine curfew at minimum 6 hours before bed to protect sleep quality',
      'Taper caffeine 2-3 weeks before competition and withdraw fully 48-72 hours pre-fight for maximum effect',
      'Accept that habitual use blunts subjective effects but performance benefits largely persist',
    ],
    relatedArticleIds: ['article-caffeine-performance', 'article-creatine', 'article-sleep-performance', 'article-nutrition-fundamentals'],
    applyCta: { label: 'Log a meal', overlayId: 'nutrition' },
    content: `
## The Most Widely Used Psychoactive Substance on Earth Also Happens to Be Ergogenic

Caffeine isn't just a morning ritual. It's a legitimate performance-enhancing substance with decades of controlled trial data behind it. The International Society of Sports Nutrition position stand (Goldstein et al. 2010) is unambiguous: caffeine enhances endurance, strength, power, and cognitive performance in trained athletes.

## How It Actually Works

### Adenosine Receptor Antagonism

Throughout the day, a molecule called **adenosine** accumulates in your brain as a byproduct of neural activity. Adenosine binds to its receptors and produces drowsiness — it's your body's built-in fatigue signal.

Caffeine is structurally similar to adenosine. It fits into the same receptors but **doesn't activate them**, effectively blocking adenosine's signal. The result: reduced perception of effort, increased alertness, and enhanced motor unit recruitment. You don't have more energy — you have less awareness of your fatigue.

Caffeine also increases circulating catecholamines (adrenaline, noradrenaline), enhances calcium release from the sarcoplasmic reticulum in muscle fibers, and may improve fat oxidation during prolonged efforts.

## The Dose-Response Relationship

Grgic et al. (2020) conducted a comprehensive meta-analysis establishing the effective range:

- **3-6 mg/kg bodyweight** is the ergogenic sweet spot
- For a 75 kg fighter, that's **225-450 mg** — roughly 2-4 cups of coffee
- Below 3 mg/kg, effects become inconsistent
- Above 6 mg/kg, side effects (anxiety, GI distress, tremor) escalate without proportional performance gains
- **Timing:** 30-60 minutes pre-training for peak plasma concentration

**Practical dosing for combat athletes:**
- 60 kg athlete: 180-360 mg
- 75 kg athlete: 225-450 mg
- 90 kg athlete: 270-540 mg

Start at the low end. More is not better — it's jittery.

## Does Habitual Use Kill the Effect?

This is where it gets nuanced. Beaumont et al. (2017) found that habitual caffeine consumers still experienced ergogenic benefits from acute dosing, though the magnitude may be slightly reduced compared to non-habitual users.

**The current evidence suggests:**
- Tolerance develops to caffeine's subjective effects (you feel less "wired") but the **performance-enhancing effects largely persist**
- Daily users may need to be at the higher end of the dosing range (5-6 mg/kg)
- Complete tolerance to ergogenic effects has not been convincingly demonstrated in well-designed studies
- Caffeine withdrawal (48-72 hours) followed by acute re-dosing can amplify the effect for competition

**For daily users:** you don't need to quit coffee to benefit from pre-training caffeine. But you may be getting less of a boost than you think.

## The Hidden Training Cost: Sleep

Here's where most athletes sabotage themselves. Caffeine has a **half-life of 5-6 hours** in most people (CYP1A2 enzyme dependent — some people metabolize it faster or slower).

If you consume 300 mg of caffeine at 4 PM for an evening training session, you still have approximately 150 mg circulating at 10 PM. That's equivalent to a strong cup of coffee — in your system when you're trying to sleep.

**Sleep disruption from caffeine:**
- Increased sleep latency (takes longer to fall asleep)
- Reduced total sleep time
- Decreased **slow-wave sleep** (the most restorative phase)
- Blunted nocturnal growth hormone release

Pickering & Kiely (2019) emphasized this trade-off: the acute performance boost from caffeine is real, but if it costs you quality sleep, the net training effect over weeks and months becomes negative. **One great session isn't worth five nights of degraded recovery.**

**The rule:** Set a caffeine curfew at minimum 6 hours before bed. For evening trainers, this means morning caffeine only, or accepting that pre-training caffeine will cost you sleep.

## Pre-Competition Protocol

For fighters approaching competition, caffeine can be strategically manipulated:

1. **2-3 weeks out:** Begin reducing daily caffeine intake by 50%
2. **7 days out:** Drop to minimal intake (one small coffee or none)
3. **48-72 hours pre-fight:** Full caffeine withdrawal (expect headaches — they pass)
4. **Fight day:** Acute dose of 4-6 mg/kg, 45-60 minutes before the bout

This protocol restores full sensitivity to caffeine's ergogenic effects. The performance boost on competition day is maximized because your adenosine receptors are upregulated from the withdrawal period.

**Warning:** Never trial a new caffeine dose on competition day. Test your protocol in training first.

## The Bottom Line

**Daily training protocol:**
- 3-5 mg/kg caffeine, 30-60 min pre-session
- Hard cutoff 6+ hours before bed
- Coffee, caffeine pills, or pre-workout — the source doesn't matter (but know your dose)

**Competition protocol:**
- Taper caffeine 2-3 weeks out
- Withdraw fully 48-72 hours pre-fight
- Acute dose of 4-6 mg/kg on fight day

Caffeine works. But it's a tool with trade-offs. Respect the half-life, protect your sleep, and use withdrawal strategically for competition. The athletes who manage caffeine intelligently get both the acute boost and the long-term recovery.
`
  },
  {
    id: 'article-cold-exposure',
    title: 'Cold Exposure: What the Science Actually Shows',
    tldr: 'Cold water immersion helps tournament recovery but blunts hypertrophy when used after training. Use it strategically, not habitually.',
    category: 'recovery',
    tags: ['cold-exposure', 'recovery', 'cryotherapy', 'sauna', 'adaptation', 'combat'],
    readTime: 6,
    publishedAt: new Date('2026-02-23'),
    source: 'Roberts et al. 2015; Leeder et al. 2012; Laukkanen et al. 2015; Huberman overreach critique',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Use cold water immersion for tournament recovery between bouts, not after hypertrophy training',
      'Avoid post-exercise cold exposure during training blocks — it blunts the inflammatory signals needed for adaptation',
      'Prefer sauna over cold plunge after training — heat exposure is additive, not counterproductive',
      'Follow the 10-15C water temperature for 10-15 minutes protocol if using CWI strategically',
    ],
    relatedArticleIds: ['article-recovery-science', 'article-sleep-performance', 'article-overtraining-vs-underrecovery', 'article-alcohol-performance'],
    applyCta: { label: 'Check recovery', overlayId: 'recovery' },
    content: `
## Cold Plunges Are Everywhere. The Evidence Is More Complicated Than Your Feed Suggests.

Cold exposure has become a wellness identity. But behind the influencer content and the breathwork hype, there's a genuine body of research — and it tells a more nuanced story than "cold good, always."

The honest answer on cold exposure for combat athletes: **it depends on what you're trying to achieve, and when.**

## Cold Water Immersion vs. Whole-Body Cryotherapy

**Cold water immersion (CWI):** Submerging the body (typically waist- or chest-deep) in water at 10-15 degrees C for 10-15 minutes. This is the most studied modality with the strongest evidence base.

**Whole-body cryotherapy (WBC):** Standing in a chamber at -110 to -140 degrees C for 2-3 minutes. Despite the dramatic temperatures, WBC has a **weaker evidence base** than CWI. Air is a poor conductor of heat compared to water, so the actual tissue cooling is less pronounced than the chamber temperature implies.

Leeder et al. (2012) meta-analyzed the recovery literature and found CWI produced meaningful reductions in muscle soreness and perceived fatigue at 24, 48, and 96 hours post-exercise. WBC showed less consistent results.

**Bottom line on modality:** If you're choosing between the two, cold water wins on evidence per dollar spent.

## The Acute Recovery Benefits

CWI after intense training or competition does provide measurable benefits:

- **Reduced perceived muscle soreness** (small-to-moderate effect sizes)
- **Lower subjective fatigue** in subsequent sessions
- **Reduced limb swelling** via hydrostatic pressure and vasoconstriction
- **Parasympathetic nervous system activation** — the cold triggers a vagal response that shifts you from sympathetic (fight-or-flight) to parasympathetic (rest-and-digest) dominance

For tournament fighters competing multiple times in a day, or for athletes in brutal training camps with two-a-days, these acute recovery effects are genuinely valuable. Getting from "destroyed" to "functional" in 12-18 hours matters when you fight again tomorrow.

## The Adaptation Interference Problem

Here's where it gets uncomfortable for cold plunge enthusiasts.

Roberts et al. (2015) published a landmark study showing that regular post-exercise CWI **blunted long-term muscle hypertrophy and strength gains** compared to active recovery. The mechanism: cold exposure suppresses the inflammatory signaling cascade and satellite cell activity that are required for muscle adaptation.

**The inflammatory response to training is not a bug — it's a feature.** The soreness, swelling, and localized inflammation after hard training are part of the signaling process that triggers muscle protein synthesis, satellite cell proliferation, and structural remodeling. When you ice that process, you're muting the adaptation signal.

### What this means practically:

- Post-exercise cold exposure may reduce your gains from strength and hypertrophy training
- The interference is dose-dependent — more frequent CWI = greater blunting
- The effect appears most pronounced for hypertrophy; strength and power outcomes show less consistent interference

## When to Use Cold Exposure (and When Not To)

### Use it:
- **Tournament recovery:** Between fights or matches in a competition setting
- **Fight week:** When adaptation isn't the goal — survival is
- **Overreaching periods:** Late in a training camp when managing accumulated fatigue outweighs building new adaptations
- **Acute injury management:** The first 48-72 hours after an acute soft tissue injury

### Avoid it:
- **After strength/hypertrophy sessions** where the goal is long-term adaptation
- **During early/mid training camp** when you're still building qualities
- **As a daily habit** during training blocks — this is where the adaptation interference accumulates

### The gray zone:
- **After sport-specific sessions** (sparring, rolling) — the research is less clear here. If you're not trying to hypertrophy from these sessions, cold exposure is less likely to interfere with your primary adaptation goals

## Practical CWI Protocol

If you're going to use cold water immersion:

1. **Temperature:** 10-15 degrees C (50-59 degrees F). Colder is not meaningfully better and increases cold shock risk
2. **Duration:** 10-15 minutes. Diminishing returns beyond this
3. **Depth:** At minimum waist-deep; chest-deep is better for the hydrostatic pressure benefit
4. **Timing:** At least 4 hours after training if you want to minimize adaptation interference while still getting recovery benefits (though this reduces the recovery effect too)

## Heat Exposure: The Other Side

Sauna use has a separate and compelling evidence base. Laukkanen et al. followed over 2,000 Finnish men for 20+ years and found that frequent sauna use (4-7 sessions/week) was associated with significantly reduced cardiovascular mortality and all-cause mortality.

The mechanisms are distinct from cold:
- **Heat shock protein (HSP) upregulation** — HSPs protect cellular proteins from damage and support repair
- **Cardiovascular conditioning** — heart rate elevates to 120-150 bpm, providing a mild cardiovascular training stimulus
- **Growth hormone release** — acute spikes in GH (though the long-term significance is debated)
- **Improved arterial compliance** — blood vessels become more elastic

Unlike CWI, there's no strong evidence that heat exposure interferes with training adaptations. Sauna after training appears to be additive rather than counterproductive.

**Sauna protocol:** 15-20 minutes at 80-100 degrees C, 2-4 sessions per week. Hydrate aggressively.

## The Bottom Line

**Competition/tournament day:** Cold water immersion at 10-15 degrees C for 10-15 minutes between bouts. This is where CWI earns its keep.

**Training blocks:** Skip the cold plunge after lifting sessions. Use sauna instead — you get recovery benefits without blunting adaptation.

**Daily cold plunges as a lifestyle habit:** If you enjoy them for the mental discipline and mood boost, go ahead — but know that you may be paying a small adaptation tax. Whether that trade-off is worth it is your call.

Stop treating cold exposure as universally good or universally bad. It's a tool. Use it when the context matches.
`
  },
  {
    id: 'article-alcohol-performance',
    title: 'Alcohol and Athletic Performance: The Honest Data',
    tldr: 'Alcohol suppresses MPS by up to 37%, wrecks sleep architecture, and tanks testosterone — but the dose-response curve is steep. 1-2 drinks and a binge are different universes.',
    category: 'recovery',
    tags: ['alcohol', 'recovery', 'muscle-protein-synthesis', 'sleep', 'performance'],
    readTime: 6,
    publishedAt: new Date('2026-02-23'),
    source: 'Parr et al. 2014; Barnes et al. 2010; Lakicevic et al. 2019',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Keep consumption to 1-2 drinks when possible — the dose-response curve for harm is steep',
      'Never drink after key training sessions — alcohol suppresses muscle protein synthesis by up to 37%',
      'Eat protein before or during drinking to partially buffer MPS suppression',
      'Avoid alcohol within 4 weeks of competition and never during weight cuts',
    ],
    relatedArticleIds: ['article-recovery-science', 'article-sleep-performance', 'article-sleep-architecture-athletes', 'article-nutrition-fundamentals'],
    applyCta: { label: 'Check recovery', overlayId: 'recovery' },
    content: `
## This Isn't a Lecture. It's Biochemistry.

Athletes drink. Some frequently, some occasionally, some never. This article isn't here to moralize — it's here to lay out what alcohol actually does to the physiological processes you're training to optimize, so you can make informed decisions.

The data is clear. What you do with it is your business.

## Muscle Protein Synthesis Suppression

The headline finding: Parr et al. (2014) showed that alcohol consumption after resistance exercise **reduced muscle protein synthesis (MPS) by 24% when consumed with protein, and by 37% when consumed without protein.**

This study used a dose of approximately 1.5 g/kg of alcohol (roughly 8-12 standard drinks for a 75 kg person — a genuine binge). Participants performed resistance exercise, then consumed either alcohol + protein, alcohol + carbohydrate, or protein alone.

**Key takeaways:**
- Even when adequate protein (25g whey) was consumed alongside alcohol, MPS was still suppressed by ~24%
- Without protein, the suppression was worse (~37%)
- The suppression window extended for several hours post-consumption
- The mechanism involves interference with mTOR signaling — the master regulator of muscle protein synthesis

**For combat athletes:** If you trained hard today and then drink heavily tonight, you are measurably undermining the adaptation you worked for. The workout still happened, but the recovery from it is compromised.

## Sleep Architecture Destruction

Alcohol is a sedative, not a sleep aid. There's a critical difference.

While alcohol reduces **sleep latency** (you fall asleep faster), it devastates sleep quality through multiple mechanisms:

- **REM sleep suppression:** Alcohol disproportionately reduces REM sleep, the phase most associated with memory consolidation, motor learning, and emotional regulation. For combat athletes learning new techniques, this is directly relevant
- **Sleep fragmentation:** Alcohol increases awakenings in the second half of the night as your body metabolizes it and rebounds from the sedative effect
- **Blunted growth hormone release:** The largest pulse of growth hormone occurs during the first cycle of slow-wave sleep. Alcohol suppresses this pulse by up to 75% (Van Cauter et al. 2000)
- **Increased sympathetic nervous system activity:** Heart rate and core temperature remain elevated, reducing the restorative depth of sleep

Barnes et al. (2010) demonstrated that alcohol consumption the evening after exercise resulted in measurable performance decrements the following day — reduced power output, slower reaction times, and impaired decision-making.

**For fighters:** A single night of alcohol-disrupted sleep can compromise the next 1-2 training sessions. Motor skill acquisition from the previous day's practice is also impaired.

## Testosterone and Hormonal Disruption

Acute alcohol intake above **0.5 g/kg** (roughly 3-4 standard drinks for a 75 kg person) produces measurable testosterone suppression. Higher doses suppress testosterone more dramatically, with effects lasting 24-48 hours.

The mechanisms include:
- Direct testicular toxicity — alcohol is metabolized to acetaldehyde, which damages Leydig cells
- Increased aromatase activity — converting more testosterone to estradiol
- Blunted luteinizing hormone (LH) pulsatility — reducing the hormonal signal for testosterone production

Lakicevic et al. (2019) reviewed the full hormonal impact and noted that chronic heavy drinking produces sustained hormonal disruption, while occasional moderate intake (1-2 drinks) produces minimal and transient effects.

## Dehydration and Next-Day Performance

Alcohol is a diuretic — it suppresses antidiuretic hormone (ADH/vasopressin), increasing urine output. The dehydration effect is dose-dependent and compounded by the fact that most people don't compensate with adequate water intake while drinking.

**Dehydration effects relevant to combat athletes:**
- Reduced plasma volume = impaired cardiovascular performance
- Decreased reaction time and coordination
- Increased perceived exertion at the same workloads
- Greater risk of muscle cramps and strains
- Impaired thermoregulation — dangerous for athletes cutting weight

A 2% reduction in body water has been shown to impair endurance performance by 7-10%. For a fighter who's already managing hydration around training and weight management, alcohol-induced dehydration adds an unnecessary deficit.

## The Dose-Response Reality

This is where nuance matters. The studies generating the scariest headlines (Parr et al., Barnes et al.) used **binge-level doses** — 1.0-1.5 g/kg, equivalent to 6-12+ drinks.

**1-2 standard drinks:**
- Minimal measurable impact on MPS
- Negligible hormonal disruption
- Minor sleep effects (mostly in sensitive individuals)
- Easily compensated with adequate hydration

**3-5 drinks:**
- Moderate MPS suppression begins
- Sleep architecture noticeably disrupted
- Testosterone dip measurable but transient
- Next-day training quality likely reduced

**6+ drinks (binge):**
- Significant MPS suppression (24-37%)
- Severe sleep disruption lasting the entire night
- Pronounced hormonal suppression for 24-48 hours
- Next-day performance substantially impaired
- Recovery timeline extended by 48-72 hours

**One glass of wine at dinner is not the same physiological event as a night out.** Treating them as equivalent is scientifically illiterate.

## The Practical Framework

### When it matters least:
- Rest days with no training the following morning
- Offseason periods without active training goals
- 1-2 drinks with food, well-hydrated, early in the evening

### When it matters most:
- After hard training sessions (you're suppressing the adaptation you just stimulated)
- During training camp or fight preparation (every recovery variable is amplified)
- Before morning training sessions (impaired performance is guaranteed)
- During weight cuts (dehydration compounding on dehydration)

## The Bottom Line

**If you choose to drink:**
1. Keep it to 1-2 drinks when possible — the dose-response curve is steep
2. Never after key training sessions — protect the adaptation
3. Eat protein before/during — it partially buffers MPS suppression
4. Hydrate aggressively — match each drink with a full glass of water
5. Avoid alcohol within 4 weeks of competition
6. Front-load it early in the evening to minimize sleep disruption

The goal isn't abstinence guilt. It's informed decision-making. Know the cost, decide if it's worth paying, and never pay it when the stakes are highest.
`
  },
  {
    id: 'article-soreness-not-progress',
    title: 'Why Soreness Is Not a Progress Indicator',
    tldr: 'DOMS reflects novelty, not growth stimulus. The repeated bout effect means less soreness over time while hypertrophy increases — they are independent processes.',
    category: 'muscle_science',
    tags: ['DOMS', 'soreness', 'muscle-science', 'recovery', 'training'],
    readTime: 5,
    publishedAt: new Date('2026-02-23'),
    source: 'Schoenfeld & Contreras 2013; Nosaka 2008; Damas et al. 2018',
    difficulty: 'beginner',
    keyTakeaways: [
      'Stop chasing soreness — DOMS reflects stimulus novelty, not growth quality',
      'Train through mild-to-moderate soreness (2-6/10) with normal or reduced intensity',
      'Track progressive overload, body composition, and sport performance instead of soreness as progress markers',
      'Stick to consistent exercises long enough to track progress instead of constantly rotating for novelty',
    ],
    relatedArticleIds: ['article-hypertrophy-science', 'article-progressive-overload', 'article-recovery-science'],
    content: `
## If Soreness Meant Growth, Your First Week in the Gym Would Have Been Your Best.

Every lifter remembers their first squat session — the days of agony that followed, the struggle with stairs, the waddling. By that logic, those untrained, technique-less, light-weight squats should have produced the most muscle growth of your entire career. They didn't. Soreness and hypertrophy are poorly correlated, and chasing one to achieve the other is a mistake that costs athletes productive training time.

## What DOMS Actually Is

**Delayed Onset Muscle Soreness (DOMS)** — the stiffness and tenderness that peaks 24-72 hours after exercise — is not a simple indicator of muscle damage or growth. It's a complex inflammatory and neurological response.

### The cascade:
1. **Mechanical disruption:** Exercise, particularly the eccentric (lengthening) phase, creates microscopic disruption in sarcomeres and connective tissue
2. **Inflammatory response:** Neutrophils and macrophages infiltrate the damaged tissue, releasing inflammatory mediators (prostaglandins, bradykinin, cytokines)
3. **Nerve sensitization:** These inflammatory molecules sensitize type III and IV afferent nerve fibers — pain receptors. The tissue isn't necessarily more damaged at 48 hours than at 24 hours; your nerves are more sensitive to it
4. **Edema:** Fluid accumulates in the interstitial space, contributing to stiffness and swelling

Nosaka (2008) emphasized that DOMS magnitude does not reliably predict the extent of muscle damage, nor does it correlate with the adaptive response to training.

## Why Novel Stimuli Cause the Most Soreness

The exercises that make you the most sore are typically:
- **New movements** you haven't performed before
- **Eccentric-emphasized exercises** (Romanian deadlifts, Nordic curls, slow negatives)
- **Exercises at unfamiliar muscle lengths** (stretch-position movements)
- **Training after a layoff**

Notice what these have in common: **novelty**. Your body is encountering a stimulus it hasn't adapted to. This doesn't mean the stimulus is better — it means it's unfamiliar.

A grappler who has been squatting consistently for months will experience minimal soreness from squats, even as they continue to gain strength and muscle. Switch them to Bulgarian split squats for the first time, and they'll be devastated for three days. That doesn't mean split squats are superior — it means they're new.

## The Repeated Bout Effect

This is the key concept that dismantles the soreness-as-progress myth.

The **repeated bout effect** (RBE) describes how a single exposure to a novel exercise confers significant protection against muscle damage and soreness from subsequent exposures to the same exercise — even weeks later.

Damas et al. (2018) tracked muscle damage markers, soreness, and actual hypertrophy across a resistance training program. Their findings were striking:

- **Early in training:** High muscle damage markers, high soreness, **minimal hypertrophy**
- **Later in training:** Low muscle damage markers, low soreness, **significant hypertrophy**

The adaptation that reduces soreness is not the same adaptation that produces muscle growth. Soreness decreases because your muscle and connective tissue become more resilient to mechanical disruption. Hypertrophy increases because the contractile machinery is being progressively overloaded and rebuilt.

**They are independent processes.** Less soreness does not mean less growth.

## Training Through Soreness vs. Waiting

Schoenfeld & Contreras (2013) addressed this directly: training a muscle that is still sore is generally safe and may even accelerate recovery through increased blood flow and gentle loading.

**Guidelines for training through DOMS:**
- **Mild soreness (2-4/10):** Train normally. The warm-up will reduce perceived soreness, and performance is minimally impacted
- **Moderate soreness (5-6/10):** Train at reduced intensity or volume. Use the session as a recovery stimulus — lighter loads, higher reps, focus on blood flow
- **Severe soreness (7+/10):** This is rare in trained athletes performing familiar movements. If it occurs, rest or do a completely different movement pattern. Severe DOMS indicates either excessive novelty or excessive volume — both programming errors

**For combat athletes:** You can't skip mat time because your legs are sore from squats. Learning to train effectively at varying levels of discomfort is a skill. Moderate soreness is a normal part of athletic life, not a red flag.

## Why Chasing Soreness Is Counterproductive

Athletes who use soreness as their training barometer tend to:

1. **Constantly rotate exercises** to maintain novelty — this undermines progressive overload, which requires consistency on movements long enough to track progress
2. **Train to excessive failure and volume** — more isn't better; it's just more damage and longer recovery
3. **Add unnecessary eccentric emphasis** — which increases muscle damage without proportional hypertrophy benefit
4. **Misinterpret good training as bad** — "I'm not sore, so it didn't work" leads to abandoning effective programs
5. **Ignore actual progress markers** — strength increases, rep PRs, and body composition changes are real indicators; soreness is noise

### What to track instead:
- **Progressive overload:** Are you lifting more weight or doing more reps over time?
- **Performance in your sport:** Are you faster, more powerful, more resilient on the mat or in the ring?
- **Body composition:** Do you look and measure differently?
- **Recovery quality:** Are you sleeping well, maintaining energy, and avoiding injury?

## The Bottom Line

**Soreness tells you one thing:** your muscles encountered an unfamiliar stimulus. It tells you nothing reliable about the quality of your training or the magnitude of your adaptation.

**Stop chasing it.** Stick to your program, progressively overload over time, and judge your training by the metrics that actually matter — strength gained, skills developed, and performance delivered. The best training programs in the world produce less and less soreness as you adapt to them. That's not a flaw. That's the entire point.
`
  },
  {
    id: 'article-warmup-protocol',
    title: "The Warm-Up You're Probably Skipping",
    tldr: '10 minutes of general movement, dynamic stretching, and ramp sets prevents injuries and improves working-set performance. No exceptions.',
    category: 'general_fitness',
    tags: ['warm-up', 'injury-prevention', 'performance', 'mobility', 'combat'],
    readTime: 5,
    publishedAt: new Date('2026-02-23'),
    source: 'Behm & Chaouachi 2011; Tillin & Bishop 2009; McCrary et al. 2015; Behm et al. 2016',
    difficulty: 'beginner',
    keyTakeaways: [
      'Follow the 3-phase warm-up: general movement (3-4min), dynamic mobility (3-4min), and ramp sets (3-5min)',
      'Never do long static stretches before lifting — they reduce maximal force production by 4-7%',
      'Use ramp sets with progressively heavier loads to prime your nervous system for working weights',
      'Complete the 10-minute universal warm-up every session with zero exceptions',
    ],
    relatedArticleIds: ['article-science-of-warming-up', 'article-injury-prevention', 'article-mobility-combat', 'article-training-longevity'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
    content: `
## Your First Working Set Should Not Be a Surprise to Your Nervous System.

Walk into most gyms and you'll see athletes load up the bar and start repping. Walk into most martial arts academies and you'll see athletes step onto the mat and start drilling. Both are skipping the single cheapest performance and injury-prevention tool available: a structured warm-up.

This isn't about jogging on a treadmill for 10 minutes. It's about systematically preparing your neuromuscular system to produce force safely and effectively.

## Neural Priming: The Real Purpose of Warming Up

The warm-up serves two primary functions, and neither is "breaking a sweat."

### 1. Increase Tissue Temperature
Warmer muscles contract faster, produce more force, and are more compliant (resistant to tearing). Warmer synovial fluid reduces joint friction. Core temperature elevation of 1-2 degrees C improves nerve conduction velocity — your muscles literally receive signals faster.

### 2. Neural Activation
This is the more important and more often neglected function. Your nervous system doesn't go from "off" to "maximal output" instantly. It requires a ramp — progressively increasing motor unit recruitment, refining coordination patterns, and calibrating proprioceptive feedback.

Tillin & Bishop (2009) demonstrated that warm-up protocols incorporating progressive intensity loading enhanced subsequent maximal force production. The mechanism: **post-activation potentiation (PAP)** — prior submaximal contractions enhance the force-producing capacity of subsequent maximal efforts by increasing calcium sensitivity in muscle fibers and improving motor unit synchronization.

## Post-Activation Potentiation: Real but Misapplied

PAP is a genuine physiological phenomenon, but it's frequently misunderstood:

- **What it is:** A brief enhancement of maximal force output following a near-maximal conditioning contraction
- **What it requires:** The conditioning activity must be heavy enough to potentiate (>80% 1RM) but not so fatiguing that fatigue outweighs potentiation
- **The trade-off:** PAP and fatigue coexist. The net effect depends on the balance — which is why **rest interval** after the conditioning set matters (typically 3-7 minutes)

**For practical purposes:** You don't need to chase PAP with complex contrast protocols. What you need is **ramp sets** — progressively heavier sets that prepare your neuromuscular system for your working weight.

## Dynamic vs. Static Stretching: The Evidence

Behm & Chaouachi (2011) and the updated review by Behm et al. (2016) settled this debate:

### Static stretching before training:
- Holding stretches >60 seconds reduces maximal force production by 4-7%
- The effect is most pronounced for strength and power activities
- Short static stretches (<30 seconds) show minimal negative effect but also minimal benefit
- **Verdict:** Avoid long static stretches before lifting or explosive training

### Dynamic stretching before training:
- Actively moving through full range of motion improves force production, rate of force development, and jump height
- Enhances coordination and proprioception for the movements about to be performed
- Increases heart rate and tissue temperature simultaneously
- **Verdict:** Dynamic stretching is the clear winner for pre-training preparation

### Static stretching after training:
- No performance detriment (the workout is over)
- May improve long-term flexibility when performed consistently
- Can activate the parasympathetic nervous system and aid the transition to recovery
- **Verdict:** Fine and potentially beneficial post-session

## Movement Preparation: The Three Components

McCrary et al. (2015) outlined an evidence-based warm-up framework that applies directly to combat athletes:

### 1. General Warm-Up (3-4 minutes)
Raise core temperature and heart rate with low-intensity full-body movement.
- Jump rope (the combat athlete's default)
- Rowing machine
- Light shadow boxing or movement flows
- Bodyweight squats with arm reaches

### 2. Dynamic Mobility (3-4 minutes)
Move actively through ranges of motion relevant to the training session.

**For lower body sessions:**
- Leg swings (forward/back, lateral) — 10 each direction per leg
- Walking lunges with rotation — 8 per side
- Cossack squats — 6 per side
- Inchworms — 5 reps

**For upper body sessions:**
- Arm circles (progressive) — 10 each direction
- Band pull-aparts — 15 reps
- Push-up to downward dog — 8 reps
- Scapular wall slides — 10 reps

**For combat training:**
- Hip CARs (controlled articular rotations) — 5 per side
- Thoracic rotation reaches — 8 per side
- Neck CARs (slow, controlled) — 3 per direction
- Shoulder dislocates with band — 10 reps

### 3. Ramp Sets (3-5 minutes)
Progressive loading toward your working weight. This is the most commonly skipped and most impactful component.

**Example for a 100 kg squat working weight:**
- Set 1: Bar only (20 kg) x 8 reps — focus on movement quality
- Set 2: 40 kg x 5 reps — increase speed
- Set 3: 60 kg x 3 reps — dial in bracing
- Set 4: 80 kg x 2 reps — approach working intensity
- Set 5: 90 kg x 1 rep — final neural prime
- Begin working sets at 100 kg

**The ramp set rules:**
- Never jump more than 20-25% of your working weight between sets
- Decrease reps as weight increases — the warm-up shouldn't fatigue you
- Focus on speed and quality, not grinding
- The last ramp set should feel fast and confident

## Why "I'll Warm Up on the Mat" Isn't Enough for Lifting

Combat sport warm-ups (flow rolling, light drilling, movement) prepare you for mat-based activities. They increase core temperature and activate sport-specific motor patterns. But they **do not prepare your tissues for heavy axial loading**.

If your training session includes heavy squats, deadlifts, or presses after mat time, you still need ramp sets. Your nervous system may be activated for grappling patterns, but it hasn't been primed for loaded bilateral hip extension under a barbell. These are different neuromuscular demands.

## The 10-Minute Universal Warm-Up for Combat Athletes

**Minutes 0-3: General**
- Jump rope — 2 minutes at conversational pace
- 10 bodyweight squats, 10 push-ups, 10 hip bridges

**Minutes 3-7: Dynamic Mobility**
- Leg swings (forward/back + lateral): 10 each, each leg
- Walking lunge with thoracic rotation: 8 per side
- Inchworms: 5 reps
- Band pull-aparts: 15 reps
- Hip CARs: 5 per side

**Minutes 7-10: Ramp Sets**
- 3-5 progressively heavier sets of your first exercise
- Decreasing reps as weight increases
- Final ramp set at 85-90% of working weight for 1-2 reps

**Total time:** 10 minutes. Non-negotiable.

## The Bottom Line

A proper warm-up costs 10 minutes and pays for itself in injury prevention, better performance on your working sets, and longer training career. Skip it, and you're gambling with cold tissues, unprepared neural pathways, and sub-optimal force production.

**The protocol:** General movement, dynamic stretching, ramp sets. Every session. No exceptions.
`
  },
  {
    id: 'article-power-development',
    title: 'The Science of Power Development',
    tldr: 'Power is force x velocity — RFD, the kinetic chain, and ballistic training matter more than max strength for punch impact.',
    category: 'striking',
    tags: ['power', 'RFD', 'plyometrics', 'fast-twitch', 'striking', 'programming'],
    readTime: 7,
    publishedAt: new Date('2026-02-23'),
    source: 'Haff & Nimphius (2012); Suchomel et al. (2016); Loturco et al. (2022)',
    difficulty: 'advanced',
    keyTakeaways: [
      'Train rate of force development through ballistic exercises — velocity matters more than max strength for punch impact',
      'Build a strength floor (1.5-2x bodyweight squat) then shift focus to speed-strength and plyometric work',
      'Use jump squats, medicine ball throws, and plyometric push-ups for fast-twitch recruitment',
      'Never do power work fatigued — program it when fresh and taper it into fight week',
    ],
    relatedArticleIds: ['article-striking-strength', 'article-striking-conditioning', 'article-combat-sport-periodization', 'article-concurrent-training'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
    content: `
## Why the Hardest Punchers Aren't Always the Strongest Lifters

A fighter who deadlifts 250 kg but can't crack an egg with his jab has a power problem. **Power is force multiplied by velocity** — and in striking, velocity dominates. Loturco et al. (2022) found that among elite boxers and MMA fighters, performance on jump squat and bench throw tests predicted punch impact far better than maximal strength alone. The fastest athletes hit the hardest, not the strongest.

## Rate of Force Development: The Real Metric

**Rate of force development (RFD)** — how quickly you can produce force from zero — is the single most important neuromuscular quality for strikers. A punch takes 80–120 milliseconds to land. Maximal strength peaks around 300+ ms. You never reach peak force in a punch; you reach whatever force you can generate in that narrow window.

Haff & Nimphius (2012) demonstrated that RFD is trainable and partially independent of maximal strength. Two athletes with identical squats can have wildly different RFDs based on their training history and fiber-type distribution.

### Ground Reaction Forces and the Kinetic Chain

Every punch starts at the floor. Ground reaction forces travel through the ankle, knee, and hip, rotate through the trunk, and accelerate through the shoulder and fist. Weak links anywhere in this **kinetic chain** bleed energy. A boxer generating 2,000 N of ground reaction force but losing 40% through a weak core delivers less impact than a fighter generating 1,500 N with an airtight chain.

This is why isolated arm training does almost nothing for punch power. The arms are the last link — they transmit force; they don't create it.

## The Speed-Strength Continuum

Suchomel et al. (2016) laid out the continuum that governs all athletic power:

1. **Absolute Strength** (>90% 1RM, slow) — the foundation
2. **Strength-Speed** (70–90% 1RM, moderate velocity) — heavy power cleans, loaded jumps
3. **Speed-Strength** (30–60% 1RM, high velocity) — jump squats, bench throws, medicine ball work
4. **Absolute Speed** (<30% 1RM or bodyweight, maximal velocity) — plyometrics, unloaded strikes

Striking lives in zones 3 and 4. But you can't express speed-strength without a strength base underneath it. A fighter who never trains above zone 4 eventually plateaus because there's no force to accelerate. A fighter who only trains zone 1 is strong but slow.

**The sweet spot**: build a strength floor (1.5–2x bodyweight squat), then spend most of your power work in zones 3 and 4.

## Fast-Twitch Recruitment and Ballistic Training

Type II (fast-twitch) muscle fibers produce 2–4x more force per cross-sectional area than Type I fibers and contract significantly faster. The problem: your nervous system only recruits them under high-force or high-velocity demands. Slow, grinding reps barely touch them.

**Ballistic movements** — where you accelerate through the entire range of motion and release the load — are the gold standard for fast-twitch recruitment. Unlike a squat where you decelerate at the top, a jump squat or medicine ball throw demands acceleration from start to finish.

Key ballistic exercises for strikers:
- **Jump squats** (30–40% 1RM, 3–5 reps) — lower body power
- **Medicine ball rotational throws** (3–5 kg, maximal intent) — rotational power for hooks and crosses
- **Bench throws on Smith machine** (30–40% 1RM) — upper body pushing power
- **Plyometric push-ups** (clap or explosive) — bodyweight upper body RFD

### Plyometrics: The Free Speed Upgrade

Plyometrics exploit the **stretch-shortening cycle (SSC)** — a rapid eccentric contraction followed immediately by a concentric contraction. The elastic energy stored in tendons and the myotatic reflex combine to produce forces you can't generate from a dead start.

For fighters:
- **Depth jumps** (30–50 cm box) — the most potent lower body plyometric; limit to 40 contacts per session
- **Bounding** — horizontal power transfer for closing distance
- **Overhead medicine ball slams** — full-body SSC training

Ground contact time matters. If your depth jump looks like a squat, the box is too high. Aim for <250 ms ground contact — reactive, not muscular.

## Programming Power Alongside Skill Training

This is where most fighters get it wrong. Power work is neurally demanding. Stacking it on top of hard sparring creates central nervous system fatigue that degrades both your power training and your skill work.

### Practical Framework

**Phase 1: General Prep (8–12 weeks out from fight)**
- 2 strength sessions/week (build the force base)
- 1 power session/week (introduce ballistics)
- Full sport training schedule

**Phase 2: Specific Prep (4–8 weeks out)**
- 1 strength maintenance session
- 2 power sessions (shift to speed-strength and plyometrics)
- Peak sport training

**Phase 3: Taper (1–2 weeks out)**
- Power work only: low volume, high intensity, full recovery
- Reduce strength work to zero
- CNS freshness is the goal

### Session Structure for Power Days

1. **Plyometrics first** (when freshest): 3–4 sets of 3–5 reps, full recovery (2–3 min)
2. **Ballistic lifts second**: jump squats or throws, 4–5 sets of 3–5 reps
3. **Strength work last** (if included): 2–3 compound sets, moderate volume

Never do power work fatigued. If you had a brutal sparring session, skip the power day and do recovery work instead.

## The Bottom Line

- **Power is force x velocity.** Train both, but emphasize velocity for striking.
- Build a **strength floor** (1.5–2x BW squat), then shift focus to ballistic and plyometric work.
- **RFD, not max strength,** determines punch impact. Train with maximal intent on every rep.
- Respect the **kinetic chain**: ground reaction forces, hip rotation, and core stiffness matter more than arm strength.
- Program power work when fresh — never after hard sparring — and taper it into fight week.
`
  },
  {
    id: 'article-neck-strength-fighters',
    title: 'Neck Strength: The Most Neglected Training for Fighters',
    tldr: 'Each pound of neck strength reduces concussion odds by 5%. Train all four directions with isometrics and dynamic work.',
    category: 'mma',
    tags: ['neck', 'concussion', 'prehab', 'injury-prevention', 'mma', 'striking'],
    readTime: 6,
    publishedAt: new Date('2026-02-23'),
    source: 'Eckner et al. (2014); Collins et al. (2014); Catenaccio et al. (2017)',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Train neck strength in all four directions — each pound of force reduces concussion odds by 5%',
      'Use both isometric holds for reactive brace and dynamic reps for tissue capacity',
      'Start embarrassingly light and progress by 1-2kg increments — ego lifting the neck causes real injury',
      'Perform the 5-minute hand-resistance isometric protocol daily as minimum effective dose',
    ],
    relatedArticleIds: ['article-striking-strength', 'article-injury-prevention', 'article-shoulder-durability-strikers', 'article-grappling-recovery'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
    content: `
## One Muscle Group Separates Getting Rocked from Staying Standing

When a punch lands on the jaw, the head whips into rotation. The brain, floating in cerebrospinal fluid, slams against the inside of the skull. The angular acceleration of the head — not the linear force — is the primary mechanism of concussion. Your neck muscles are the only active structure that resists this rotation.

Yet walk into any MMA gym and count how many fighters train their necks with any seriousness. You'll run out of fingers on one hand.

## The Evidence: Neck Strength Reduces Concussion Risk

Collins et al. (2014) studied over 6,700 athletes and found that **for every one pound increase in neck strength, odds of concussion decreased by 5%**. Athletes with the weakest necks were significantly more likely to sustain concussions across multiple sports.

Eckner et al. (2014) demonstrated that greater neck strength directly reduced head acceleration after impact. Stronger necks don't prevent the head from moving — they limit how fast it moves. This reduction in angular velocity is the difference between a flash knockdown and lights out.

Catenaccio et al. (2017) confirmed this relationship using accelerometers: athletes with weaker necks experienced greater head impact magnitudes during identical forces.

### Cervical Spine Biomechanics Under Impact

The cervical spine has seven vertebrae supporting a 4.5–5 kg head. Under a cross or hook, the neck must resist:
- **Lateral flexion** (hook from the side)
- **Rotation** (hook catching the chin)
- **Extension** (uppercut snapping the head back)
- **Combined loading** (real punches are never a single plane)

The deep cervical flexors (longus colli, longus capitis) and extensors (semispinalis, splenius) provide the primary stabilization. The sternocleidomastoid and upper trapezius assist but are insufficient alone. Most people only train the latter — which is why shrugs don't protect your brain.

## Flexor/Extensor Ratio: The Imbalance Problem

Healthy neck strength ratios should be approximately:
- **Flexion-to-extension ratio:** 0.6–0.7 (extensors should be stronger)
- **Lateral flexion:** roughly symmetrical left to right (within 10%)

Fighters who do nothing but shrugs and deadlifts develop strong extensors but weak flexors. This imbalance actually increases injury risk because the neck can't decelerate rotation in all directions.

### Isometric vs. Dynamic Training

**Isometric neck training** (pushing against an immovable resistance) develops the anticipatory stiffness that braces for impact. When you see a punch coming, your neck muscles contract isometrically before contact. This is the most sport-specific modality.

**Dynamic neck training** (moving through range of motion against resistance) builds the muscular cross-sectional area and endurance needed for repeated impacts over 15–25 minutes of fighting.

Both are necessary. Isometric work trains the reactive brace. Dynamic work builds the tissue that enables it.

## Practical Protocols

### The 4-Way Neck Machine (Gold Standard)

If your gym has one:
- **Flexion, extension, left lateral, right lateral** — hit all four directions
- 2–3 sets of 12–20 reps per direction, 2–3x/week
- Start embarrassingly light. The cervical spine has small muscles with limited training history. Ego lifting here causes real injury
- Progress by 1–2 kg increments, not 5 kg jumps

### Manual Resistance (Partner-Based)

A training partner applies force while you resist:
- Partner places hand on forehead; you resist flexion and extension
- Partner places hand on side of head; you resist lateral flexion
- 3 sets of 8–10 second holds per direction
- The partner controls intensity — they should apply gradually increasing force
- Excellent for fighters because it mimics unpredictable loading

### Neck Harness Work

- Attach weight to a head harness, perform controlled nodding motions
- 2–3 sets of 15–25 reps for flexion and extension
- Keep loads light (5–15 kg) and movements controlled
- Never jerk or use momentum — cervical disc injuries are career-ending

### Isometric Protocol (Can Do Daily)

- **Forehead against palm:** Push forward, resist for 10 seconds. 3 sets.
- **Back of head against palm:** Push backward, resist for 10 seconds. 3 sets.
- **Side of head against palm:** Push laterally, resist for 10 seconds each side. 3 sets.
- Total time: under 5 minutes. No equipment needed.

## Why Fighters Skip This (And Why They Shouldn't)

The excuses are always the same: "I don't have time," "it looks weird," "I've never been knocked out." The first two are trivially addressed by the 5-minute isometric protocol above. The third is survivorship bias — by the time you get knocked out, you're already behind on years of neck development.

**Neck strength takes months to build but seconds to need.** A well-developed neck won't make you invincible, but it demonstrably reduces the severity and likelihood of concussions. For a sport where brain health is the single greatest long-term risk, spending 10 minutes per week on neck training is the highest-ROI injury prevention work a fighter can do.

## The Bottom Line

- **Neck strength directly reduces concussion risk** — each pound of force you can resist meaningfully reduces head acceleration on impact.
- Train **all four directions**: flexion, extension, left lateral, right lateral. Imbalances increase vulnerability.
- Use **isometric holds** for reactive stiffness and **dynamic reps** for tissue capacity.
- Start light, progress slowly, and stay consistent — 10 minutes, 2–3x/week is sufficient.
- No equipment? The hand-resistance isometric protocol takes 5 minutes and works anywhere.
`
  },
  {
    id: 'article-energy-system-development',
    title: 'Conditioning for Combat: Energy System Development',
    tldr: 'Fighters need all 3 energy systems. Build the aerobic base first, use polarized training, and periodize across camp.',
    category: 'general_fitness',
    tags: ['conditioning', 'energy-systems', 'aerobic', 'anaerobic', 'intervals', 'cardio'],
    readTime: 8,
    publishedAt: new Date('2026-02-23'),
    source: 'Buchheit & Laursen (2013); Seiler (2010); Franchini et al. (2011)',
    difficulty: 'advanced',
    keyTakeaways: [
      'Build the aerobic base first with 2-4 cardiac output sessions per week at 120-150 BPM',
      'Use polarized training: 80% easy, 20% hard — eliminate the moderate-intensity black hole',
      'Layer glycolytic intervals and phosphagen sprints on top of the aerobic base as competition approaches',
      'Periodize across camp: base building in off-season, capacity mid-camp, sharpening late camp, taper fight week',
    ],
    relatedArticleIds: ['article-striking-conditioning', 'article-grappling-conditioning', 'article-combat-sport-periodization', 'article-concurrent-training'],
    applyCta: { label: 'Start conditioning', overlayId: 'conditioning' },
    content: `
## Every Second of a Fight Uses a Different Fuel System — and Most Fighters Only Train One

Watch a round of MMA: a 10-second scramble (phosphagen), 30 seconds of sustained cage work (glycolytic), a minute of circling and feinting (oxidative), then another explosive takedown attempt (phosphagen again). Combat sports are the ultimate mixed-energy-system demand. Training only "cardio" — or worse, doing everything at a moderate intensity — leaves critical systems underdeveloped.

## The Three Energy Systems

### 1. Phosphagen System (ATP-PCr) — The First 10 Seconds

This system provides immediate, maximal power. It fuels explosive takedowns, knockout combinations, and scrambles. The fuel — phosphocreatine stored in muscle — depletes within 6–10 seconds of all-out effort and takes 3–5 minutes to fully replenish.

**In a fight:** Every explosive exchange draws on this system. Fighters who gas after repeated scrambles have a phosphagen recovery problem, not a "cardio" problem.

**How to train it:**
- All-out efforts of 5–10 seconds with full recovery (3–5 min rest)
- Examples: heavy bag max power bursts, sled sprints, explosive repeats on the mat
- 6–10 reps per session, 1–2x/week

### 2. Glycolytic System — The 10-Second to 2-Minute Window

When the phosphagen system empties, glycolysis takes over, breaking down glucose for energy. It's fast but produces hydrogen ions (the "burn") and lactate as byproducts. This system sustains the sustained grappling exchanges, extended combinations, and clinch battles that define a fight.

**In a fight:** That third-round fatigue where your arms feel like concrete? Glycolytic byproduct accumulation combined with inadequate clearance capacity.

**How to train it:**
- High-intensity intervals of 20–90 seconds with incomplete rest (1:1 to 1:3 work:rest)
- Examples: 30-second Assault Bike sprints with 60-second rest, pad rounds with sustained output
- 6–12 intervals per session, 1–2x/week

### 3. Oxidative System — The Endurance Engine

The aerobic system metabolizes fats and carbohydrates with oxygen. It's the slowest to produce ATP but virtually unlimited in capacity. Critically, it's also responsible for **recovering between efforts** — clearing lactate, replenishing phosphocreatine, and restoring homeostasis.

**In a fight:** Your aerobic system determines how quickly you recover between exchanges, between rounds, and how well you maintain technique when fatigued. A fighter with a poor aerobic base doesn't just tire faster — they lose fine motor control, reaction time, and decision-making first.

## Why Your Aerobic Base Is the Foundation

Seiler (2010) studied world-class endurance athletes across sports and found that elite performers consistently train using a **polarized model**: approximately 80% of training at low intensity (Zone 1–2) and 20% at high intensity (Zone 4–5), with very little time in the moderate "gray zone" (Zone 3).

This applies directly to combat athletes. Franchini et al. (2011) found that elite judo athletes had significantly higher VO2max values than their sub-elite counterparts, and that aerobic capacity was the best predictor of repeated high-intensity performance during matches.

### What the Aerobic Base Actually Does

1. **Increases cardiac output** — your heart pumps more blood per beat (stroke volume), delivering more oxygen to working muscles
2. **Improves capillary density** — more blood vessels surrounding each muscle fiber means better oxygen delivery and waste removal
3. **Enhances mitochondrial density** — more cellular "power plants" to produce aerobic ATP
4. **Accelerates phosphocreatine recovery** — your aerobic system directly replenishes the phosphagen system between bursts
5. **Improves lactate clearance** — better buffering and recycling of glycolytic byproducts

Without this base, high-intensity interval training produces diminishing returns. You're building a sports car engine with a bicycle fuel delivery system.

### Building Cardiac Output

**Cardiac output training** targets stroke volume — training the heart to pump more blood per beat.

Protocol (Buchheit & Laursen, 2013):
- **Intensity:** 120–150 BPM (or conversational pace)
- **Duration:** 30–60 minutes continuous
- **Modality:** Running, cycling, swimming, rowing — anything that doesn't beat up your joints
- **Frequency:** 2–4 sessions/week in the off-season; 1–2 during camp
- **Key rule:** If you can't hold a conversation, you're going too hard

## Anaerobic Capacity: Intervals That Transfer

Once the aerobic base is established, layer in targeted interval work.

### Glycolytic Power Intervals

These train peak glycolytic output and tolerance to acidosis:
- **30/30 intervals:** 30 seconds hard / 30 seconds easy, 10–20 rounds
- **Tabata-style:** 20 seconds all-out / 10 seconds rest, 6–8 rounds (true Tabata, not the group fitness version — this should be nauseating)
- **Tempo rounds:** 3–5 minute rounds at 85–90% effort on pads or in drilling, with 1-minute rest

### Repeat Sprint Ability (RSA)

This most closely mimics the demands of actual fighting:
- 6-second all-out sprint / 24-second active rest, repeated 10–15 times
- Tests and develops the phosphagen-aerobic interface — your ability to recover between explosive efforts
- Perform on bike, rower, or as actual sprints

### The Fight-Specific Simulation

- **5-minute rounds** alternating 10 seconds of all-out effort (sprawl + strike combos) with 20 seconds of light movement (circling, feinting)
- 1-minute rest between rounds
- 3–5 rounds
- This pattern mirrors actual fight pacing and trains all three systems in context

## The Cardinal Mistake: "Moderate Intensity Everything"

The most common conditioning error among fighters is spending all training time at 70–80% effort — too hard to build the aerobic base, too easy to challenge the glycolytic system. Buchheit & Laursen (2013) call this the "black hole" of training intensity.

Symptoms of black hole training:
- Always feeling "kind of tired" but never fresh
- Performance plateaus despite training hard
- Getting through rounds but without pop in your strikes
- Chronic low-grade overtraining

**The fix:** Go truly easy on easy days (can hold a conversation, feels "too easy") and truly hard on hard days (can barely speak, questioning life choices). Eliminate the middle.

## Periodizing Energy System Work Across a Camp

| Phase | Aerobic | Glycolytic | Phosphagen |
|-------|---------|------------|------------|
| Off-season | 3–4x/week | 1x/week | Minimal |
| Early camp | 2–3x/week | 2x/week | 1x/week |
| Mid camp | 1–2x/week | 2x/week | 1–2x/week |
| Late camp / peak | 1x/week (maintain) | 1x/week (sharp) | Integrated with skill |
| Fight week | Light only | None | None |

## The Bottom Line

- Combat sports demand **all three energy systems**; train them deliberately, not accidentally.
- Build the **aerobic base first** — it's the recovery engine that powers everything else. Target 2–4 cardiac output sessions per week in the off-season.
- Use **polarized training**: 80% easy, 20% hard. Eliminate "moderate intensity everything."
- Layer in **glycolytic intervals** (30/30s, Tabatas, tempo rounds) and **phosphagen work** (short sprints, explosive repeats) as competition approaches.
- Periodize across your camp: **base → capacity → sharpening → taper**.
`
  },
  {
    id: 'article-fight-week-protocol',
    title: 'Fight Week: A Science-Based Protocol',
    tldr: 'A day-by-day fight week timeline: water loading, glycogen depletion, taper, and post-weigh-in refueling done right.',
    category: 'mma',
    tags: ['fight-week', 'weight-cut', 'water-loading', 'taper', 'refueling', 'competition'],
    readTime: 8,
    publishedAt: new Date('2026-02-23'),
    source: 'Reale et al. (2017); Barley et al. (2018); Artioli et al. (2016)',
    difficulty: 'advanced',
    keyTakeaways: [
      'Water load at 8-10L/day for 3-4 days then progressively restrict to exploit renal overshoot',
      'Deplete glycogen in the final 2-3 days — each gram holds 3-4g of water for additional weight loss',
      'Rehydrate with sodium-containing ORS post-weigh-in — plain water triggers urination and delays recovery',
      'Refuel with 8-10g/kg high-glycemic carbs over the rehydration period to restore glycogen stores',
    ],
    relatedArticleIds: ['article-making-weight-science', 'article-mma-weight-management', 'article-combat-sport-periodization'],
    applyCta: { label: 'Fight prep', overlayId: 'competition' },
    content: `
## The 7 Days Before a Fight Determine More Than the 7 Weeks of Camp Before Them

A perfectly executed training camp means nothing if fight week is botched. Dehydrate too aggressively and your chin evaporates. Refuel poorly and your gas tank is half empty. Taper wrong and you're flat or overtrained. This is the most consequential week of a fighter's preparation, yet most approach it with guesswork and gym folklore.

Here's what the evidence actually supports.

## The 7-Day Timeline

### Day 7 (Sunday): Final Hard Session + Water Loading Begins

**Training:** This is your last intense session. Keep it short (30–45 min), technically sharp, and fully recovered from. No sparring. Skill work at pace with controlled output.

**Water loading begins.** Reale et al. (2017) established the protocol: increase water intake to **8–10 liters/day** (yes, this is uncomfortable) for 3–4 days. The purpose is to upregulate renal water excretion — your kidneys "learn" to flush water at a high rate. When you cut water intake later, the kidneys keep flushing for 12–24 hours, creating passive water loss.

**Sodium:** Maintain normal or slightly elevated sodium intake (5–7 g/day) during water loading. This helps maintain extracellular fluid balance and prevents early hyponatremia.

### Days 6–5 (Monday–Tuesday): Water Loading Continues + Training Taper

**Training:** Light technical drilling, visualization, game-planning. Intensity drops to 50–60% of normal. Volume drops by 50–70%. The goal is dissipating residual fatigue while maintaining neuromuscular sharpness.

**Water:** Continue 8–10 L/day. Monitor urine color — it should be nearly clear. You'll urinate frequently. This is the protocol working.

**Nutrition:** If a weight cut is needed, begin a moderate caloric deficit. Reduce carbohydrates to 2–3 g/kg bodyweight to begin glycogen depletion. Maintain protein at 2.2–2.5 g/kg to preserve muscle tissue. Keep fats moderate.

### Day 4 (Wednesday): Water Reduction Begins

**Water:** Drop to 4–5 liters. Your kidneys are still excreting at the high-volume rate from days of loading. You'll notice significant weight drops from this day forward.

**Training:** 20–30 minutes maximum. Technique only. Shadowboxing, light pad work, visualization.

**Nutrition:** Continue reduced carbohydrates (1–2 g/kg). Begin reducing sodium to <1.5 g/day. Avoid processed foods (hidden sodium). Switch to simple, controlled meals.

### Day 3 (Thursday): Glycogen Depletion + Further Water Reduction

**Water:** Drop to 1–2 liters, consumed in small sips throughout the day.

**Nutrition:** Reduce carbs to <50 g total. Each gram of stored glycogen holds 3–4 g of water. Depleting glycogen stores can yield 1–2 kg of additional water loss. Maintain protein intake.

**Training:** Optional light movement only — a 15-minute walk, gentle stretching. No training intensity whatsoever.

### Day 2 (Friday — Typical Weigh-In Eve): Final Water Manipulation

**Water:** Minimal intake — sips only as needed. Some fighters go completely dry for the final 12–16 hours. Barley et al. (2018) found that acute dehydration of **3–5% bodyweight** can be achieved safely with water loading protocols, though beyond 5% the risks escalate significantly.

**Nutrition:** Very low carb, low sodium, low residue. Small protein-based meals. Some fighters use sugar-free gum to manage dry mouth.

**Hot bath / sauna (if needed):** If still over target, a passive sweat session can drop 0.5–1.5 kg. Limit to 20–30 minutes. Monitor cognition and coordination — these are early warning signs of dangerous dehydration.

### Day 1 (Saturday Morning): Weigh-In + Refueling

**Weigh-in first.** Then the most important phase begins: **refueling.**

## Post-Weigh-In Refueling Protocol

You typically have 24–30 hours between weigh-in and fight. The goal: restore glycogen, rehydrate, and optimize electrolyte balance without gastrointestinal distress.

### Hour 0–2 (Immediately Post-Weigh-In)

- **Fluid:** Begin with an oral rehydration solution (ORS) — water with sodium (1–1.5 g/L), potassium, and glucose. Pedialyte or similar. Drink 500 mL in the first 30 minutes, then 250 mL every 15–20 minutes
- **Sodium is critical.** Reale et al. (2017) showed that sodium-containing fluids restore plasma volume significantly faster than water alone. Plain water dilutes blood sodium, triggering more urination — you lose what you drink
- **Food:** A moderate meal combining simple carbs and protein. White rice, lean protein, light sauce. Nothing high in fiber or fat (slow digestion)

### Hours 2–12

- **Fluid:** Continue steady intake — target 1–1.5 L per hour. Switch between ORS and regular water. Total target: 125–150% of fluid lost
- **Carbohydrates:** 8–10 g/kg bodyweight over the refueling period. Prioritize high-glycemic sources: white rice, white bread, pancakes, fruit juice, gummy candy. This is one day where "clean eating" takes a back seat to glycogen replenishment
- **Protein:** 1.5–2 g/kg spread across meals
- **Sodium:** 3–5 g supplemental sodium across the refueling period (added to food, in ORS, or as salt capsules)

### Hours 12–24 (Evening Through Fight Morning)

- **Dinner:** Large carb-heavy meal. Pasta, rice, potatoes. Familiar foods — not the time to try the hotel's exotic buffet
- **Pre-bed snack:** Slow-digesting carb + protein (oatmeal with casein, or rice with chicken)
- **Fight morning:** Familiar pre-training meal, 3–4 hours before fight time. Moderate carbs, moderate protein, low fat, low fiber

## The Brain Cost: Cognitive Function During Dehydration

This is the part fighters ignore at their peril. Barley et al. (2018) documented that **even 3% dehydration significantly impairs reaction time, short-term memory, and executive decision-making**. At 5%, cognitive performance drops are measurable and substantial.

In a sport decided by millisecond reactions and split-second tactical decisions, walking into the cage with a dehydrated brain is giving your opponent a neurological advantage. Artioli et al. (2016) found that fighters who cut more than 5% bodyweight via dehydration showed impaired performance even after 24 hours of rehydration.

**This is why the refueling protocol matters as much as the cut.** A fighter who makes weight but refuels poorly still fights impaired.

## What the UFC Performance Institute Recommends

The UFC PI advises fighters to:
- Keep weight cuts to **<5% of bodyweight** via acute water manipulation
- Manage the remaining gap through chronic body composition management during camp
- Water load for 3 days minimum before cutting
- Use sodium-containing beverages for rehydration (not just water)
- Refuel with high-glycemic carbohydrates at 8–10 g/kg
- Have a **practiced** weight cut protocol — never experiment on fight week

## The Bottom Line

| Day | Water | Carbs | Sodium | Training |
|-----|-------|-------|--------|----------|
| 7 | 8–10 L (load) | Normal | Normal–high | Last hard session |
| 6–5 | 8–10 L (load) | 2–3 g/kg (reduce) | Normal | Light technical |
| 4 | 4–5 L (reduce) | 1–2 g/kg | <1.5 g (reduce) | Minimal |
| 3 | 1–2 L (restrict) | <50 g (deplete) | Minimal | Optional light walk |
| 2 | Sips only | Low carb, low residue | Minimal | Nothing |
| 1 (weigh-in) | Rehydrate aggressively | 8–10 g/kg reload | 3–5 g supplement | Nothing |
| 0 (fight) | Maintain hydration | Pre-fight meal 3–4 hrs out | Normal | Compete |

Execute this methodically, practice it in training camps before lesser-stakes events, and never deviate on fight week. The process should feel boring and routine — that's how you know it's dialed in.
`
  },
  {
    id: 'article-making-weight-science',
    title: 'The Science of Making Weight',
    tldr: 'Chronic fat loss during camp is safe; acute water cuts should stay under 5% bodyweight. Bigger cuts mean worse performance.',
    category: 'mma',
    tags: ['weight-cut', 'body-composition', 'dehydration', 'weight-class', 'nutrition', 'health'],
    readTime: 7,
    publishedAt: new Date('2026-02-23'),
    source: 'Crighton et al. (2016); Reale et al. (2017); Morton et al. (2010)',
    difficulty: 'advanced',
    keyTakeaways: [
      'Keep acute water cuts under 5% bodyweight — larger cuts impair performance even after 24h rehydration',
      'Manage body composition chronically during camp so fight-week manipulation is minimal',
      'Choose your weight class based on lean walk-around weight minus 3-5%, not pain tolerance',
      'Lose 0.3-0.5kg per week during camp at a 300-500 kcal deficit with protein at 2.5-2.7g/kg',
    ],
    relatedArticleIds: ['article-fight-week-protocol', 'article-mma-weight-management', 'article-cutting-guide', 'article-women-nutrition'],
    applyCta: { label: 'Fight prep', overlayId: 'competition' },
    content: `
## The Fighter Who Cuts 15 Pounds in a Week and the Fighter Who Cuts 15 Pounds Over 12 Weeks Are Playing Entirely Different Games

Weight cutting in combat sports is ubiquitous, poorly understood, and frequently dangerous. The core confusion: fighters conflate **chronic weight management** (body composition changes over weeks) with **acute weight manipulation** (water and gut content reduction over days). These are fundamentally different physiological processes with different risks, mechanisms, and limits.

## Chronic vs. Acute Weight Management

### Chronic: The Slow Cut (Weeks to Months)

This is actual fat loss and, to a lesser extent, strategic muscle mass management. It happens during training camp through a sustained caloric deficit.

**Mechanisms:**
- **Caloric deficit of 300–500 kcal/day** produces ~0.25–0.5 kg of fat loss per week
- Protein kept high (2.2–2.7 g/kg) to preserve lean mass (Morton et al., 2010)
- Resistance training maintained to send muscle-preserving signals
- Over a 10–12 week camp, a fighter can realistically lose 3–6 kg of body fat

**The advantage:** Every kilogram lost chronically is a kilogram you don't have to cut acutely. Fat loss doesn't impair performance. Dehydration does.

Crighton et al. (2016) found that fighters who maintained lower body fat year-round required smaller acute cuts and performed better on fight night than those who relied primarily on dehydration.

### Acute: Water Manipulation (Days)

This is the dramatic weight drop that happens during fight week — water loading, sodium manipulation, glycogen depletion, and fluid restriction. (See the companion article on Fight Week protocols.)

**Mechanisms:**
- **Water loading + restriction:** Exploits renal overshoot to passively excrete excess water
- **Glycogen depletion:** Each gram of glycogen holds 3–4 g of water; depleting stores yields 1–2 kg
- **Sodium restriction:** Reduces extracellular fluid retention
- **Gut content reduction:** Low-residue diet reduces fecal and food mass by 0.5–1 kg

Acute manipulation can safely drop **3–5% of bodyweight** in trained individuals using proper protocols (Reale et al., 2017). Beyond that, the risk-benefit equation collapses.

## The Dose-Response of Dehydration: Where the Danger Starts

Not all weight cuts are equal. The magnitude matters enormously.

### 1–3% Bodyweight Loss (Low Risk)
- Minimal performance impact if refueled properly
- Achievable primarily through glycogen depletion and gut content
- Most fighters can do this with water loading alone

### 3–5% Bodyweight Loss (Moderate Risk)
- Noticeable cognitive and physical impairment prior to rehydration
- Requires disciplined water loading and sodium manipulation
- Full recovery possible with 24-hour refueling window
- This is the practical upper limit for most fighters

### 5–8% Bodyweight Loss (High Risk)
- Significant cardiovascular strain — heart rate increases, stroke volume decreases
- Cognitive impairment persists even after rehydration (Artioli et al., 2016)
- Thermoregulation impaired — increased risk of heat-related illness
- Barley et al. (2018) documented measurable performance decrements at this range even with optimal refueling

### >8% Bodyweight Loss (Dangerous)
- **Renal stress becomes a genuine medical concern.** Concentrated urine, reduced kidney perfusion, and electrolyte derangement can cause acute kidney injury
- Multiple deaths in combat sports have occurred at this level
- Cardiac arrhythmia risk increases due to potassium and magnesium depletion
- No amount of refueling fully reverses the damage within 24 hours

Crighton et al. (2016) reviewed the evidence and concluded that **cuts exceeding 5% bodyweight through dehydration provide no competitive advantage** once performance decrements are accounted for. You may weigh in lighter, but you fight worse.

## Weight Class Selection: Fight Weight vs. Walk-Around Weight

This is the strategic decision that should precede all cutting discussions.

### The Formula

**Optimal fight weight class = Walk-around weight in lean condition (10–15% body fat for males, 18–23% for females) minus 3–5% for acute water manipulation.**

Example: A male fighter who walks around at 80 kg at 12% body fat:
- Lean off-season weight: 80 kg
- Acute cut potential (5%): 4 kg
- Target weight class: 76 kg / 170 lbs

If making that weight class requires losing more than 5% acutely, either:
1. Get leaner during camp (chronic approach), or
2. Fight at a higher weight class

### The Case Against Large Cuts

The conventional wisdom — "everyone cuts, so I have to cut more to keep up" — creates a race to the bottom. The evidence contradicts it:

- **Impaired chin:** Dehydrated brain tissue is more susceptible to concussion. You're bigger but more vulnerable.
- **Reduced power output:** Muscle force production drops 2–3% per 1% of dehydration beyond 3%.
- **Worse cardio:** Dehydration reduces blood volume, meaning less oxygen delivery and faster fatigue.
- **Cognitive decline:** Reaction time, decision-making, and pattern recognition all degrade.

Morton et al. (2010) found that fighters who competed closer to their natural weight had longer careers, fewer injuries, and — counterintuitively — similar win rates to heavy cutters in the same division.

### How to Know If You're in the Wrong Weight Class

Signs you're cutting too much:
- You feel significantly weakened on fight night despite refueling
- You've been hospitalized or needed medical intervention during a cut
- Your walk-around weight is >15% above your division limit
- You need more than 5 days of water manipulation to make weight
- Your training suffers in the last 3+ weeks of camp due to dieting

## Body Composition Manipulation During Camp

The goal: arrive at fight week as lean as possible so the acute cut is minimal.

### Practical Approach

**Weeks 12–4 (Slow Cut Phase):**
- Caloric deficit: 300–500 kcal/day (no more — you're training hard)
- Protein: 2.5–2.7 g/kg bodyweight (Morton et al., 2010 showed this maximizes lean mass retention)
- Carbohydrates: Timed around training sessions. 3–5 g/kg on training days, 2–3 g/kg on rest days
- Fat: Minimum 0.8 g/kg for hormonal health
- Weigh daily, track weekly averages. Target 0.3–0.5 kg loss per week

**Weeks 4–2 (Stabilization):**
- Reduce deficit to maintenance or slight deficit
- Prioritize performance in training — this is final preparation, not weight loss time
- Fine-tune remaining weight gap for fight week manipulation

**Week 1 (Fight Week):**
- Acute water manipulation for remaining 3–5%
- See fight week protocol

### What Not to Do

- **Crash dieting in the last 3 weeks:** Destroys training quality, metabolic rate, and hormonal function
- **Sauna suits during training:** Creates dehydration that impairs training adaptation. You get worse at fighting to get lighter.
- **Skipping meals to "bank" calories:** Leads to muscle loss, binge-restrict cycles, and poor nutrient timing
- **Diuretics:** Banned in most organizations, medically dangerous, and unpredictable in effect

## The Bottom Line

- **Chronic body composition management** (getting lean over weeks) is safe, sustainable, and performance-preserving. Do the work during camp.
- **Acute water manipulation** (fight week) should be limited to **3–5% of bodyweight** maximum. Beyond this, you're trading performance for a number on the scale.
- Cuts exceeding 8% bodyweight carry **genuine medical risks** including renal damage and cardiac events.
- Choose your weight class based on your **lean walk-around weight minus 3–5%** — not on how much suffering you can tolerate.
- The best fighters make weight **routinely and unremarkably**. If your cut is the hardest part of fight week, you're in the wrong division.
`
  },
  {
    id: 'article-shoulder-durability-strikers',
    title: "Shoulder Durability: A Striker's Blueprint",
    tldr: 'Punching is an overhead sport. Maintain a 3:4 external-to-internal rotation ratio, fix scapular dyskinesis, and cap bag work volume.',
    category: 'striking',
    tags: ['shoulder', 'prehab', 'rotator-cuff', 'injury-prevention', 'striking', 'mobility'],
    readTime: 6,
    publishedAt: new Date('2026-02-23'),
    source: 'Reinold et al. (2010); Wilk et al. (2009); Kibler et al. (2013)',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Maintain external rotation strength at 66-75% of internal rotation to prevent impingement',
      'Perform the prehab protocol 3x/week: band pull-aparts, face pulls, YTWLs, Turkish get-ups, serratus wall slides',
      'Cap heavy bag rounds at 6-8 per session and balance punching volume with equal pulling volume',
      'Watch for scapular winging, clicking during arm elevation, and anterior shoulder ache as warning signs',
    ],
    relatedArticleIds: ['article-striking-strength', 'article-injury-prevention', 'article-neck-strength-fighters', 'article-training-through-injuries'],
    applyCta: { label: 'Log an injury', overlayId: 'injury' },
    content: `
## Throwing 500 Punches a Session Is an Overhead Sport — Your Shoulders Just Don't Know It Yet

Baseball pitchers get shoulder prehab protocols, physical therapy budgets, and pitch counts. Fighters throw more repetitions at higher variety and get nothing. A single pad session can involve 300–500 punches. A heavy bag session adds hundreds more. Over a training camp, that's tens of thousands of ballistic shoulder movements with zero structured recovery.

The result: rotator cuff tendinopathy, labral irritation, and shoulder impingement are endemic among strikers. Most don't address it until something tears.

## Why Striker Shoulders Fail

### The Biomechanics of Throwing Punches

A cross or hook involves:
1. **Rapid internal rotation** of the humerus (the actual punching motion)
2. **Forceful horizontal adduction** (bringing the arm across the body)
3. **Violent deceleration** at end range (stopping the arm after the punch lands or misses)

Phase 3 is where injuries happen. The **posterior rotator cuff** (infraspinatus, teres minor) and **posterior deltoid** must eccentrically decelerate the arm. Every missed punch — where the fist travels through air instead of stopping against a target — amplifies this deceleration demand.

Reinold et al. (2010) showed that the deceleration phase generates the highest forces on the shoulder joint, exceeding the forces of the acceleration phase. The muscles that stop a punch work harder than the muscles that throw it.

### The Rotator Cuff Is a Dynamic Stabilizer, Not a Prime Mover

The four rotator cuff muscles (supraspinatus, infraspinatus, teres minor, subscapularis) exist to **center the humeral head in the glenoid socket** during movement. They don't generate punching power — the pecs, lats, and deltoids do that. But without cuff stability, the larger muscles pull the humeral head out of position, creating impingement, labral fraying, and eventually tears.

Think of it like wheel alignment. The rotator cuff keeps the ball in the socket. When it fails, bone grinds on soft tissue with every repetition.

## Internal/External Rotation Ratio

Wilk et al. (2009) established that healthy shoulder function requires a specific **internal-to-external rotation strength ratio**. In throwers, external rotators should be **at least 66–75% as strong as internal rotators** (a 3:4 ratio).

Strikers are typically far more imbalanced. Punching aggressively trains internal rotation. Heavy bag work trains internal rotation. Bench pressing trains internal rotation. Almost nothing in a typical fighter's program trains external rotation with comparable volume.

**The result:** Internal rotators overpower external rotators, the humeral head migrates anteriorly and superiorly, the supraspinatus gets pinched under the acromion, and impingement begins. Left unchecked, this progresses to tendinopathy, partial tears, and eventually full tears.

### Testing Your Ratio

Practical self-test: Using a resistance band at elbow height, compare your internal rotation strength to your external rotation strength. If external rotation feels significantly weaker (less than ~60% of internal), you have work to do.

## Scapular Dyskinesis: The Hidden Problem

Kibler et al. (2013) identified **scapular dyskinesis** — abnormal scapular movement — as a primary driver of shoulder pathology in overhead athletes. The scapula must upwardly rotate, posteriorly tilt, and externally rotate as the arm elevates. When these movements are restricted or poorly timed, the subacromial space narrows and impingement worsens.

**Heavy bag work is a perfect scapular dyskinesis generator.** The impact drives the scapula into protraction and anterior tilt thousands of times. The serratus anterior fatigues, the lower trapezius weakens, and the scapula begins to "wing" — losing its stable platform function.

Signs of scapular dyskinesis in fighters:
- Shoulder blade "winging" (medial border lifts off the ribcage)
- Asymmetric shoulder blade position at rest
- Clicking or catching during arm elevation
- Pain at the top of the shoulder during hooks or uppercuts

## The Prehab Protocol

Perform this 3x/week, either as a warm-up before upper body training or as a standalone session (15–20 minutes).

### Band Pull-Aparts — Posterior Cuff + Rhomboids

- Hold a light resistance band at arm's length, shoulder height
- Pull apart until hands are wide, squeezing shoulder blades together
- 3 sets of 15–20 reps
- Focus: scapular retraction and external rotation

### Face Pulls — External Rotators + Lower Traps

- Cable or band at face height. Pull toward the face, then externally rotate the hands upward
- 3 sets of 15–20 reps
- The external rotation at the end is critical — don't skip it
- This is the single best exercise for correcting the striker's internal rotation dominance

### YTWLs — Scapular Stabilization Complex

Perform prone (face down on a bench) or standing with light dumbbells (1–3 kg):
- **Y:** Arms overhead at 45 degrees, thumbs up. 10 reps.
- **T:** Arms out to the sides, thumbs up. 10 reps.
- **W:** Elbows bent 90 degrees, externally rotate. 10 reps.
- **L:** Elbows at sides, externally rotate. 10 reps.
- 2 rounds through. Light weight — if you need more than 3 kg, you're compensating with larger muscles.

### Turkish Get-Ups — Shoulder Stability Under Load

- Full Turkish get-up with a kettlebell, focusing on keeping the arm vertical and the shoulder packed throughout
- 3 reps per side with a moderate weight
- This trains reflexive shoulder stabilization through multiple planes — the closest gym exercise to the unpredictable demands of striking

### Serratus Wall Slides — Scapular Upward Rotation

- Stand facing a wall, forearms flat against it
- Slide arms upward while pressing into the wall, protracting the scapulae
- 2 sets of 10 reps
- Targets the serratus anterior, the most important scapular stabilizer for fighters

## Volume Management for Bag Work

The prehab protocol above is necessary but insufficient if training volume is uncontrolled.

**Guidelines:**
- **Cap heavy bag rounds** at 6–8 per session. Endless bag work past fatigue trains sloppy mechanics and fatigued stabilizers — a recipe for injury
- **Balance punching volume with pulling volume.** For every pushing/punching session, include a pulling session with rows, pull-ups, and face pulls
- **Monitor for warning signs:** Anterior shoulder aching after training, pain when sleeping on the affected side, decreased punching power, or clicking during arm circles all warrant a deload
- **Weekly volume:** Track total punching rounds across all modalities (pads, bag, sparring, shadowboxing). If shoulder soreness appears, reduce total volume by 30% before adding prehab — you can't out-prehab overuse

## The Bottom Line

- Striker shoulders face **throwing-sport demands** without throwing-sport injury prevention programs. Close this gap.
- The rotator cuff is a **stabilizer, not a mover**. Neglect it and the bigger muscles slowly destroy the joint.
- Maintain **external rotation strength at 66–75% of internal rotation strength.** Face pulls and band work are non-negotiable.
- Watch for **scapular dyskinesis** — heavy bag work systematically degrades scapular mechanics unless counteracted.
- Perform the prehab protocol **3x/week** (15–20 min) and manage punching volume with hard caps and pulling balance.
- Shoulder injuries end careers slowly, then suddenly. Five minutes of prehab per session buys years of pain-free striking.
`
  },
  {
    id: 'article-caffeine-performance',
    title: 'Caffeine and Athletic Performance: The Complete Playbook',
    tldr: '3-6 mg/kg caffeine 30-60 minutes pre-training enhances power, reaction time, and pain tolerance — but habitual use blunts the effect and evening doses sabotage recovery.',
    category: 'nutrition',
    tags: ['caffeine', 'supplementation', 'performance', 'combat', 'pre-workout', 'sleep'],
    readTime: 5,
    publishedAt: new Date('2026-02-23'),
    source: 'Goldstein et al. 2010; Grgic et al. 2020; Guest et al. 2021; Pickering & Kiely 2019',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Dose at 3-6mg/kg 45 minutes before your first working set for peak ergogenic effect',
      'Cycle caffeine use — reserve full doses for key sessions and wash out 7-10 days before competition',
      'Respect the half-life: no caffeine after early afternoon to protect slow-wave sleep and GH release',
      'Leverage caffeine for faster reactions, higher pain tolerance, and sustained decision-making under fatigue',
    ],
    relatedArticleIds: ['article-caffeine', 'article-sleep-performance', 'article-creatine', 'article-nutrition-fundamentals'],
    applyCta: { label: 'Log a meal', overlayId: 'nutrition' },
    content: `
## Most Athletes Use Caffeine. Almost None Use It Correctly.

Coffee before training is universal. Structured caffeine periodization is rare. The difference between the two is the difference between a vague buzz and a measurable ergogenic edge. The evidence base here is enormous — hundreds of controlled trials — and the consensus is clear: caffeine works, but dosing, timing, and cycling determine whether it works *for you*.

## Optimal Dosing: The 3-6 mg/kg Window

The International Society of Sports Nutrition position stand (Goldstein et al. 2010) established 3-6 mg/kg body mass as the effective ergogenic range. For a 75 kg athlete, that's 225-450 mg — roughly 2-4 cups of strong coffee. Grgic et al. (2020) confirmed in their meta-analysis that doses within this range improve maximal strength by 2-7% and muscular endurance by 6-12%.

**Critical nuance:** More is not better. Doses above 6 mg/kg increase anxiety, heart rate, and GI distress without additional performance benefit. Guest et al. (2021) showed that genetic variation in the CYP1A2 gene means roughly 50% of the population are "slow metabolizers" who get jittery and anxious at doses that work perfectly for fast metabolizers. If 3 mg/kg makes you feel wired, you're likely a slow metabolizer — stay at the lower end.

### Timing

Peak plasma concentration occurs 30-60 minutes post-ingestion. Take your caffeine 45 minutes before your first working set, not while walking into the gym.

## Habituation and Cycling

Daily caffeine use builds tolerance within 7-14 days. Habitual consumers (3+ cups/day) show blunted ergogenic responses compared to naive users (Beaumont et al. 2017). The practical solution:

- **Wash-out protocol:** 7-10 days caffeine-free before a competition or key training block restores full sensitivity
- **Cycling approach:** Limit caffeine to training days only (3-4 days/week), keeping doses at 3 mg/kg on non-competition days
- **Strategic escalation:** Use 2-3 mg/kg for regular training, reserve 5-6 mg/kg for competition or max-effort sessions

## Sleep: The Hidden Cost

Caffeine's half-life is 5-6 hours in most adults. A 300 mg dose at 2 PM still leaves ~150 mg circulating at 8 PM — enough to reduce slow-wave sleep by 20% even if you fall asleep normally (Goldstein et al. 2010). Since slow-wave sleep drives growth hormone release and tissue repair, afternoon caffeine quietly undermines the recovery your training demands.

**Hard rule:** No caffeine after 1 PM if you train in the morning. If you train in the evening, use caffeine only for morning sessions and rely on warm-up intensity for evening performance.

## Combat Sport Specifics

For fighters, caffeine's benefits extend beyond raw strength:

- **Reaction time:** Grgic et al. (2020) found 4-8% faster reaction times at 3-6 mg/kg — meaningful when slipping punches or shooting takedowns
- **Power output:** 3-5% improvement in peak power, translating to harder strikes and more explosive entries
- **Pain perception:** Caffeine blocks adenosine receptors that modulate pain signaling, increasing pain tolerance by 10-15%. This matters in late rounds and during grueling sparring sessions
- **Sustained cognitive function:** Decision-making under fatigue degrades 15-25% slower with caffeine, per Guest et al. (2021)

## The Bottom Line

- Dose at **3-6 mg/kg**, taken **45 minutes pre-training**. Start low if you're unsure of your metabolism.
- **Cycle your use.** Daily consumption builds tolerance. Reserve full doses for key sessions and competitions.
- **Respect the half-life.** No caffeine after early afternoon. Sleep quality is non-negotiable for adaptation.
- **Fighters benefit beyond strength:** faster reactions, higher pain tolerance, and sustained decision-making under fatigue.
- **Wash out for 7-10 days** before major competitions to restore full ergogenic response.
`
  },
  {
    id: 'article-science-of-warming-up',
    title: 'The Science of Warming Up',
    tldr: 'The RAMP protocol — Raise, Activate, Mobilize, Potentiate — systematically prepares your nervous system for peak output and dramatically cuts injury risk.',
    category: 'general_fitness',
    tags: ['warm-up', 'injury-prevention', 'performance', 'RAMP', 'combat', 'mobility'],
    readTime: 5,
    publishedAt: new Date('2026-02-23'),
    source: 'Fradkin et al. 2010; Behm & Chaouachi 2011; Bishop 2003; Tillin & Bishop 2009',
    difficulty: 'beginner',
    keyTakeaways: [
      'Follow the RAMP protocol: Raise temperature, Activate stabilizers, Mobilize joints, Potentiate the nervous system',
      'Use dynamic stretching pre-training — static stretching over 60 seconds reduces strength by 5-8%',
      'Include post-activation potentiation with explosive ramp sets for a 3-8% boost in subsequent power output',
      'Invest 12-15 minutes per session — the 50%+ injury risk reduction alone makes this non-negotiable',
    ],
    relatedArticleIds: ['article-warmup-protocol', 'article-mobility-combat', 'article-injury-prevention', 'article-power-development'],
    applyCta: { label: 'Build a workout', overlayId: 'builder' },
    content: `
## A Cold Muscle Is a Slow, Weak, Injury-Prone Muscle. Full Stop.

Fradkin et al. (2010) analyzed 32 studies on warm-up and injury incidence. The conclusion was unambiguous: structured warm-ups reduce injury risk by over 50% across virtually all sports. Yet most athletes still "warm up" by doing a lighter version of their workout — or worse, skipping it entirely. A proper warm-up is not optional filler. It is the highest-ROI 10-15 minutes of your session.

## The RAMP Protocol

Bishop (2003) proposed and subsequent research validated a four-phase warm-up structure that systematically prepares every relevant system:

### Raise (3-5 minutes)
Elevate heart rate, core temperature, and blood flow. Jump rope, rowing, light jogging, or bodyweight circuits at 50-60% effort. The goal is a light sweat and elevated breathing rate. Muscle temperature increases of 1-2°C improve nerve conduction velocity by 2-5% per degree (Bishop 2003) — your muscles literally contract faster when warm.

### Activate (2-3 minutes)
Target the specific stabilizer muscles that govern joint integrity during your session. For upper body days: band pull-aparts, scapular push-ups, external rotations. For lower body: glute bridges, clamshells, single-leg balance work. These muscles need deliberate activation because they're inhibited by sitting and daily posture.

### Mobilize (2-3 minutes)
Take working joints through their full range of motion dynamically. Leg swings, hip circles, thoracic rotations, deep bodyweight squats. This is where Behm & Chaouachi (2011) made a critical distinction:

- **Dynamic stretching before training:** Improves ROM without performance decrements. Use it.
- **Static stretching before training:** Reduces maximal strength by 5-8% and power output by 2-3% when held longer than 60 seconds. Avoid it pre-session. Save it for post-training or dedicated mobility work.

Short static holds (<30 seconds) show minimal performance loss, but dynamic work is still superior for pre-training preparation.

### Potentiate (2-4 minutes)
Post-activation potentiation (PAP) primes the nervous system for heavy output. Perform 2-3 submaximal sets of your primary exercise pattern at increasing intensity (50%, 70%, 85% of working weight). For power athletes, include 3-5 explosive reps — box jumps, medicine ball throws, or explosive push-ups — at near-maximal intent.

PAP works by increasing motor unit recruitment and rate coding. Tillin & Bishop (2009) showed that a potentiation protocol improved subsequent power output by 3-8% compared to traditional ramp sets alone.

## Combat Sport-Specific Warm-Up

Fighters have unique demands. A combat-specific warm-up should include:

- **Raise:** 3 rounds of shadowboxing at 50-70% intensity (also grooves technique)
- **Activate:** Rotator cuff work (fighters throw hundreds of punches), hip activation (sprawls, level changes)
- **Mobilize:** Neck circles, thoracic rotations, hip openers, ankle mobility (essential for stance work)
- **Potentiate:** 5-8 explosive combinations on pads at 90% power, 2-3 explosive sprawl-to-shot sequences

This takes 12-15 minutes. It prevents injuries, sharpens early-round performance, and ensures your nervous system isn't playing catch-up during sparring.

## The Bottom Line

- Use the **RAMP protocol**: Raise temperature, Activate stabilizers, Mobilize joints, Potentiate the nervous system.
- **Dynamic stretching beats static stretching** pre-training. Static stretching >60 seconds reduces strength and power output.
- **Post-activation potentiation** adds 3-8% to subsequent power output — do explosive ramp sets before heavy work.
- **12-15 minutes** is all it takes. The injury risk reduction alone (>50% per Fradkin et al.) makes this non-negotiable.
- **Fighters:** Shadowboxing is your Raise phase. Add rotator cuff activation and explosive pad work to complete the protocol.
`
  },
  {
    id: 'article-training-through-injuries',
    title: 'Training Through Injuries: Evidence-Based Modifications',
    tldr: 'Pain does not equal harm. Load management and intelligent movement substitutions outperform complete rest for nearly every musculoskeletal injury.',
    category: 'general_fitness',
    tags: ['injury', 'rehabilitation', 'pain-management', 'load-management', 'combat', 'modifications'],
    readTime: 6,
    publishedAt: new Date('2026-02-23'),
    source: 'Lehman 2017; Smith et al. 2017; Glasgow et al. 2015; Khan & Scott 2009',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Train through pain at 0-3/10 on the pain scale — pain does not equal harm for most musculoskeletal issues',
      'Substitute movements rather than eliminating patterns: knee pain means hip-dominant, shoulder pain means neutral grip',
      'Use isometric holds (5x45s at 70% MVC) for acute tendinopathy pain relief before training',
      'Stop training only for fractures, neurological symptoms, joint locking, night pain, or no improvement after 2-3 weeks',
    ],
    relatedArticleIds: ['article-injury-prevention', 'article-knee-health-athletes', 'article-shoulder-durability-strikers', 'article-training-longevity'],
    applyCta: { label: 'Log an injury', overlayId: 'injury' },
    content: `
## The Worst Advice in Fitness Is "Just Rest It."

Complete rest was the standard recommendation for musculoskeletal pain for decades. The evidence now overwhelmingly shows that prolonged rest deconditions tissue, delays recovery, and increases the likelihood of re-injury upon return (Glasgow et al. 2015). The modern approach is clear: find a tolerable training load and maintain it. Pain is information, not a stop sign.

## Pain vs. Harm: A Critical Distinction

Smith et al. (2017) established a practical framework that every athlete needs to internalize:

- **Pain ≠ harm.** A sore knee during squats does not mean you are damaging the joint. Most musculoskeletal pain reflects tissue sensitivity, not tissue damage.
- **Acceptable pain during training:** 0-3/10 on a visual analog scale. If pain stays in this range during and after exercise, you are loading the tissue within its adaptive capacity.
- **Warning signs of actual harm:** Pain above 5/10 during movement, pain that worsens progressively within a session, swelling that increases after training, or pain that is significantly worse 24 hours post-session than it was before.

This distinction changes everything. Most athletes with knee pain, shoulder pain, or back pain can and should continue training — with modifications.

## Load Management Over Rest

Glasgow et al. (2015) demonstrated that tendons, muscles, and joints adapt to load through mechanotransduction — the biological process by which cells convert mechanical stimulus into cellular response. Remove the stimulus entirely and the tissue weakens. The clinical evidence supports:

- **Reduce load to a tolerable level** rather than eliminating it. A sore shoulder that hurts bench pressing 100 kg at full ROM may be pain-free pressing 60 kg to a shortened ROM.
- **Gradually increase load** as symptoms allow. Lehman (2017) recommends 10-15% weekly load increases during return-to-training phases.
- **Isometric holds** at painful angles reduce pain acutely and stimulate tendon adaptation. 5 sets of 45-second isometric holds at 70% maximal voluntary contraction is the gold standard protocol for tendinopathy.

## Movement Substitution Patterns

When a specific movement hurts, don't abandon the movement pattern — modify it:

### Knee Pain
- **Swap:** Back squats → belt squats, leg press with limited ROM, box squats to parallel
- **Shift to hip-dominant:** Romanian deadlifts, hip thrusts, Nordic curls load the posterior chain without knee flexion stress
- **Reduce moment arm:** Goblet squats and front squats reduce shear forces on the knee versus back squats

### Shoulder Pain
- **Swap:** Barbell bench press → neutral-grip dumbbell press, floor press (limits ROM)
- **Shift emphasis:** Overhead pressing → landmine press (arcing path reduces impingement risk)
- **Modify grip:** Pronated grip → neutral grip on rows, presses, and pull-ups. This externally rotates the humerus and opens the subacromial space

### Low Back Pain
- **Swap:** Conventional deadlift → trap bar deadlift, sumo stance, or rack pulls
- **Reduce spinal load:** Bilateral squats → split squats and lunges (lower absolute load, same stimulus)
- **Core stability:** McGill Big 3 (curl-up, side plank, bird dog) daily — these build spinal endurance without provocative flexion/extension

## When to Actually Stop Training

Despite the "train through it" approach, certain presentations demand medical evaluation and genuine rest:

- **Acute traumatic injury:** Joint dislocations, suspected fractures, acute muscle tears with visible bruising
- **Neurological symptoms:** Radiating pain, numbness, tingling, or weakness in extremities
- **Joint locking or giving way:** Mechanical symptoms suggesting meniscal tear or ligament instability
- **Night pain and rest pain:** Pain that wakes you from sleep suggests inflammatory or systemic pathology, not mechanical overload
- **No improvement after 2-3 weeks** of modified training — something else is going on

## The Bottom Line

- **Pain is not the same as harm.** Most musculoskeletal pain is safe to train through at reduced loads (0-3/10 pain scale).
- **Complete rest deconditions tissue** and delays recovery. Maintain tolerable loading.
- **Substitute movements, don't eliminate patterns.** Knee pain → hip-dominant; shoulder pain → neutral grip; back pain → reduced spinal load.
- **Isometric holds** (5×45s at 70% MVC) are the best acute pain-reduction tool for tendon issues.
- **Stop training for:** fractures, neurological symptoms, joint locking, night pain, or failure to improve after 2-3 weeks of modification.
- **Increase load by 10-15% per week** during return phases. Patience here prevents re-injury.
`
  },
  {
    id: 'article-concurrent-training',
    title: 'Concurrent Training: Strength + Cardio Without Compromise',
    tldr: 'The interference effect is real but manageable — separate sessions by 6-8 hours, prioritize strength before cardio, and accept that combat athletes will always live with some interference.',
    category: 'periodization',
    tags: ['concurrent-training', 'interference-effect', 'strength', 'cardio', 'combat', 'programming'],
    readTime: 6,
    publishedAt: new Date('2026-02-23'),
    source: 'Wilson et al. 2012; Fyfe et al. 2014; Murach & Bagley 2016; Hickson 1980',
    difficulty: 'advanced',
    keyTakeaways: [
      'Separate strength and endurance sessions by 6-8 hours minimum to reduce AMPK-mTOR interference',
      'Always train strength before cardio when same-day training is unavoidable',
      'Replace running with cycling or sled work for conditioning to minimize eccentric interference',
      'Accept slower hypertrophy gains as a fighter — 1-2kg lean mass per year while maintaining sport skill is excellent',
    ],
    relatedArticleIds: ['article-combat-sport-periodization', 'article-mma-programming', 'article-energy-system-development', 'article-undulating-periodization'],
    applyCta: { label: 'View your program', overlayId: 'periodization' },
    content: `
## You Cannot Specialize When Your Sport Demands Everything.

Powerlifters only lift. Marathoners only run. Fighters have to do both — and grapple, and drill, and spar. The "interference effect" — the blunted strength adaptation that occurs when endurance training is layered on top of resistance training — was first documented by Hickson (1980) and has haunted concurrent training programming ever since. But the research has matured. The interference is real, quantifiable, and *manageable* if you understand the mechanisms.

## The Molecular Conflict: AMPK vs. mTOR

At the cellular level, strength and endurance training activate opposing signaling pathways (Fyfe et al. 2014):

- **Resistance training** activates **mTOR** (mechanistic target of rapamycin), the master switch for muscle protein synthesis and hypertrophy.
- **Endurance training** activates **AMPK** (AMP-activated protein kinase), an energy sensor that upregulates mitochondrial biogenesis and oxidative capacity — but simultaneously **inhibits mTOR signaling**.

When both pathways are activated in close temporal proximity, AMPK suppresses mTOR. The result: attenuated hypertrophy and strength gains. Wilson et al. (2012) quantified this in their meta-analysis — concurrent training reduced strength gains by ~15% and hypertrophy by ~28% compared to resistance training alone. Power development was the most affected quality, with reductions exceeding 30%.

### Not All Cardio Is Equal

The type of endurance work matters enormously:

- **Running** causes the greatest interference due to eccentric muscle damage and the mechanical mismatch with strength training patterns
- **Cycling** causes moderate interference — less eccentric damage, but still significant AMPK activation
- **Combat-specific conditioning** (pad work, grappling rounds, sparring) sits in a middle ground — it activates AMPK but also involves high-force contractions that partially stimulate mTOR

## Practical Minimization Strategies

Murach & Bagley (2016) synthesized the literature into actionable guidelines:

### Temporal Separation
Separate strength and endurance sessions by **6-8 hours minimum**. This allows mTOR signaling from resistance training to peak (at ~3-4 hours post-session) before AMPK activation from endurance work blunts it. Morning strength, evening cardio is the classic template.

### Priority Sequencing
When same-day training is unavoidable: **strength before cardio, always.** Performing endurance work first depletes glycogen and elevates AMPK before you even touch a barbell, guaranteeing suboptimal strength stimulus. Strength first ensures maximal motor unit recruitment and mTOR activation.

### Modality Selection
- Replace running with **cycling or rowing** for base conditioning when possible — less eccentric damage means less interference
- Use **high-intensity intervals** (10-30 seconds) over long steady-state — shorter bouts cause less AMPK activation per unit of conditioning benefit
- **Sled pushes and drags** are the gold standard "cardio" for strength athletes — high metabolic demand with zero eccentric component

### Volume Management
- Keep dedicated cardio sessions to **2-3 per week** during strength-focused blocks
- Total weekly training volume (all modalities combined) should not exceed what you can recover from — the interference effect is amplified when overall volume outpaces recovery capacity

## The Combat Athlete's Reality

Here's the uncomfortable truth: **fighters cannot fully eliminate the interference effect.** Sparring is endurance work. Drilling is endurance work. Pad rounds are endurance work. A fighter training 4-5 martial arts sessions per week is already performing 4-8 hours of endurance activity before any dedicated conditioning is added.

This means:

- **Strength sessions must be brutally efficient.** 3-4 compound lifts, 3-5 sets of 3-6 reps, heavy loads, full recovery between sets. Get the mTOR stimulus and get out.
- **Accept slower hypertrophy gains.** A fighter gaining 1-2 kg of lean mass per year while maintaining sport skill is making excellent progress.
- **Periodize around competition.** During fight camps, reduce strength volume to maintenance (2 sessions/week, 2-3 sets per exercise) and accept the interference from increased sport-specific work.
- **Off-season is for building.** When sport volume drops, push strength and hypertrophy hard. This is when fighters make their biggest physical gains.

## Programming Template: Fighter's Week

| Day | AM Session | PM Session |
|-----|-----------|------------|
| Mon | Strength (upper) | Skill/sparring |
| Tue | Skill/drilling | — |
| Wed | Strength (lower) | Conditioning (intervals) |
| Thu | Skill/sparring | — |
| Fri | Strength (full body, power) | Skill/drilling |
| Sat | Conditioning or active recovery | — |
| Sun | Off | — |

## The Bottom Line

- The **interference effect reduces strength gains by ~15% and hypertrophy by ~28%** when endurance training is concurrent. Power is most affected (~30% reduction).
- **AMPK from cardio suppresses mTOR from strength training.** Separate sessions by 6-8 hours to minimize this conflict.
- **Strength before cardio, always.** Never enter a strength session glycogen-depleted from prior endurance work.
- **Cycling and sled work** interfere less than running. Choose your conditioning modality strategically.
- **Fighters cannot avoid interference** — martial arts training IS endurance work. Accept it, keep strength sessions short and heavy, and use the off-season to build.
`
  },
  {
    id: 'article-knee-health-athletes',
    title: 'Knee Health for Athletes: Prevention and Longevity',
    tldr: 'Deep squats protect knees, not destroy them. VMO and hamstring strength, full ROM training, and targeted ACL prevention protocols keep fighters pivoting and changing levels for decades.',
    category: 'general_fitness',
    tags: ['knee', 'injury-prevention', 'squat', 'ACL', 'tendinopathy', 'combat', 'longevity'],
    readTime: 6,
    publishedAt: new Date('2026-02-23'),
    source: 'Hartmann et al. 2013; Hewett et al. 2005; Lian et al. 2005; Schoenfeld 2010',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Squat deep — compressive forces peak at 90 degrees and full depth distributes load while building cartilage',
      'Maintain a hamstring-to-quad ratio of 0.6 or higher — below this, ACL injury risk increases 2.5x',
      'Follow the ACL prevention protocol (single-leg balance, lateral bounds, drop jumps) 3x/week for 15 minutes',
      'Manage patellar tendinopathy with heavy slow resistance training, not rest — tendons strengthen under progressive load',
    ],
    relatedArticleIds: ['article-injury-prevention', 'article-training-through-injuries', 'article-mobility-combat', 'article-warmup-protocol'],
    applyCta: { label: 'Log an injury', overlayId: 'injury' },
    content: `
## The Knee Is Not Fragile. Your Training Program Probably Is.

The fitness industry has spent decades telling athletes to avoid deep squats, limit knee-over-toe movement, and "protect" their joints with partial ranges of motion. The research says the opposite. Hartmann et al. (2013) reviewed the biomechanical literature and concluded that deep squats produce lower peak retropatellar compressive forces than half squats, develop the posterior cruciate ligament, and build more resilient cartilage through progressive loading. Avoiding full ROM is not protecting your knees — it's leaving them underdeveloped.

## Knee Anatomy, Simplified

Understanding knee health requires knowing four structures:

- **Quadriceps (especially VMO):** The vastus medialis oblique is the terminal knee extensor. It's the muscle that keeps your kneecap tracking properly during cutting, pivoting, and level changes. Weak VMO = patellar maltracking = anterior knee pain.
- **Hamstrings:** The primary dynamic ACL protector. During deceleration and pivoting, the hamstrings pull the tibia posteriorly, reducing ACL strain. Hewett et al. (2005) showed that athletes with hamstring-to-quadriceps strength ratios below 0.6 were 2.5x more likely to suffer ACL tears.
- **ACL (anterior cruciate ligament):** Prevents anterior tibial translation and rotational instability. Fighters are at high risk due to constant pivoting, level changes, and lateral movement in stances.
- **Patellar tendon:** Connects the kneecap to the tibia. Absorbs enormous forces during jumping, squatting, and kicking. The most common overuse injury in strength-trained combat athletes is patellar tendinopathy.

## VMO and Posterior Chain Training

The VMO activates most powerfully in the last 30 degrees of knee extension and during deep knee flexion. This is why:

- **Full-depth squats** (below parallel) develop the VMO far more than half squats (Schoenfeld 2010)
- **Terminal knee extensions** (TKEs) with a band isolate VMO activation at the range where it matters most
- **Step-downs** from a 6-8 inch box force eccentric VMO control through the exact range that causes patellar tracking problems
- **Split squats with a rear foot elevated** challenge single-leg VMO and hip stability simultaneously

For the posterior chain:

- **Nordic hamstring curls** reduce hamstring injury risk by 51% (meta-analysis data). They also build eccentric hamstring strength that directly protects the ACL.
- **Romanian deadlifts** develop the hamstrings at long muscle lengths — the position where tears actually occur during sprinting and kicking
- **Glute-ham raises** combine hip extension and knee flexion, the two primary hamstring functions

## Full ROM Squatting Is Protective

Hartmann et al. (2013) dismantled the myth that deep squats harm knees:

- **Compressive forces peak at 90 degrees**, not at full depth. Going deeper actually distributes forces across more joint surface area.
- **Deep squats develop the posterior cruciate ligament** through progressive tensile loading. Half squats do not.
- **Articular cartilage adapts to loading.** Regular full-depth squatting increases cartilage thickness and resilience over time. Avoiding depth leaves cartilage thin and vulnerable.
- **Wrapping forces stabilize the knee** in deep flexion. The soft tissues behind the knee compress and create a natural "braking" mechanism that limits shear force.

**Practical application:** Squat as deep as your mobility allows with controlled form. Ass-to-grass is the goal, not parallel. Build depth gradually if mobility is limited — goblet squats are the entry point.

## ACL Injury Prevention for Fighters

Combat athletes face severe ACL risk. Pivoting during kicks, sudden direction changes, and takedown scrambles place enormous rotational stress on the knee. Hewett et al. (2005) developed and validated a neuromuscular prevention protocol that reduced ACL injuries by 72% in high-risk athletes:

### The Protocol (3x/week, 15 minutes)
1. **Single-leg balance work:** 3×30 seconds per leg on unstable surface, eyes open then closed
2. **Lateral bounds:** 3×8 per side, focusing on sticking the landing with knee over toe (not collapsing inward)
3. **Drop jumps with proper landing mechanics:** 3×5 from a 30 cm box, emphasizing soft landings with knees tracking over toes
4. **Single-leg Romanian deadlifts:** 3×8 per leg, developing eccentric hamstring control on one leg
5. **Perturbation training:** Partner pushes during single-leg stance, training reactive knee stability

**The key cue for all exercises:** Knee tracks over the second toe. Never let it collapse medially (valgus). This movement error is the primary mechanism of non-contact ACL tears.

## Patellar Tendinopathy Management

Lian et al. (2005) showed that patellar tendinopathy affects up to 45% of athletes in jumping and power sports. The evidence-based management protocol:

- **Heavy slow resistance training:** 4×8 squats at 70-80% 1RM with a 3-second eccentric, 3x/week. This is superior to eccentric-only protocols (Kongsgaard et al. 2009).
- **Isometric holds for acute pain relief:** 5×45-second single-leg wall sits at 70% effort. Provides immediate pain reduction lasting 45+ minutes — use pre-training.
- **Load management, not rest.** Tendons weaken with rest and strengthen with progressive load. Reduce total jumping and plyometric volume, but maintain heavy slow resistance work.
- **Monitor morning stiffness.** If the first 10 steps out of bed are painful, yesterday's training volume was too high. Reduce by 20%.

## The Bottom Line

- **Deep squats are protective, not harmful.** Compressive forces peak at 90 degrees; full depth distributes load and builds cartilage (Hartmann et al. 2013).
- **Build VMO strength** with full-depth squats, TKEs, step-downs, and split squats. Weak VMO means patellar tracking problems.
- **Hamstring-to-quad ratio must be ≥0.6.** Below this threshold, ACL injury risk increases 2.5x. Nordic curls are non-negotiable.
- **ACL prevention protocols reduce tear risk by 72%.** Single-leg balance, lateral bounds, drop jumps — 15 minutes, 3x/week.
- **Patellar tendinopathy responds to heavy slow resistance training**, not rest. Isometric holds provide acute pain relief before sessions.
- **Fighters:** Your sport demands constant pivoting and level changes. Knee preparation is career insurance, not optional accessory work.
`
  },
  {
    id: 'article-grip-endurance-grapplers',
    title: 'Grip Endurance for Grapplers: Beyond Farmer\'s Walks',
    tldr: 'Gi and no-gi grips demand different training — build sport-specific forearm endurance with targeted protocols, not generic grip work.',
    category: 'grappling',
    tags: ['grip strength', 'grappling', 'forearm endurance', 'injury prevention', 'BJJ', 'isometric training'],
    readTime: 5,
    publishedAt: new Date('2026-02-23'),
    source: 'Dias et al. 2012, Leyk et al. 2007, Cronin et al. 2017',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Train gi grip with sustained isometric holds and no-gi grip with rapid grip-release cycling — they are different',
      'Focus on endurance ratio over peak force — maintaining 40kg through a round beats peaking at 70kg then fading',
      'Include rice bucket work and wrist extensor training in every grip session to prevent medial epicondylitis',
      'Train grip 2-3x per week maximum on non-consecutive days — forearm tendons recover slowly',
    ],
    relatedArticleIds: ['article-grip-training', 'article-grappling-strength', 'article-grappling-conditioning', 'article-grappling-recovery'],
    applyCta: { label: 'Track grip strength', overlayId: 'grip_strength' },
    content: `
## The Grip Problem Nobody Trains Correctly

**Your forearms are the weakest link in your grappling chain, and farmer's walks won't fix them.** The grip demands of grappling are radically different from anything in conventional strength training. A 6-minute round of gi jiu-jitsu requires sustained isometric contractions at 40–60% of maximal voluntary contraction — repeated dozens of times with incomplete recovery. No barbell exercise replicates this.

## Gi vs No-Gi: Two Different Grip Worlds

Gi grappling is dominated by **isometric crushing grip** — grabbing fabric and holding on while your opponent tries to strip your grips. Dias et al. (2012) found that competitive gi grapplers maintain individual grip efforts for 3–12 seconds, accumulating 15–20 minutes of total grip work in a single match. This is sustained isometric endurance under fatigue.

No-gi grappling demands **dynamic grip** — wrist control, overhooks, underhooks, and collar ties that require constant adjustment. The forearm flexors and extensors work in rapid alternation rather than sustained contraction. Leyk et al. (2007) demonstrated that isometric and dynamic grip fatigue follow different physiological pathways, which means training one does not adequately prepare you for the other.

### The Practical Implication

If you train gi, your grip program must emphasize **sustained isometric holds at submaximal intensity**. If you train no-gi, you need **rapid grip-release cycling and wrist dexterity under fatigue**. Most grapplers do neither — they do deadlifts and hope for the best.

## Flexor Endurance vs Maximal Strength

Here's the distinction most fighters miss: **grip endurance and grip maximal strength are poorly correlated above a baseline threshold.** Cronin et al. (2017) showed that once an athlete can produce approximately 50 kg on a hand dynamometer, further maximal strength gains contribute minimally to repeated-effort grip performance. What matters is the percentage of max you can sustain over time — your **endurance ratio**.

A grappler who can crush 70 kg but fatigues to 30 kg after 90 seconds of repeated gripping is less effective than one who peaks at 55 kg but maintains 40 kg throughout a round.

## Sport-Specific Grip Protocols

### For Gi Grapplers
- **Dead hangs on a thick bar or gi draped over a pull-up bar:** 3–5 sets of max hold, rest 60 seconds. Target: 45+ seconds per set
- **Gi pull-ups:** 3 sets of 6–10 reps, gripping the gi lapel. Slow negatives (4 seconds)
- **Towel hangs:** Drape two towels over a bar, grip one in each hand, hang. Progress from two-hand to one-hand assisted

### For No-Gi Grapplers
- **Rapid grip cycling on a stress ball or grip trainer:** 30 seconds max reps, 30 seconds rest, 5 rounds
- **Wrist roller (both directions):** 3 sets to failure, emphasizing both flexion and extension
- **Plate pinch transfers:** Hold a 10 kg plate in a pinch grip, pass hand to hand for 60 seconds

### Universal
- **Rice bucket work:** Plunge hands into a deep bucket of rice and perform extension, flexion, and rotation movements. 3 minutes per session. This is the single best forearm prehab tool that exists.

## Forearm Recovery and Tendinopathy Prevention

Grapplers develop **medial epicondylitis** (golfer's elbow) at alarming rates. The mechanism is straightforward: repetitive high-load finger flexion without adequate extensor balance or recovery.

**Prevention protocol:**
- Train grip **2–3x per week maximum**, never on consecutive days
- Include **wrist extensor work** in every grip session — reverse wrist curls, band extensions, rice bucket
- If forearm soreness persists beyond 48 hours post-training, **reduce grip volume by 50%** before it becomes tendinopathy
- Eccentric wrist flexion exercises (Tyler twist protocol) at the first sign of medial elbow pain — do not train through it

**Frequency matters more than intensity.** Three moderate grip sessions per week beat one crushing session. The forearm flexor tendons have poor blood supply and recover slowly — respect this biology.

## The Bottom Line

- Gi and no-gi grips are **physiologically different** — train accordingly with isometric holds vs dynamic cycling
- After a baseline of ~50 kg crush strength, **endurance ratio matters more than peak force**
- Dead hangs, gi pull-ups, and towel work build sport-specific gi grip; plate pinches and rapid cycling build no-gi grip
- **Rice bucket work** is non-negotiable prehab for every grappler
- Train grip 2–3x/week max and always include **extensor work** to prevent medial epicondylitis
- If your forearms are the reason you lose grips in the later rounds, this is a trainable problem — but farmer's walks alone won't solve it
`
  },
  {
    id: 'article-sleep-architecture-athletes',
    title: 'Sleep Architecture for Athletes: Beyond "Get 8 Hours"',
    tldr: 'Sleep quality trumps quantity — understand sleep stages, optimize your environment, and use strategic napping to maximize recovery.',
    category: 'recovery',
    tags: ['sleep', 'recovery', 'performance', 'SWS', 'REM', 'napping', 'sleep hygiene'],
    readTime: 6,
    publishedAt: new Date('2026-02-23'),
    source: 'Mah et al. 2011, Watson 2017, Vitale et al. 2019',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Prioritize sleep timing — SWS (physical recovery) dominates the first half of night, REM (motor learning) the second',
      'Target sleep efficiency above 85% — time actually asleep matters more than total time in bed',
      'Keep bedroom at 65-68F, dim lights 90 minutes pre-bed, and maintain consistent timing within 30 minutes daily',
      'Use 20-minute or 90-minute naps only — avoid the 40-60 minute dead zone that causes severe grogginess',
    ],
    relatedArticleIds: ['article-sleep-performance', 'article-recovery-science', 'article-alcohol-performance', 'article-stress-management'],
    applyCta: { label: 'Check recovery', overlayId: 'recovery' },
    content: `
## Your Sleep Is Probably Broken (Even If You Get 8 Hours)

**Eight hours of fragmented, poorly-timed sleep is worse than six hours of consolidated, high-quality sleep.** The fitness industry reduced sleep to a single number — hours in bed — and ignored everything that actually drives recovery. Sleep is not a monolith. It's a precisely orchestrated sequence of neurological stages, each with distinct recovery functions. Screw up the architecture and the hours become meaningless.

## Sleep Stages and What They Actually Do

Your brain cycles through four stages roughly every 90 minutes:

### Stage N1–N2 (Light Sleep)
Transition stages. Heart rate drops, body temperature falls. These stages dominate early cycles and increase as total sleep extends. They serve a preparatory role but provide minimal direct recovery benefit.

### Stage N3 — Slow-Wave Sleep (SWS)
**This is where physical recovery happens.** Growth hormone secretion peaks during SWS — up to 75% of daily GH release occurs in these stages (Watson 2017). Tissue repair, glycogen resynthesis, and immune function restoration concentrate here. SWS dominates the first half of the night, which is why the hours before midnight matter disproportionately for athletes.

### REM Sleep
**This is where motor learning consolidates.** Mah et al. (2011) demonstrated that extended sleep in basketball players — allowing more REM cycles — improved sprint times by 4% and free throw accuracy by 9%. REM sleep replays and consolidates the technique work, sparring patterns, and movement sequences you practiced during the day. Cut REM short and yesterday's training partially evaporates. REM dominates the second half of the night, peaking in the final 2–3 hours.

### The Practical Takeaway
An athlete who goes to bed at midnight and wakes at 8am gets decent REM but suboptimal SWS timing. An athlete who sleeps 10pm–6am gets strong SWS in the first half and solid REM in the second. **Same duration, different recovery outcomes.**

## Why Quality Beats Quantity

Vitale et al. (2019) identified that **sleep efficiency** — the percentage of time in bed actually spent asleep — is a stronger predictor of next-day performance than total sleep time. An efficiency below 85% means you're spending too much time awake in bed, fragmenting your cycles.

**Common quality destroyers:**
- Alcohol (suppresses SWS by 20–40% even at moderate doses)
- Late caffeine (half-life is 5–6 hours — a 2pm coffee is still 25% active at midnight)
- Blue light after sunset (delays melatonin onset by 60–90 minutes)
- Irregular sleep timing (shifts your circadian phase, reducing SWS density)
- Warm bedroom temperature (core temp must drop 1–2°F to initiate deep sleep)

## Evidence-Based Sleep Optimization

### Temperature
The single most impactful environmental variable. Target **65–68°F (18–20°C)** in your bedroom. Your core temperature must decline to trigger SWS. A hot room fights this process directly. Consider a hot shower 90 minutes before bed — the subsequent rapid cooling actually accelerates the core temperature drop.

### Light
Dim lights 60–90 minutes before bed. Use blue-light blocking glasses if screens are unavoidable. Morning sunlight exposure within 30 minutes of waking is equally critical — it sets your circadian clock and ensures melatonin rises at the correct time later.

### Timing Consistency
Go to bed and wake up within a **30-minute window** every day, including weekends. Watson (2017) emphasized that circadian rhythm regularity is more impactful than occasional extra sleep. Sleeping in on weekends creates "social jet lag" that degrades Monday and Tuesday performance.

## Napping Protocols for Heavy Training Loads

Strategic naps are a legitimate performance tool, not a sign of laziness.

- **Power nap (20 min):** Stage N1–N2 only. Improves alertness and reaction time without sleep inertia. Ideal between training sessions.
- **Full cycle nap (90 min):** Completes one full sleep cycle including SWS and REM. Best for athletes in heavy training blocks or those sleeping less than 7 hours at night. Time it before 3pm to avoid disrupting nighttime sleep.
- **Avoid 40–60 minute naps.** You'll wake mid-SWS with severe grogginess that lasts 30+ minutes.

## Sleep Tracking: What Actually Matters

Consumer wearables cannot accurately measure individual sleep stages — don't obsess over your "deep sleep" percentage. What they CAN reliably track:

- **Total sleep time** — aim for 7–9 hours for most athletes
- **Sleep efficiency** — target 85%+ (time asleep / time in bed)
- **Sleep timing consistency** — standard deviation of bedtime should be under 30 minutes
- **Resting heart rate trends** — elevated RHR during sleep signals incomplete recovery

Ignore the stage breakdowns. Focus on the metrics above and how you feel during your first training session of the day.

## The Bottom Line

- SWS drives **physical recovery** (first half of night); REM drives **motor learning** (second half). You need both.
- Sleep **efficiency above 85%** matters more than raw hours
- Bedroom at **65–68°F**, lights dimmed 90 minutes pre-bed, consistent timing within 30 minutes daily
- **20-minute or 90-minute naps** only — avoid the 40–60 minute dead zone
- Track total time, efficiency, and timing consistency — ignore consumer-grade stage data
- Alcohol is the single biggest sleep quality destroyer that athletes routinely underestimate
`
  },
  {
    id: 'article-visualization-motor-imagery',
    title: 'Visualization and Motor Imagery in Combat Sports',
    tldr: 'Mental rehearsal activates the same motor circuits as physical practice — structured visualization measurably improves technique and competition performance.',
    category: 'motivation',
    tags: ['visualization', 'motor imagery', 'mental training', 'PETTLEP', 'combat sports', 'competition prep'],
    readTime: 5,
    publishedAt: new Date('2026-02-23'),
    source: 'Jeannerod 2001, Holmes & Collins 2001, Ridderinkhof & Brass 2015',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Use the PETTLEP model for motor imagery: match physical state, environment, task, timing, learning stage, emotion, and first-person perspective',
      'Visualize process over outcomes and include adversity responses — rehearse getting hit, not just hitting',
      'Practice 5-10 minutes of specific real-time visualization before competition for measurable performance gains',
      'Use 3 daily 10-minute imagery sessions during injury layoffs to retain 50-70% of motor skill degradation',
    ],
    relatedArticleIds: ['article-mental-toughness', 'article-motivation-consistency', 'article-combat-sport-periodization'],
    content: `
## Your Brain Can't Tell the Difference

**When you vividly imagine throwing a rear cross, your motor cortex fires in the same pattern as when you actually throw it.** This isn't motivational fluff — it's functional neuroanatomy. Jeannerod (2001) demonstrated through fMRI studies that motor imagery activates the premotor cortex, supplementary motor area, and cerebellum with remarkable overlap to actual movement execution. The primary difference is downstream inhibition preventing the muscles from contracting. The neural rehearsal, however, is real.

Ridderinkhof & Brass (2015) expanded on this, showing that repeated mental practice strengthens the same synaptic pathways as physical repetitions — albeit at roughly 50–70% of the magnitude. This means visualization is not a replacement for training, but it is a legitimate supplement that stacks on top of physical practice.

## The PETTLEP Model: Visualization That Actually Works

Most athletes "visualize" by vaguely imagining winning. This is daydreaming, not training. Holmes & Collins (2001) developed the **PETTLEP model** — a framework for motor imagery that maximizes neural overlap with real performance:

- **P — Physical:** Adopt the physical position you'd be in during the skill. Stand in your fighting stance. Wear your training gear. Physical state affects imagery quality.
- **E — Environment:** Visualize in an environment that matches competition. If possible, practice imagery at the venue. At minimum, use video or audio from competition settings.
- **T — Task:** Imagine the specific task at the correct difficulty. Don't just imagine a takedown — imagine a specific setup against a resisting opponent at your competition level.
- **T — Timing:** Perform the imagery in **real time**. Slow-motion imagery activates different neural patterns. Your mental double-leg should take exactly as long as your physical one.
- **L — Learning:** Update your imagery as your skills improve. If you've refined your jab setup, your visualization must reflect the current version, not last month's.
- **E — Emotion:** Include the emotional state of competition — the adrenaline, the crowd noise, the pressure. Emotionally flat imagery has significantly less transfer.
- **P — Perspective:** First-person (internal) imagery is generally superior for motor tasks. See through your own eyes, not as a spectator watching yourself.

## Pre-Competition Visualization Protocol

Use this structured approach in the 48 hours before competition:

### Day Before
- **10 minutes, evening:** Visualize your warm-up routine, walking to the mat/ring, and the first 30 seconds of competition. Focus on feeling **calm, controlled, and aggressive.** Run through 3–5 specific techniques you plan to implement, each in real-time with full PETTLEP elements.

### Competition Day
- **5 minutes during warm-up:** Eyes closed, standing in stance. Visualize your game plan's first two exchanges. Feel the grip, the distance, the timing. Include the crowd noise and referee commands.
- **Between rounds/matches:** Brief 30-second visualizations of specific adjustments. "I will underhook left side, snap down, front headlock." Precise, time-accurate, first-person.

### What to Visualize
- **Process, not outcomes.** Don't imagine the referee raising your hand. Imagine executing the ankle pick that leads to the finish. Outcome imagery creates anxiety; process imagery builds confidence.
- **Adversity responses.** Visualize getting taken down and immediately executing your recovery sequence. Visualize getting rocked and clinching effectively. Rehearsing responses to adversity is more valuable than imagining everything going perfectly.

## Technique Rehearsal During Injury Layoffs

This is where visualization's value becomes undeniable. Athletes sidelined with injuries who perform structured motor imagery **retain significantly more skill** than those who simply rest.

**Protocol for injured athletes:**
- 3 sessions per day, 10 minutes each
- Use PETTLEP framework in full
- Focus on the techniques most at risk of degradation — complex sequences, timing-dependent skills
- Include conditioning imagery: visualize the fatigue state of late rounds and executing technique under duress

Multiple studies confirm that athletes returning from injury with consistent imagery practice require **30–50% less time** to return to pre-injury skill levels compared to controls.

## The Bottom Line

- Motor imagery activates the **same neural circuits** as physical practice at 50–70% magnitude — this is neuroscience, not wishful thinking
- Use the **PETTLEP model**: match physical state, environment, task difficulty, real-time speed, current skill level, competitive emotion, and first-person perspective
- Visualize **process over outcomes** and include **adversity responses** — rehearse getting hit, not just hitting
- Pre-competition imagery should be **5–10 minutes**, highly specific, in real-time
- During injury layoffs, **3 daily sessions of 10 minutes** significantly preserve motor skill
- The best fighters in the world do this systematically — the rest think it's soft
`
  },
  {
    id: 'article-female-athlete-menstrual-cycle',
    title: 'Female Athlete Considerations: Training Through the Menstrual Cycle',
    tldr: 'Hormonal fluctuations across the menstrual cycle affect performance — smart programming adjustments (not overhauls) can optimize training outcomes.',
    category: 'general_fitness',
    tags: ['female athletes', 'menstrual cycle', 'hormones', 'periodization', 'RED-S', 'programming'],
    readTime: 6,
    publishedAt: new Date('2026-02-23'),
    source: 'McNulty et al. 2020, Sung et al. 2014, Mountjoy et al. 2018',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Schedule heavy strength sessions and PRs during the late follicular phase (days 8-14) when possible',
      'Reduce training volume by 10-15% in the luteal phase if recovery feels impaired',
      'Treat a lost menstrual cycle as RED-S until proven otherwise — increase caloric intake immediately',
      'Track your own patterns for 3-4 cycles before making programming changes — individual variation is massive',
    ],
    relatedArticleIds: ['article-women-nutrition', 'article-cutting-guide', 'article-training-longevity'],
    content: `
## The Research Gap That's Costing Female Athletes

**Until 2010, fewer than 6% of sport science studies included female participants.** The entire foundation of training theory — periodization, recovery timelines, nutritional recommendations — was built on male physiology. Female athletes have been training on borrowed science, and it shows. The menstrual cycle creates a recurring hormonal environment that measurably affects strength, power, recovery, and injury risk. Ignoring it isn't "treating everyone equally" — it's leaving performance on the table.

## Follicular vs Luteal Phase Physiology

The menstrual cycle averages 28 days (range: 21–35) and divides into two primary phases:

### Follicular Phase (Days 1–14)
Begins with menstruation. Estrogen rises progressively, peaking just before ovulation around day 14. Progesterone remains low. This hormonal environment is associated with:
- **Higher pain tolerance** and improved recovery from muscle damage
- **Greater force production capacity** — estrogen has anabolic properties and enhances neuromuscular function
- **Better insulin sensitivity** — carbohydrate utilization is more efficient
- **Lower core temperature** — thermoregulation during training is easier

### Luteal Phase (Days 15–28)
Post-ovulation. Progesterone rises sharply and estrogen has a secondary, smaller peak. This environment produces:
- **Elevated core temperature** by 0.3–0.5°C — heat dissipation is slightly impaired
- **Increased protein catabolism** — progesterone is mildly catabolic
- **Shifted fuel utilization** toward fat oxidation, reduced carbohydrate efficiency
- **Greater perceived exertion** at the same workloads
- **Increased ligament laxity** — ACL injury risk peaks during the late luteal/early follicular transition (Sung et al. 2014)

## Strength and Power Across the Cycle

McNulty et al. (2020) conducted a meta-analysis of 78 studies examining exercise performance across menstrual cycle phases. Key findings:

- **Strength and power are modestly but significantly higher in the mid-to-late follicular phase** (effect size: 0.07–0.15). This is small but real.
- **The early follicular phase (menstruation, days 1–5) shows the most variable performance.** Some women perform normally; others experience significant decrements from pain, fatigue, and low hormone levels.
- **Luteal phase performance is not catastrophically impaired** — the average reduction is 3–5%, mostly in maximal efforts. Submaximal training is minimally affected.

### What This Means Practically
The follicular phase is a slightly better window for **PRs, intensity peaks, and heavy singles**. The luteal phase is better suited for **volume accumulation, technique work, and moderate-intensity training**. But these are optimizations, not rules — individual variation is enormous.

## Practical Programming Adjustments (Not Overhauls)

The goal is **small, evidence-based modifications** — not restructuring your entire program around your cycle.

### Late Follicular Phase (Days 8–14) — Push Performance
- Schedule **heavy strength sessions, 1RM attempts, and high-intensity intervals** here when possible
- Capitalize on improved neuromuscular function and recovery capacity
- Higher carbohydrate intake supports the favorable insulin sensitivity

### Luteal Phase (Days 15–28) — Manage Load
- **Maintain training intensity but consider reducing total volume by 10–15%** if recovery feels impaired
- Slightly increase protein intake (additional 5–10g/day) to offset progesterone's catabolic effects
- Increase sodium and fluid intake to compensate for elevated core temperature
- **Do not skip training** — the performance decrements are small and the psychological benefits of consistency outweigh the marginal physiological costs

### Menstruation (Days 1–5) — Listen and Adjust
- **Train normally if you feel normal.** Many athletes perform well during menstruation.
- If cramps or fatigue are significant, reduce intensity by one tier (e.g., heavy to moderate) rather than skipping entirely
- NSAIDs (ibuprofen) taken pre-training effectively manage menstrual pain without impairing training adaptations at standard doses
- Iron-rich foods or supplementation during heavy flow prevents the gradual hemoglobin decline that sabotages endurance over months

## RED-S: The Danger of Under-Fueling

Relative Energy Deficiency in Sport (RED-S), formally defined by Mountjoy et al. (2018), occurs when energy intake chronically fails to meet training expenditure. Female athletes are disproportionately affected, and the consequences extend far beyond weight loss:

- **Menstrual dysfunction** — cycle irregularity or amenorrhea (loss of period) is the most visible warning sign
- **Bone stress injuries** — low estrogen from amenorrhea directly impairs bone mineral density. Stress fractures become 2–4x more likely
- **Impaired training adaptation** — the body downregulates protein synthesis, glycogen storage, and immune function
- **Cardiovascular compromise** — endothelial dysfunction and unfavorable lipid profiles emerge within months

**If your period disappears, this is not a sign of fitness.** It is a clinical red flag indicating insufficient energy availability. The threshold is typically below 30 kcal/kg of fat-free mass per day. The solution is increasing caloric intake, not reducing training.

## The Bottom Line

- The follicular phase (days 1–14) generally favors **peak strength and power output**; the luteal phase favors **volume and moderate work**
- Performance differences between phases average **3–5%** — meaningful for optimization, not an excuse to skip training
- Adjust **volume down 10–15% in the luteal phase** if recovery is impaired; push **intensity in the late follicular phase**
- Individual variation is massive — **track your own patterns** for 3–4 cycles before making programming changes
- **Lost menstrual cycle = RED-S until proven otherwise.** Increase calories, consult a sports medicine professional
- Female athletes deserve evidence-based programming, not male protocols with pink branding
`
  },
  {
    id: 'article-rpe-autoregulation',
    title: 'RPE and Autoregulation: Training by Feel, Backed by Science',
    tldr: 'RPE and RIR give athletes a systematic way to adjust training intensity in real-time — matching the plan to the day instead of forcing the day to match the plan.',
    category: 'periodization',
    tags: ['RPE', 'RIR', 'autoregulation', 'programming', 'periodization', 'fatigue management'],
    readTime: 5,
    publishedAt: new Date('2026-02-23'),
    source: 'Helms et al. 2016, Zourdos et al. 2016, Hackett et al. 2012',
    difficulty: 'intermediate',
    keyTakeaways: [
      'Use RPE 8 (2 RIR) as the sweet spot for most working sets — stimulative without excessive fatigue',
      'Calibrate RPE accuracy over 4-6 weeks of honest practice before relying on it for programming',
      'Cap RPE at 8.5 during fight camp and use daily readiness ratings to adjust targets',
      'Track RPE-to-load relationships over time — declining loads at the same RPE signals accumulated fatigue',
    ],
    relatedArticleIds: ['article-autoregulation', 'article-combat-sport-periodization', 'article-concurrent-training', 'article-stress-management'],
    applyCta: { label: 'View your program', overlayId: 'periodization' },
    content: `
## Your Program Is Wrong on Any Given Day

**A percentage-based program assumes your 1RM is constant. It isn't.** On any given training day, your true maximal capacity fluctuates by 5–15% based on sleep quality, nutrition, psychological stress, accumulated fatigue, and training history. A program that prescribes 85% of your tested 1RM might be 80% on a great day and 92% on a terrible one. Autoregulation solves this by adjusting intensity to your actual capacity in real time.

## The RPE Scale for Resistance Training

The original Borg RPE scale (6–20) was designed for cardiovascular exercise. The modified RPE scale for resistance training, popularized by Mike Tuchscherer and validated by Zourdos et al. (2016), simplifies this to a 1–10 scale anchored to proximity to failure:

| RPE | Description |
|-----|------------|
| 10 | Maximum effort. No reps left. Failure. |
| 9.5 | Could not do more reps, but could add slight load |
| 9 | 1 rep remaining (could do 1 more) |
| 8.5 | 1–2 reps remaining (definitely 1, maybe 2) |
| 8 | 2 reps remaining |
| 7.5 | 2–3 reps remaining |
| 7 | 3 reps remaining |
| 6 | 4+ reps remaining (light effort) |

Helms et al. (2016) demonstrated that trained lifters can accurately estimate RPE within 0.5 points after 4–6 weeks of practice. Untrained lifters tend to overestimate effort — they think RPE 8 when it's actually RPE 6. **Calibration requires practice.**

## RIR: The Practical Translation

Reps in Reserve (RIR) is the inverse of RPE and often more intuitive: RPE 8 = 2 RIR. Asking "how many reps could I have done?" is easier for most athletes than assigning a number on a scale.

Zourdos et al. (2016) found that **RIR-based training produced equivalent or superior strength gains** compared to percentage-based programming over 8-week blocks, primarily because it prevented both under-stimulation on good days and overreaching on bad days.

### How to Use RIR in Practice
- **Hypertrophy work:** Target 1–3 RIR (RPE 7–9). This keeps sets stimulative without excessive fatigue accumulation
- **Strength work:** Target 1–2 RIR (RPE 8–9) for working sets. Hit RPE 9.5–10 only on test days
- **Power and speed work:** Target 3–5 RIR (RPE 5–7). Power output drops sharply near failure — grinding reps trains the wrong quality

## When to Autoregulate vs Stick to the Plan

Autoregulation is powerful but not universally appropriate. Hackett et al. (2012) outlined conditions where each approach excels:

### Autoregulate When:
- **Daily readiness varies significantly** — athletes with irregular schedules, high life stress, or concurrent sport demands (combat athletes training skill + strength)
- **Training age is intermediate or advanced** — you have the self-awareness to rate effort accurately
- **During intensification phases** — when loads are heavy and the cost of overshooting is injury or CNS burnout
- **Returning from illness, travel, or disrupted sleep** — your percentage-based numbers are temporarily meaningless

### Stick to the Plan When:
- **You're a beginner** — you don't yet know what "2 reps in reserve" feels like. Use fixed progressions until you build calibration
- **During volume accumulation phases** — RPE-based volume tends to undershoot because athletes avoid discomfort. Fixed set/rep schemes ensure minimum effective volume
- **Peaking for competition** — the final 2–3 weeks before a meet or fight should follow a predetermined taper, not daily autoregulation

## RPE for Combat Athletes: The Unique Challenge

Combat athletes face a problem that pure lifters don't: **strength training exists alongside skill training, sparring, and conditioning.** A fighter who sparred hard on Tuesday walks into Wednesday's squat session with accumulated fatigue that a percentage-based program cannot account for.

**Practical framework for combat athletes:**

1. **Rate daily readiness before the session.** A simple 1–5 scale: 1 = terrible, 5 = fully recovered. If readiness is 1–2, drop working RPE targets by 1 point (e.g., RPE 8 becomes RPE 7).
2. **Cap RPE at 8.5 during fight camp.** Grinding out RPE 10 sets while simultaneously sparring 3x per week is a recipe for overtraining. Leave the max-effort work for off-season strength blocks.
3. **Use RPE to manage session duration.** If your first working set is RPE 9 when it should be RPE 7, that's a signal. Reduce volume by 20–30% and leave. The sparring and skill work take priority — strength training supports the sport, it doesn't override it.
4. **Track RPE-to-load relationships over time.** If your squat at RPE 8 drops from 140 kg to 125 kg over three weeks, cumulative fatigue is winning. Deload or reduce non-lifting training volume.

## The Bottom Line

- Your true daily max fluctuates **5–15%** — percentage-based programs can't account for this
- RPE 8 (2 RIR) is the sweet spot for most working sets: stimulative without excessive fatigue
- **Calibration takes 4–6 weeks** of honest practice — beginners should use fixed percentages until then
- Autoregulate during **high-stress periods and intensification**; follow fixed plans during **volume accumulation and peaking**
- Combat athletes should **cap RPE at 8.5 during fight camp** and use readiness ratings to adjust daily targets
- Track your RPE-to-load relationship over time — declining loads at the same RPE is the earliest warning of accumulated fatigue
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
    body: 'Muscle protein synthesis stays elevated for 24-48 hours post-training. The post-workout window is 2-4 hours, not 30 minutes (Ribeiro et al. 2023). Total daily protein matters far more than timing.',
    category: 'muscle_science',
    context: ['post_workout', 'lift_day'],
    tags: ['protein', 'recovery', 'myth-busting'],
    source: 'Ribeiro et al. 2023; Schoenfeld & Aragon, 2018'
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
// ── Learning Paths ──────────────────────────────────────────────────────────
// Curated article sequences — guided learning journeys through the knowledge base.

export const learningPaths: LearningPath[] = [
  {
    id: 'path-combat-fundamentals',
    title: 'Combat Athlete Fundamentals',
    description: 'Essential knowledge for every fighter',
    icon: '🥊',
    articleIds: [
      'article-hypertrophy-science',
      'article-strength-adaptations',
      'article-grappling-strength',
      'article-recovery-science',
      'article-nutrition-fundamentals',
      'article-sleep-performance',
      'article-mental-toughness',
      'article-combat-sport-periodization',
    ],
    difficulty: 'beginner',
  },
  {
    id: 'path-nutrition-mastery',
    title: 'Nutrition Mastery',
    description: 'From fundamentals to fight-week fueling',
    icon: '🍎',
    articleIds: [
      'article-nutrition-fundamentals',
      'article-cutting-guide',
      'article-bulking-guide',
      'article-women-nutrition',
      'article-creatine',
      'article-caffeine',
      'article-alcohol-performance',
    ],
    difficulty: 'intermediate',
  },
  {
    id: 'path-recovery-science',
    title: 'Recovery Science',
    description: 'Optimize rest, sleep, and adaptation',
    icon: '😴',
    articleIds: [
      'article-recovery-science',
      'article-sleep-performance',
      'article-sleep-architecture-athletes',
      'article-cold-exposure',
      'article-overtraining-vs-underrecovery',
      'article-stress-management',
    ],
    difficulty: 'intermediate',
  },
  {
    id: 'path-grappling-performance',
    title: 'Grappling Performance',
    description: 'Strength, grip, and conditioning for the mat',
    icon: '🥋',
    articleIds: [
      'article-grappling-strength',
      'article-grip-training',
      'article-grip-endurance-grapplers',
      'article-undulating-periodization',
      'article-grappling-conditioning',
      'article-grappling-recovery',
    ],
    difficulty: 'intermediate',
  },
  {
    id: 'path-fight-camp',
    title: 'Fight Camp Blueprint',
    description: 'Peak performance for competition day',
    icon: '⚡',
    articleIds: [
      'article-combat-sport-periodization',
      'article-energy-system-development',
      'article-fight-week-protocol',
      'article-mma-weight-management',
      'article-mental-toughness',
      'article-visualization-motor-imagery',
    ],
    difficulty: 'advanced',
  },
];

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
