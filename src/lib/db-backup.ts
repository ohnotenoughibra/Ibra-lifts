// Shared backup helper — creates point-in-time snapshots before any data mutation.
// Used by sync POST, sync GET (pre-pull), repair-xp, and force-pull routes.

import type { VercelPoolClient } from '@vercel/postgres';

const RATE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes between backups (per user)

interface BackupOptions {
  /** Bypass the 15-minute rate limit (for repair/force-pull operations) */
  force?: boolean;
}

/**
 * Create a backup of the user's data if eligible (rate-limited).
 *
 * Pruning strategy:
 *   - Keep ALL backups for 7 days
 *   - Keep one-per-day for days 8–30
 *   - Delete everything older than 30 days
 *
 * Returns true if a backup was created, false if skipped (rate limit or empty data).
 */
export async function createBackupIfEligible(
  client: VercelPoolClient,
  userId: string,
  data: Record<string, unknown>,
  options: BackupOptions = {},
): Promise<boolean> {
  const workoutCount = Array.isArray(data.workoutLogs) ? data.workoutLogs.length : 0;
  const hasProfile = data.isOnboarded === true && data.user;

  // Don't back up empty/useless data
  if (workoutCount === 0 && !hasProfile) return false;

  // Ensure backup table exists
  await client.sql`
    CREATE TABLE IF NOT EXISTS user_store_backups (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      data JSONB NOT NULL,
      workout_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Rate limit check (unless force)
  if (!options.force) {
    const intervalMs = RATE_LIMIT_MS;
    const { rows: recent } = await client.sql`
      SELECT id FROM user_store_backups
      WHERE user_id = ${userId}
        AND created_at > NOW() - (${intervalMs}::bigint || ' milliseconds')::interval
      LIMIT 1
    `;
    if (recent.length > 0) return false;
  }

  // Create the backup
  const jsonData = JSON.stringify(data);
  await client.sql`
    INSERT INTO user_store_backups (user_id, data, workout_count)
    VALUES (${userId}, ${jsonData}::jsonb, ${workoutCount})
  `;

  // Smart pruning:
  // 1. Delete everything older than 30 days
  await client.sql`
    DELETE FROM user_store_backups
    WHERE user_id = ${userId} AND created_at < NOW() - INTERVAL '30 days'
  `;

  // 2. For days 8–30, keep only the most recent backup per day
  await client.sql`
    DELETE FROM user_store_backups
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               created_at,
               ROW_NUMBER() OVER (
                 PARTITION BY user_id, DATE(created_at)
                 ORDER BY created_at DESC
               ) as rn
        FROM user_store_backups
        WHERE user_id = ${userId}
          AND created_at < NOW() - INTERVAL '7 days'
          AND created_at >= NOW() - INTERVAL '30 days'
      ) ranked
      WHERE rn > 1
    )
  `;

  return true;
}
