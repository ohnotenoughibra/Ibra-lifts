import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/fix-mesocycles?email=...&fix=true
 *
 * Diagnoses and optionally repairs mesocycle ordering issues in user_store.
 *
 * Without fix=true: read-only diagnosis
 * With fix=true: applies repairs and saves back to DB
 *
 * Issues detected & fixed:
 * 1. Workout logs with sessionIds that don't match any session in the current mesocycle
 * 2. Workout logs with stale mesocycleIds (pointing to old/wrong mesocycles)
 * 3. Duplicate sessionId assignments (two logs claiming the same session)
 * 4. Mesocycle weeks with incorrect weekNumber ordering
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const applyFix = searchParams.get('fix') === 'true';

  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 });
  }

  try {
    // Look up user by email
    const { rows: userRows } = await sql`
      SELECT id, email, name FROM auth_users WHERE email = ${email}
    `;
    if (userRows.length === 0) {
      return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 });
    }
    const userId = userRows[0].id;

    // Get user_store
    const { rows: storeRows } = await sql`
      SELECT data, updated_at FROM user_store WHERE user_id = ${userId}
    `;
    if (storeRows.length === 0) {
      return NextResponse.json({ error: 'No user_store data found' }, { status: 404 });
    }

    const data = storeRows[0].data as Record<string, unknown>;
    const currentMesocycle = data.currentMesocycle as {
      id: string;
      name: string;
      startDate: string;
      weeks: { weekNumber: number; isDeload: boolean; sessions: { id: string; name: string; type: string; dayNumber: number; exercises: { exerciseId: string }[] }[] }[];
    } | null;
    const workoutLogs = (data.workoutLogs || []) as {
      id: string;
      mesocycleId: string;
      sessionId: string;
      date: string;
      exercises: { exerciseId: string }[];
      totalVolume: number;
      overallRPE: number;
    }[];
    const mesocycleHistory = (data.mesocycleHistory || []) as { id: string; name: string; status: string }[];

    const diagnosis: Record<string, unknown> = {
      user: { id: userId, email, name: userRows[0].name },
      storeUpdatedAt: storeRows[0].updated_at,
      currentMesocycle: currentMesocycle ? {
        id: currentMesocycle.id,
        name: currentMesocycle.name,
        startDate: currentMesocycle.startDate,
        weekCount: currentMesocycle.weeks.length,
        totalSessions: currentMesocycle.weeks.reduce((s, w) => s + w.sessions.length, 0),
        weeks: currentMesocycle.weeks.map(w => ({
          weekNumber: w.weekNumber,
          isDeload: w.isDeload,
          sessions: w.sessions.map(s => ({ id: s.id, name: s.name, type: s.type, dayNumber: s.dayNumber })),
        })),
      } : null,
      mesocycleHistoryCount: mesocycleHistory.length,
      totalWorkoutLogs: workoutLogs.length,
    };

    if (!currentMesocycle) {
      return NextResponse.json({ ...diagnosis, issues: ['No active mesocycle'], fixes: [] });
    }

    // Build session lookup
    const allSessions = currentMesocycle.weeks.flatMap(w => w.sessions);
    const sessionIdSet = new Set(allSessions.map(s => s.id));

    // Analyze logs
    const issues: string[] = [];
    const mesoLogs = workoutLogs.filter(l => l.mesocycleId === currentMesocycle.id);
    const orphanedLogs = workoutLogs.filter(l =>
      l.mesocycleId !== currentMesocycle.id &&
      l.mesocycleId !== 'standalone' &&
      new Date(l.date) >= new Date(currentMesocycle.startDate)
    );

    diagnosis.logsForCurrentMeso = mesoLogs.length;
    diagnosis.orphanedLogs = orphanedLogs.length;
    diagnosis.orphanedLogDetails = orphanedLogs.map(l => ({
      id: l.id,
      date: l.date,
      mesocycleId: l.mesocycleId,
      sessionId: l.sessionId,
      volume: l.totalVolume,
    }));

    // Issue 1: Logs pointing to current meso but with invalid sessionIds
    const invalidSessionLogs = mesoLogs.filter(l => !sessionIdSet.has(l.sessionId));
    if (invalidSessionLogs.length > 0) {
      issues.push(`${invalidSessionLogs.length} logs have sessionIds not found in current mesocycle`);
      diagnosis.invalidSessionLogs = invalidSessionLogs.map(l => ({
        id: l.id,
        date: l.date,
        sessionId: l.sessionId,
        exercises: l.exercises?.map(e => e.exerciseId).slice(0, 3),
      }));
    }

    // Issue 2: Orphaned logs that should belong to current mesocycle
    if (orphanedLogs.length > 0) {
      issues.push(`${orphanedLogs.length} logs dated after mesocycle start but pointing to other mesocycle IDs`);
    }

    // Issue 3: Duplicate sessionId assignments
    const sessionIdCounts: Record<string, number> = {};
    for (const log of mesoLogs) {
      sessionIdCounts[log.sessionId] = (sessionIdCounts[log.sessionId] || 0) + 1;
    }
    const duplicates = Object.entries(sessionIdCounts).filter(([, count]) => count > 1);
    if (duplicates.length > 0) {
      issues.push(`${duplicates.length} sessions have multiple logs assigned: ${duplicates.map(([id, c]) => `${id}(${c}x)`).join(', ')}`);
      diagnosis.duplicateSessionAssignments = duplicates;
    }

    // Issue 4: Week numbering
    const weekNumbers = currentMesocycle.weeks.map(w => w.weekNumber);
    const expectedWeekNumbers = currentMesocycle.weeks.map((_, i) => i + 1);
    if (JSON.stringify(weekNumbers) !== JSON.stringify(expectedWeekNumbers)) {
      issues.push(`Week numbers are not sequential: [${weekNumbers.join(',')}] expected [${expectedWeekNumbers.join(',')}]`);
    }

    // Issue 5: Session dayNumbers within weeks
    for (const week of currentMesocycle.weeks) {
      const dayNums = week.sessions.map(s => s.dayNumber);
      const expectedDayNums = week.sessions.map((_, i) => i + 1);
      if (JSON.stringify(dayNums) !== JSON.stringify(expectedDayNums)) {
        issues.push(`Week ${week.weekNumber}: session dayNumbers are [${dayNums.join(',')}] expected [${expectedDayNums.join(',')}]`);
      }
    }

    // Completed sessions summary
    const completedSessionIds = new Set(mesoLogs.map(l => l.sessionId));
    const completedSessions = allSessions.filter(s => completedSessionIds.has(s.id));
    const uncompletedSessions = allSessions.filter(s => !completedSessionIds.has(s.id));
    diagnosis.completedSessions = completedSessions.map(s => ({ id: s.id, name: s.name, dayNumber: s.dayNumber }));
    diagnosis.nextUncompletedSessions = uncompletedSessions.slice(0, 3).map(s => ({ id: s.id, name: s.name, dayNumber: s.dayNumber }));
    diagnosis.progress = `${completedSessions.length}/${allSessions.length}`;

    diagnosis.issues = issues;

    // Apply fixes if requested
    if (applyFix && issues.length > 0) {
      const fixes: string[] = [];
      let updatedWorkoutLogs = [...workoutLogs];
      const updatedMesocycle = JSON.parse(JSON.stringify(currentMesocycle));

      // Fix 4 & 5: Renumber weeks and sessions
      for (let wi = 0; wi < updatedMesocycle.weeks.length; wi++) {
        if (updatedMesocycle.weeks[wi].weekNumber !== wi + 1) {
          fixes.push(`Fixed week ${updatedMesocycle.weeks[wi].weekNumber} → ${wi + 1}`);
          updatedMesocycle.weeks[wi].weekNumber = wi + 1;
        }
        for (let si = 0; si < updatedMesocycle.weeks[wi].sessions.length; si++) {
          if (updatedMesocycle.weeks[wi].sessions[si].dayNumber !== si + 1) {
            fixes.push(`Fixed W${wi + 1} session dayNumber ${updatedMesocycle.weeks[wi].sessions[si].dayNumber} → ${si + 1}`);
            updatedMesocycle.weeks[wi].sessions[si].dayNumber = si + 1;
          }
        }
      }

      // Fix 1 & 2: Re-map orphaned and invalid-session logs using exercise matching
      const allFixSessions = updatedMesocycle.weeks.flatMap((w: { sessions: unknown[] }) => w.sessions) as { id: string; name: string; exercises: { exerciseId: string }[] }[];
      const claimedIds = new Set<string>();

      // First pass: keep valid logs as-is and claim their sessions
      for (const log of updatedWorkoutLogs) {
        if (log.mesocycleId === currentMesocycle.id && sessionIdSet.has(log.sessionId)) {
          claimedIds.add(log.sessionId);
        }
      }

      // Second pass: fix orphaned and invalid logs
      const logsToFix = updatedWorkoutLogs.filter(l =>
        (l.mesocycleId !== currentMesocycle.id && l.mesocycleId !== 'standalone' && new Date(l.date) >= new Date(currentMesocycle.startDate)) ||
        (l.mesocycleId === currentMesocycle.id && !sessionIdSet.has(l.sessionId))
      );

      // Sort by date to assign in chronological order
      logsToFix.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const log of logsToFix) {
        const logExerciseIds = new Set((log.exercises || []).map(e => e.exerciseId));
        let bestMatch: typeof allFixSessions[0] | null = null;
        let bestScore = -1;

        for (const session of allFixSessions) {
          if (claimedIds.has(session.id)) continue;
          let score = 0;
          for (const ex of session.exercises) {
            if (logExerciseIds.has(ex.exerciseId)) score += 2;
          }
          if (score > bestScore) {
            bestScore = score;
            bestMatch = session;
          }
        }

        // Fallback to first unclaimed session if no exercise match
        if (!bestMatch || bestScore <= 0) {
          bestMatch = allFixSessions.find(s => !claimedIds.has(s.id)) || null;
        }

        if (bestMatch) {
          claimedIds.add(bestMatch.id);
          const logIndex = updatedWorkoutLogs.findIndex(l => l.id === log.id);
          if (logIndex >= 0) {
            updatedWorkoutLogs[logIndex] = {
              ...updatedWorkoutLogs[logIndex],
              mesocycleId: currentMesocycle.id,
              sessionId: bestMatch.id,
            };
            fixes.push(`Reassigned log ${log.id} (${log.date}) → session "${bestMatch.name}" (${bestMatch.id})`);
          }
        }
      }

      // Fix 3: Deduplicate — keep only the most recent log per session
      const sessionLogMap: Record<string, typeof updatedWorkoutLogs[0][]> = {};
      for (const log of updatedWorkoutLogs) {
        if (log.mesocycleId === currentMesocycle.id) {
          if (!sessionLogMap[log.sessionId]) sessionLogMap[log.sessionId] = [];
          sessionLogMap[log.sessionId].push(log);
        }
      }
      for (const [sessionId, logs] of Object.entries(sessionLogMap)) {
        if (logs.length > 1) {
          // Keep the most recent, orphan the rest
          const sorted = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          for (let i = 1; i < sorted.length; i++) {
            const idx = updatedWorkoutLogs.findIndex(l => l.id === sorted[i].id);
            if (idx >= 0) {
              updatedWorkoutLogs[idx] = { ...updatedWorkoutLogs[idx], mesocycleId: 'standalone' };
              fixes.push(`Deduplicated: moved older log ${sorted[i].id} for session ${sessionId} to standalone`);
            }
          }
        }
      }

      // Write back to DB
      const updatedData = {
        ...data,
        currentMesocycle: updatedMesocycle,
        workoutLogs: updatedWorkoutLogs,
      };

      await sql`
        UPDATE user_store SET data = ${JSON.stringify(updatedData)}::jsonb, updated_at = NOW()
        WHERE user_id = ${userId}
      `;

      diagnosis.fixes = fixes;
      diagnosis.fixApplied = true;
      diagnosis.newProgress = (() => {
        const newMesoLogs = updatedWorkoutLogs.filter(l => l.mesocycleId === currentMesocycle.id);
        const newCompletedIds = new Set(newMesoLogs.map(l => l.sessionId));
        const newAllSessions = updatedMesocycle.weeks.flatMap((w: { sessions: { id: string }[] }) => w.sessions);
        const newCompleted = newAllSessions.filter((s: { id: string }) => newCompletedIds.has(s.id));
        return `${newCompleted.length}/${newAllSessions.length}`;
      })();
    } else {
      diagnosis.fixes = [];
      diagnosis.fixApplied = false;
      if (issues.length > 0) {
        diagnosis.hint = 'Add ?fix=true to apply repairs';
      }
    }

    return NextResponse.json(diagnosis, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fix mesocycles error:', error);
    return NextResponse.json({ error: 'Failed', details: String(error) }, { status: 500 });
  }
}
