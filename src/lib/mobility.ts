import { v4 as uuidv4 } from 'uuid';
import {
  MobilityRoutine,
  MobilityExercise,
  MobilityFocus,
  WorkoutSession,
  ExercisePrescription,
  EquipmentType
} from './types';

// Mobility & Deload module for Grappler Gains
// Provides structured mobility routines, deload session generation,
// and active recovery sessions tailored for grapplers who lift.

// --- Mobility Routines ---

/**
 * Returns a library of 8 mobility routines covering grappling-specific needs,
 * general joint health, and pre/post training protocols.
 */
export function getMobilityRoutines(): MobilityRoutine[] {
  return [
    // 1. Grappler's Hip Opener
    {
      id: uuidv4(),
      name: "Grappler's Hip Opener",
      focus: ['hips'] as MobilityFocus[],
      duration: 15,
      forGrapplers: true,
      exercises: [
        {
          name: '90/90 Hip Switch',
          duration: 60,
          sets: 3,
          description:
            'Sit with both legs at 90 degrees. Rotate hips to switch sides, keeping torso tall. ' +
            'Hold each side briefly before switching.',
          breathingCue: 'Exhale as you rotate to each side. Inhale in the middle position.'
        },
        {
          name: 'Deep Squat Hold with Rotation',
          duration: 45,
          sets: 3,
          description:
            'Drop into a deep squat. Place one hand on the ground and reach the other toward the ceiling, ' +
            'rotating through the thoracic spine. Alternate sides.',
          breathingCue: 'Inhale at the bottom, exhale as you rotate and reach.'
        },
        {
          name: 'Pigeon Stretch',
          duration: 60,
          sets: 2,
          description:
            'From a kneeling position, bring one shin across your body at roughly 45 degrees. ' +
            'Sink hips toward the floor. Keep hips square. Hold each side.',
          breathingCue: 'Slow, deep breaths. Exhale to sink deeper into the stretch.'
        },
        {
          name: 'Cossack Squat Flow',
          duration: 45,
          sets: 3,
          description:
            'Wide stance, shift weight side to side into a deep lateral squat. Keep the trailing leg straight ' +
            'with toes pointed up. Flow continuously.',
          breathingCue: 'Inhale in the center, exhale as you sit into each side.'
        },
        {
          name: 'Hip Flexor Couch Stretch',
          duration: 60,
          sets: 2,
          description:
            'Rear foot elevated on a wall or bench, front foot flat. Drive hips forward into a deep hip flexor stretch. ' +
            'Squeeze the rear glute to deepen the stretch.',
          breathingCue: 'Breathe into the front of the hip. Long exhales to release tension.'
        },
        {
          name: 'Frog Stretch',
          duration: 45,
          sets: 2,
          description:
            'On all fours, spread knees wide with feet turned out. Slowly rock hips back toward heels, ' +
            'then forward. Feel the stretch in the inner thighs and groin.',
          breathingCue: 'Exhale as you rock back, inhale as you rock forward.'
        }
      ]
    },

    // 2. Shoulder Rescue
    {
      id: uuidv4(),
      name: 'Shoulder Rescue',
      focus: ['shoulders'] as MobilityFocus[],
      duration: 12,
      forGrapplers: true,
      exercises: [
        {
          name: 'Wall Slides',
          duration: 45,
          sets: 3,
          description:
            'Stand with back against a wall. Arms in a "W" shape against the wall. Slowly slide arms up ' +
            'to a "Y" position and back down, maintaining contact with the wall.',
          breathingCue: 'Inhale as you slide up, exhale as you slide down.'
        },
        {
          name: 'Thread the Needle',
          duration: 45,
          sets: 3,
          description:
            'On all fours, reach one arm under your body toward the opposite side while the other arm stays planted. ' +
            'Rotate through the thoracic spine. Alternate sides.',
          breathingCue: 'Exhale as you thread through, inhale as you open back up.'
        },
        {
          name: 'Band Pull-Aparts',
          duration: 30,
          sets: 3,
          description:
            'Hold a light band at arm length. Pull it apart by squeezing the shoulder blades together. ' +
            'Control the return. Focus on rear delt and external rotator activation.',
          breathingCue: 'Exhale as you pull apart, inhale on the return.'
        },
        {
          name: 'Sleeper Stretch',
          duration: 45,
          sets: 2,
          description:
            'Lie on your side with the bottom arm at 90 degrees in front of you. Use the top hand to gently ' +
            'press the bottom hand toward the floor, stretching the posterior shoulder.',
          breathingCue: 'Slow breaths. Exhale to gently increase pressure.'
        },
        {
          name: 'Cross-Body Shoulder Stretch',
          duration: 30,
          sets: 2,
          description:
            'Pull one arm across your chest at shoulder height using the opposite hand. ' +
            'Hold and feel the stretch in the rear deltoid and posterior capsule.',
          breathingCue: 'Breathe normally. Exhale to gently deepen the stretch.'
        }
      ]
    },

    // 3. Full Body Flow
    {
      id: uuidv4(),
      name: 'Full Body Flow',
      focus: ['full_body'] as MobilityFocus[],
      duration: 20,
      forGrapplers: false,
      exercises: [
        {
          name: 'Cat-Cow',
          duration: 45,
          sets: 3,
          description:
            'On all fours, alternate between arching the back (cow) and rounding it (cat). ' +
            'Move slowly and deliberately through each position.',
          breathingCue: 'Inhale into cow (arch), exhale into cat (round).'
        },
        {
          name: "World's Greatest Stretch",
          duration: 60,
          sets: 3,
          description:
            'Lunge forward, place both hands inside the front foot. Rotate the inside arm up toward the ceiling. ' +
            'Return hand to floor, then push hips back to straighten the front leg. Alternate sides.',
          breathingCue: 'Exhale as you rotate up, inhale as you return.'
        },
        {
          name: 'Inchworm',
          duration: 45,
          sets: 3,
          description:
            'Stand tall, hinge at the hips, walk hands out to a plank. Perform a push-up if desired. ' +
            'Walk feet toward hands and stand. Repeat.',
          breathingCue: 'Exhale walking out, inhale walking back.'
        },
        {
          name: 'Scorpion Stretch',
          duration: 45,
          sets: 2,
          description:
            'Lie face down, arms out to the sides. Lift one leg and rotate it across the body toward the opposite hand. ' +
            'Feel the stretch through the hip flexor and thoracic spine.',
          breathingCue: 'Exhale as you rotate across, inhale to return.'
        },
        {
          name: 'Downward Dog to Cobra Flow',
          duration: 45,
          sets: 3,
          description:
            'From downward dog, shift forward through a plank into cobra/upward dog. ' +
            'Push back to downward dog. Flow continuously.',
          breathingCue: 'Inhale into cobra, exhale back to downward dog.'
        },
        {
          name: 'Standing Side Bend',
          duration: 30,
          sets: 2,
          description:
            'Stand with feet shoulder-width apart. Reach one arm overhead and lean to the opposite side. ' +
            'Feel the stretch through the obliques and lats. Hold each side.',
          breathingCue: 'Inhale to reach tall, exhale to lean and stretch.'
        },
        {
          name: 'Supine Twist',
          duration: 45,
          sets: 2,
          description:
            'Lie on your back, pull one knee to chest and let it fall across the body to the opposite side. ' +
            'Keep both shoulders on the ground. Hold each side.',
          breathingCue: 'Deep breaths. Exhale to allow the knee to sink deeper.'
        }
      ]
    },

    // 4. Pre-Training Primer
    {
      id: uuidv4(),
      name: 'Pre-Training Primer',
      focus: ['hips', 'shoulders', 'thoracic'] as MobilityFocus[],
      duration: 10,
      forGrapplers: false,
      exercises: [
        {
          name: 'Arm Circles (forward and backward)',
          duration: 30,
          sets: 2,
          description:
            'Stand tall and make large circles with both arms. 15 seconds forward, 15 seconds backward. ' +
            'Progressively increase the range of motion.',
          breathingCue: 'Breathe naturally. Keep breathing steady.'
        },
        {
          name: 'Leg Swings (front-to-back and lateral)',
          duration: 30,
          sets: 2,
          description:
            'Hold onto a wall or rack. Swing one leg forward and back, then side to side. ' +
            'Keep the core engaged. 15 swings each direction per leg.',
          breathingCue: 'Exhale on the forward/outward swing.'
        },
        {
          name: 'Hip Circles',
          duration: 30,
          sets: 2,
          description:
            'Stand on one leg. Make large circles with the other knee, opening and closing the hip. ' +
            'Perform in both directions. Switch legs.',
          breathingCue: 'Breathe naturally. Focus on control, not speed.'
        },
        {
          name: 'Thoracic Rotation on All Fours',
          duration: 30,
          sets: 3,
          description:
            'On all fours, place one hand behind the head. Rotate the elbow down toward the opposite hand, ' +
            'then rotate up toward the ceiling. Alternate sides.',
          breathingCue: 'Exhale as you rotate up and open the chest.'
        },
        {
          name: 'Bodyweight Squat with Pause',
          duration: 30,
          sets: 2,
          description:
            'Perform slow bodyweight squats. Pause for 2-3 seconds at the bottom, pushing knees out. ' +
            'Use this to open up the hips and ankles before training.',
          breathingCue: 'Inhale on the way down, exhale to stand.'
        }
      ]
    },

    // 5. Post-Training Cooldown
    {
      id: uuidv4(),
      name: 'Post-Training Cooldown',
      focus: ['full_body'] as MobilityFocus[],
      duration: 10,
      forGrapplers: false,
      exercises: [
        {
          name: 'Standing Forward Fold',
          duration: 45,
          sets: 2,
          description:
            'Stand with feet hip-width. Fold forward from the hips, letting the head and arms hang. ' +
            'Bend the knees slightly if needed. Gently sway side to side.',
          breathingCue: 'Slow exhales to sink deeper. Let gravity do the work.'
        },
        {
          name: 'Quadriceps Stretch (standing)',
          duration: 30,
          sets: 2,
          description:
            'Stand on one leg, grab the opposite ankle and pull the heel toward the glute. ' +
            'Keep the knees together and squeeze the glute on the stretching side.',
          breathingCue: 'Breathe steadily. Exhale to pull gently deeper.'
        },
        {
          name: 'Doorway or Band Chest Stretch',
          duration: 30,
          sets: 2,
          description:
            'Place forearm against a doorway or wrap a band around a post. Lean forward to stretch the pec ' +
            'and front shoulder. Adjust arm height to target different fibers.',
          breathingCue: 'Exhale as you lean in. Inhale to reset slightly.'
        },
        {
          name: 'Seated Hamstring Stretch',
          duration: 45,
          sets: 2,
          description:
            'Sit on the floor with one leg extended, the other bent. Reach toward the extended foot, ' +
            'hinging from the hips rather than rounding the back.',
          breathingCue: 'Exhale to reach further. Avoid bouncing.'
        },
        {
          name: "Child's Pose",
          duration: 60,
          sets: 1,
          description:
            'Kneel on the floor, sit back on your heels, and extend your arms forward on the ground. ' +
            'Let the forehead rest on the floor. Relax completely.',
          breathingCue: 'Deep belly breaths. 4 seconds in, 6 seconds out.'
        }
      ]
    },

    // 6. Neck & Wrist Care
    {
      id: uuidv4(),
      name: 'Neck & Wrist Care',
      focus: ['neck', 'wrists'] as MobilityFocus[],
      duration: 8,
      forGrapplers: true,
      exercises: [
        {
          name: 'Neck CARs (Controlled Articular Rotations)',
          duration: 45,
          sets: 2,
          description:
            'Slowly rotate the head in a full circle, making the largest pain-free range possible. ' +
            'Go clockwise, then counter-clockwise. Keep shoulders relaxed.',
          breathingCue: 'Breathe continuously. Do not hold your breath.'
        },
        {
          name: 'Neck Lateral Flexion Stretch',
          duration: 30,
          sets: 2,
          description:
            'Tilt the head toward one shoulder. Use the same-side hand to apply very gentle pressure. ' +
            'Keep the opposite shoulder pulled down. Hold each side.',
          breathingCue: 'Exhale to gently deepen the stretch. Never force.'
        },
        {
          name: 'Wrist Circles',
          duration: 30,
          sets: 2,
          description:
            'Make fists and slowly rotate the wrists in large circles. 15 seconds in each direction. ' +
            'Focus on smooth, full range-of-motion circles.',
          breathingCue: 'Breathe normally.'
        },
        {
          name: 'Wrist Flexor/Extensor Stretch',
          duration: 30,
          sets: 3,
          description:
            'Extend one arm, palm up. Use the other hand to gently pull fingers toward the floor (flexor stretch). ' +
            'Then flip palm down and pull fingers back (extensor stretch). Alternate.',
          breathingCue: 'Exhale into each stretch position.'
        },
        {
          name: 'Finger Extensor Band Work',
          duration: 30,
          sets: 3,
          description:
            'Place a rubber band around all five fingertips. Open the hand against the resistance of the band. ' +
            'This counteracts the constant gripping in grappling.',
          breathingCue: 'Breathe naturally. Focus on full finger extension.'
        },
        {
          name: 'Prayer Stretch (wrist flexion)',
          duration: 30,
          sets: 2,
          description:
            'Press palms together in a prayer position in front of the chest. Slowly lower hands while ' +
            'keeping palms together to increase the stretch on the wrist flexors.',
          breathingCue: 'Slow exhale as you lower the hands.'
        }
      ]
    },

    // 7. Thoracic Spine Opener
    {
      id: uuidv4(),
      name: 'Thoracic Spine Opener',
      focus: ['thoracic'] as MobilityFocus[],
      duration: 12,
      forGrapplers: false,
      exercises: [
        {
          name: 'Foam Roller Thoracic Extension',
          duration: 45,
          sets: 3,
          description:
            'Lie on a foam roller positioned across the upper back. Support the head with both hands. ' +
            'Gently extend over the roller, segment by segment, moving the roller up and down the thoracic spine.',
          breathingCue: 'Exhale as you extend over the roller. Inhale to return.'
        },
        {
          name: 'Open Book Rotation',
          duration: 45,
          sets: 3,
          description:
            'Lie on your side, knees stacked and bent to 90 degrees. Top arm reaches over and behind you, ' +
            'opening the chest toward the ceiling. Follow the hand with your eyes.',
          breathingCue: 'Exhale to rotate open, inhale to close.'
        },
        {
          name: 'Bench Thoracic Extension',
          duration: 45,
          sets: 2,
          description:
            'Kneel in front of a bench. Place elbows on the bench and sit hips back. ' +
            'Let the chest sink toward the floor to extend the thoracic spine.',
          breathingCue: 'Deep inhale to expand the ribcage, exhale to sink deeper.'
        },
        {
          name: 'Quadruped Rotation with Reach',
          duration: 45,
          sets: 3,
          description:
            'On all fours, place one hand behind the head. Rotate that elbow down toward the planted hand, ' +
            'then rotate up toward the ceiling. Full range of motion.',
          breathingCue: 'Exhale on the upward rotation, inhale on the way down.'
        },
        {
          name: 'Seated Floor Twist',
          duration: 45,
          sets: 2,
          description:
            'Sit with legs extended. Cross one foot over the opposite knee. Twist toward the bent knee, ' +
            'using the opposite elbow against the knee for leverage. Hold each side.',
          breathingCue: 'Inhale to sit tall, exhale to twist deeper.'
        }
      ]
    },

    // 8. Ankle Mobility for Squats
    {
      id: uuidv4(),
      name: 'Ankle Mobility for Squats',
      focus: ['ankles'] as MobilityFocus[],
      duration: 10,
      forGrapplers: false,
      exercises: [
        {
          name: 'Wall Ankle Dorsiflexion Stretch',
          duration: 45,
          sets: 3,
          description:
            'Face a wall, one foot forward. Drive the knee over the toes toward the wall without lifting the heel. ' +
            'Move the foot further back to increase difficulty. Alternate legs.',
          breathingCue: 'Exhale as you push the knee forward.'
        },
        {
          name: 'Banded Ankle Distraction',
          duration: 45,
          sets: 3,
          description:
            'Loop a heavy band around the front of the ankle, anchored behind you. Step forward into a half-kneeling ' +
            'position. Drive the knee forward over the toes. The band pulls the talus back, improving joint mobility.',
          breathingCue: 'Breathe normally. Rock gently forward and back.'
        },
        {
          name: 'Calf Raises (slow eccentrics)',
          duration: 30,
          sets: 3,
          description:
            'Stand on a step with heels hanging off. Rise up on the balls of the feet, then lower slowly ' +
            'over 3-4 seconds below the step level. Full range of motion.',
          breathingCue: 'Exhale on the way up, inhale on the slow lowering.'
        },
        {
          name: 'Ankle Circles',
          duration: 30,
          sets: 2,
          description:
            'Sit or stand on one foot. Make large, slow circles with the free ankle. ' +
            '15 seconds clockwise, 15 seconds counter-clockwise. Switch feet.',
          breathingCue: 'Breathe naturally.'
        },
        {
          name: 'Goblet Squat Hold',
          duration: 45,
          sets: 2,
          description:
            'Hold a light weight at chest height. Sink into a deep squat and hold. Use the elbows to push the ' +
            'knees out. Focus on keeping heels planted and torso upright.',
          breathingCue: 'Deep belly breaths. Use the exhale to sink lower.'
        }
      ]
    }
  ];
}

// --- Deload Session Generator ---

/**
 * Takes a normal workout session and creates a deload version:
 * - Reduces sets by ~40%
 * - Lowers RPE by 2-3 points
 * - Adds longer rest periods
 * - Inserts mobility work into warm-up and cool-down
 */
export function generateDeloadSession(normalSession: WorkoutSession): WorkoutSession {
  const deloadExercises: ExercisePrescription[] = normalSession.exercises.map(ex => {
    const deloadSets = Math.max(2, Math.round(ex.sets * 0.6));
    const deloadRPE = Math.max(4, ex.prescription.rpe - 2.5);
    const deloadRest = Math.min(300, Math.round(ex.prescription.restSeconds * 1.3));

    return {
      ...ex,
      sets: deloadSets,
      prescription: {
        ...ex.prescription,
        rpe: Math.round(deloadRPE * 10) / 10,
        restSeconds: deloadRest
      },
      notes: ex.notes
        ? `DELOAD: ${ex.notes}. Focus on technique, not load.`
        : 'DELOAD: Reduce weight to match target RPE. Focus on technique and control.'
    };
  });

  const deloadWarmUp = [
    '5 min light cardio (bike, row, or walking)',
    'Foam roll any tight areas for 3-5 min',
    'Hip circles and leg swings (20 each direction)',
    'Arm circles and band pull-aparts (15 reps)',
    'Bodyweight squats with 3-second pause at bottom (10 reps)',
    ...normalSession.warmUp.filter(
      w => !w.toLowerCase().includes('ramp') && !w.toLowerCase().includes('heavy')
    )
  ];

  const deloadCoolDown = [
    'Full body static stretching - hold each stretch 30-45 seconds',
    'Foam roll quads, hamstrings, upper back (2 min each)',
    'Deep breathing: 4 seconds in, 4 seconds hold, 6 seconds out (10 rounds)',
    'Pigeon stretch - 60 seconds per side',
    'Thoracic extension over foam roller - 2 minutes'
  ];

  return {
    id: uuidv4(),
    name: `Deload: ${normalSession.name}`,
    type: normalSession.type,
    dayNumber: normalSession.dayNumber,
    exercises: deloadExercises,
    estimatedDuration: Math.round(normalSession.estimatedDuration * 0.8),
    warmUp: deloadWarmUp,
    coolDown: deloadCoolDown
  };
}

// --- Active Recovery Session ---

/**
 * Generate a light active recovery session (~30 minutes, RPE 3-4 max).
 * Includes foam rolling, light band work, dynamic stretching, and breathing exercises.
 */
export function generateActiveRecoverySession(): WorkoutSession {
  // Build ExercisePrescription array representing recovery activities.
  // These use placeholder exercise objects since they are non-standard recovery exercises.

  const recoveryExercises: ExercisePrescription[] = [
    {
      exerciseId: 'foam-roll-full-body',
      exercise: {
        id: 'foam-roll-full-body',
        name: 'Full Body Foam Rolling',
        category: 'isolation',
        primaryMuscles: ['full_body'],
        secondaryMuscles: [],
        movementPattern: 'rotation',
        equipmentRequired: ['minimal', 'home_gym', 'full_gym'],
        equipmentTypes: ['bodyweight'] as EquipmentType[],
        grapplerFriendly: true,
        aestheticValue: 1,
        strengthValue: 1,
        description:
          'Slow, controlled foam rolling across all major muscle groups. Spend extra time on tight areas. ' +
          'Quads, hamstrings, glutes, upper back, lats.',
        cues: [
          'Roll slowly - about 1 inch per second',
          'Pause on tender spots for 20-30 seconds',
          'Do not roll directly on joints or the lower back',
          'Breathe deeply throughout'
        ]
      },
      sets: 1,
      prescription: {
        targetReps: 1,
        minReps: 1,
        maxReps: 1,
        rpe: 3,
        restSeconds: 30,
        tempo: 'slow and controlled'
      },
      notes: '8-10 minutes total. Hit quads, hamstrings, glutes, IT band, upper back, and lats.'
    },
    {
      exerciseId: 'band-pull-aparts-light',
      exercise: {
        id: 'band-pull-aparts-light',
        name: 'Light Band Pull-Aparts',
        category: 'isolation',
        primaryMuscles: ['back', 'shoulders'],
        secondaryMuscles: ['traps'],
        movementPattern: 'pull',
        equipmentRequired: ['minimal', 'home_gym', 'full_gym'],
        equipmentTypes: ['bodyweight'] as EquipmentType[],
        grapplerFriendly: true,
        aestheticValue: 3,
        strengthValue: 2,
        description: 'Very light band pull-aparts for shoulder health and rear delt activation.',
        cues: [
          'Use the lightest band available',
          'Squeeze shoulder blades together at the end',
          'Control the return - no snapping',
          'Keep arms straight'
        ]
      },
      sets: 3,
      prescription: {
        targetReps: 15,
        minReps: 12,
        maxReps: 20,
        rpe: 3,
        restSeconds: 30
      },
      notes: 'Light band only. This should feel like nothing. It is for blood flow, not strength.'
    },
    {
      exerciseId: 'band-face-pulls-light',
      exercise: {
        id: 'band-face-pulls-light',
        name: 'Light Band Face Pulls',
        category: 'isolation',
        primaryMuscles: ['shoulders', 'back'],
        secondaryMuscles: ['traps'],
        movementPattern: 'pull',
        equipmentRequired: ['minimal', 'home_gym', 'full_gym'],
        equipmentTypes: ['bodyweight'] as EquipmentType[],
        grapplerFriendly: true,
        aestheticValue: 3,
        strengthValue: 2,
        description: 'Light band face pulls for external rotation and shoulder health.',
        cues: [
          'Pull to the forehead, elbows high',
          'Externally rotate at the end position',
          'Light band - this is rehab, not training'
        ]
      },
      sets: 3,
      prescription: {
        targetReps: 15,
        minReps: 12,
        maxReps: 20,
        rpe: 3,
        restSeconds: 30
      },
      notes: 'Focus on the external rotation at the end range.'
    },
    {
      exerciseId: 'dynamic-stretching-flow',
      exercise: {
        id: 'dynamic-stretching-flow',
        name: 'Dynamic Stretching Flow',
        category: 'grappling_specific',
        primaryMuscles: ['full_body'],
        secondaryMuscles: [],
        movementPattern: 'rotation',
        equipmentRequired: ['minimal', 'home_gym', 'full_gym'],
        equipmentTypes: ['bodyweight'] as EquipmentType[],
        grapplerFriendly: true,
        aestheticValue: 1,
        strengthValue: 1,
        description:
          "Flow through World's Greatest Stretch, inchworms, hip circles, and leg swings. " +
          'Move continuously at a relaxed pace.',
        cues: [
          'Move through each position slowly',
          'Breathe into tight positions',
          'No forcing - work within your comfortable range',
          '5-6 reps of each movement'
        ]
      },
      sets: 2,
      prescription: {
        targetReps: 5,
        minReps: 4,
        maxReps: 6,
        rpe: 3,
        restSeconds: 30
      },
      notes: "5 min continuous flow. World's Greatest Stretch, inchworms, hip circles, leg swings."
    },
    {
      exerciseId: 'dead-hang',
      exercise: {
        id: 'dead-hang',
        name: 'Dead Hang',
        category: 'grip',
        primaryMuscles: ['lats', 'shoulders', 'forearms'],
        secondaryMuscles: ['core'],
        movementPattern: 'pull',
        equipmentRequired: ['minimal', 'home_gym', 'full_gym'],
        equipmentTypes: ['bodyweight'] as EquipmentType[],
        grapplerFriendly: true,
        aestheticValue: 2,
        strengthValue: 3,
        description:
          'Hang from a pull-up bar with relaxed shoulders. Let the bodyweight decompress the spine. ' +
          'Grip loosely if needed.',
        cues: [
          'Relax the shoulders - let them stretch',
          'Breathe deeply into the belly',
          'Shake out gently if desired',
          'Step down before grip fails completely'
        ]
      },
      sets: 3,
      prescription: {
        targetReps: 1,
        minReps: 1,
        maxReps: 1,
        rpe: 4,
        restSeconds: 45,
        tempo: '30-45 second holds'
      },
      notes: '30-45 second holds. Focus on spinal decompression and shoulder opening.'
    },
    {
      exerciseId: 'breathing-exercise',
      exercise: {
        id: 'breathing-exercise',
        name: 'Box Breathing / Parasympathetic Reset',
        category: 'grappling_specific',
        primaryMuscles: ['core'],
        secondaryMuscles: [],
        movementPattern: 'rotation',
        equipmentRequired: ['minimal', 'home_gym', 'full_gym'],
        equipmentTypes: ['bodyweight'] as EquipmentType[],
        grapplerFriendly: true,
        aestheticValue: 1,
        strengthValue: 1,
        description:
          'Lie on your back, knees bent, feet flat. Perform box breathing: ' +
          '4 seconds inhale, 4 seconds hold, 4 seconds exhale, 4 seconds hold. Repeat for 5 minutes.',
        cues: [
          'Breathe through the nose',
          'Expand the belly, not the chest',
          'Eyes closed, jaw relaxed',
          'If the mind wanders, return focus to the count'
        ]
      },
      sets: 1,
      prescription: {
        targetReps: 10,
        minReps: 8,
        maxReps: 15,
        rpe: 2,
        restSeconds: 0
      },
      notes: '5 minutes of box breathing. 10 cycles minimum. This activates the parasympathetic nervous system for recovery.'
    }
  ];

  return {
    id: uuidv4(),
    name: 'Active Recovery Session',
    type: 'hypertrophy', // lightest classification; recovery is not truly strength or power
    dayNumber: 0, // not tied to a specific day in the program
    exercises: recoveryExercises,
    estimatedDuration: 30,
    warmUp: [
      '3 min easy walking or light cycling to elevate body temperature',
      'Gentle neck rolls and shoulder shrugs'
    ],
    coolDown: [
      'Lie flat on the floor for 2-3 minutes, focusing on deep breathing',
      'Optional: legs up the wall for 3 minutes to promote venous return'
    ]
  };
}
