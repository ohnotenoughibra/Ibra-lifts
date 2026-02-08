'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, Check, Zap } from 'lucide-react';
import { useState } from 'react';
import { useFeatureAccess } from '@/lib/useFeatureAccess';
import { PRICING } from '@/lib/subscription';

interface UpgradePromptProps {
  feature: string;
  onDismiss?: () => void;
  /** Inline variant shows a compact banner instead of a modal */
  variant?: 'modal' | 'inline' | 'banner';
}

const PRO_HIGHLIGHTS = [
  'Unlimited workout history',
  'Advanced analytics & AI coach',
  'Nutrition & diet coaching',
  'Wearable integration (Whoop+)',
  'Cloud sync & PDF export',
  'Competition prep tools',
];

export default function UpgradePrompt({ feature, onDismiss, variant = 'inline' }: UpgradePromptProps) {
  const { featureName, featureDescription } = useFeatureAccess(feature);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const price = billingCycle === 'annual' ? PRICING.pro.annual : PRICING.pro.monthly;

  // ── Inline Banner ──
  if (variant === 'banner') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
        <Crown className="w-5 h-5 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-grappler-100 truncate">
            {featureName} is a Pro feature
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
        >
          Upgrade
        </button>
      </div>
    );
  }

  // ── Inline Card ──
  if (variant === 'inline') {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-grappler-800 to-grappler-850 border border-grappler-700/50 p-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
          <Crown className="w-6 h-6 text-amber-400" />
        </div>
        <h3 className="text-lg font-bold text-grappler-50 mb-1">{featureName}</h3>
        <p className="text-sm text-grappler-400 mb-4">{featureDescription}</p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                : 'bg-grappler-700/50 text-grappler-400'
            }`}
          >
            {PRICING.pro.monthly.label}
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              billingCycle === 'annual'
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                : 'bg-grappler-700/50 text-grappler-400'
            }`}
          >
            {PRICING.pro.annual.label}
            <span className="ml-1 text-green-400">-{PRICING.pro.annual.savings}</span>
          </button>
        </div>

        <button className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" />
          Upgrade to Pro — {price.label}
        </button>

        {onDismiss && (
          <button onClick={onDismiss} className="mt-3 text-xs text-grappler-500 hover:text-grappler-300 transition-colors">
            Maybe later
          </button>
        )}
      </div>
    );
  }

  // ── Modal ──
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
      >
        <motion.div
          className="bg-grappler-800 rounded-2xl p-6 max-w-sm w-full border border-grappler-700/50 shadow-2xl"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          {onDismiss && (
            <button onClick={onDismiss} className="absolute top-4 right-4 text-grappler-500 hover:text-grappler-300">
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-3">
              <Crown className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-grappler-50">Unlock {featureName}</h2>
            <p className="text-sm text-grappler-400 mt-1">{featureDescription}</p>
          </div>

          {/* Features */}
          <div className="space-y-2 mb-5">
            {PRO_HIGHLIGHTS.map((highlight) => (
              <div key={highlight} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm text-grappler-200">{highlight}</span>
              </div>
            ))}
          </div>

          {/* Billing toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                  : 'bg-grappler-700/50 text-grappler-400'
              }`}
            >
              Monthly — {PRICING.pro.monthly.label}
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                billingCycle === 'annual'
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                  : 'bg-grappler-700/50 text-grappler-400'
              }`}
            >
              Annual — {PRICING.pro.annual.label}
              <span className="ml-1 text-green-400">-{PRICING.pro.annual.savings}</span>
            </button>
          </div>

          {/* CTA */}
          <button className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            Upgrade to Pro — {price.label}
          </button>

          <p className="text-center text-xs text-grappler-500 mt-3">
            Pay with PayPal or SEPA Lastschrift. Cancel anytime.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
