// ── Feature Access Hook ────────────────────────────────────────────────────
// React hook for gating features behind subscription tiers.

import { useAppStore } from './store';
import { getEffectiveTier, hasFeatureAccess, FEATURE_GATES, FEATURE_INFO } from './subscription';
import { SubscriptionTier } from './types';

export interface FeatureAccessResult {
  /** Whether the user can access this feature */
  allowed: boolean;
  /** The user's current effective tier */
  currentTier: SubscriptionTier;
  /** The tier required for this feature */
  requiredTier: SubscriptionTier;
  /** Human-readable feature name */
  featureName: string;
  /** Human-readable feature description */
  featureDescription: string;
}

/**
 * Check if the current user has access to a specific feature.
 *
 * Usage:
 * ```tsx
 * const { allowed, featureName } = useFeatureAccess('nutrition-tracking');
 * if (!allowed) return <UpgradePrompt feature="nutrition-tracking" />;
 * ```
 */
export function useFeatureAccess(feature: string): FeatureAccessResult {
  const subscription = useAppStore((state) => state.subscription);
  const currentTier = getEffectiveTier(subscription);
  const requiredTier = FEATURE_GATES[feature] || 'free';
  const info = FEATURE_INFO[feature];

  return {
    allowed: hasFeatureAccess(feature, currentTier),
    currentTier,
    requiredTier,
    featureName: info?.name || feature,
    featureDescription: info?.description || '',
  };
}

/**
 * Check if the user is on the Pro tier.
 */
export function useIsPro(): boolean {
  const subscription = useAppStore((state) => state.subscription);
  return getEffectiveTier(subscription) === 'pro';
}

/**
 * Get the user's current subscription tier.
 */
export function useCurrentTier(): SubscriptionTier {
  const subscription = useAppStore((state) => state.subscription);
  return getEffectiveTier(subscription);
}
