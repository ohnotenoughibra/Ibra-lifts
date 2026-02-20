'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, Check, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useFeatureAccess } from '@/lib/useFeatureAccess';
import { PRICING } from '@/lib/subscription';

interface UpgradePromptProps {
  feature: string;
  onDismiss?: () => void;
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

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
const PAYPAL_PLANS = {
  monthly: process.env.NEXT_PUBLIC_PAYPAL_PLAN_MONTHLY || '',
  annual: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ANNUAL || '',
};

export default function UpgradePrompt({ feature, onDismiss, variant = 'inline' }: UpgradePromptProps) {
  const { featureName, featureDescription } = useFeatureAccess(feature);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = billingCycle === 'annual' ? PRICING.pro.annual : PRICING.pro.monthly;
  const planId = billingCycle === 'annual' ? PAYPAL_PLANS.annual : PAYPAL_PLANS.monthly;
  const canCheckout = !!PAYPAL_CLIENT_ID && !!planId;

  // ── Banner variant ──
  if (variant === 'banner') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-500/20">
        <Crown className="w-5 h-5 text-sky-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-grappler-100 truncate">
            {featureName} is a Pro feature
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 text-xs font-semibold hover:bg-sky-500/30 transition-colors"
        >
          Upgrade
        </button>
      </div>
    );
  }

  // ── Success state ──
  if (success) {
    const successContent = (
      <div className="text-center py-6 px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
        >
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </motion.div>
        <h3 className="text-xl font-bold text-grappler-50 mb-2">Welcome to Pro!</h3>
        <p className="text-sm text-grappler-400 mb-6">Your subscription is active. All Pro features are unlocked.</p>
        <button
          onClick={() => {
            onDismiss?.();
            window.location.reload();
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Let&apos;s Go
        </button>
      </div>
    );

    if (variant === 'modal') {
      return (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="bg-grappler-800 rounded-2xl p-6 max-w-sm w-full border border-grappler-700/50 shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {successContent}
          </motion.div>
        </motion.div>
      );
    }
    return (
      <div className="rounded-2xl bg-gradient-to-br from-grappler-800 to-grappler-850 border border-grappler-700/50 p-5">
        {successContent}
      </div>
    );
  }

  // ── Billing toggle ──
  const billingToggle = (
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
  );

  // ── PayPal buttons (with SEPA) or "Coming soon" fallback ──
  const checkoutSection = canCheckout ? (
    <div className="space-y-3">
      <PayPalScriptProvider
        options={{
          clientId: PAYPAL_CLIENT_ID,
          vault: true,
          intent: 'subscription',
          currency: 'EUR',
        }}
      >
        <PayPalButtons
          key={billingCycle}
          createSubscription={(_data, actions) => {
            return actions.subscription.create({
              plan_id: planId,
            });
          }}
          onApprove={async (data) => {
            setActivating(true);
            setError(null);
            try {
              const res = await fetch('/api/subscription/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionId: data.subscriptionID }),
              });
              if (res.ok) {
                setSuccess(true);
              } else {
                setError('Activation failed. Your payment was processed — contact support if needed.');
              }
            } catch {
              setError('Network error. Please try again.');
            }
            setActivating(false);
          }}
          onError={() => {
            setError('Payment failed. Please try again.');
            setTimeout(() => setError(null), 5000);
          }}
          style={{
            label: 'subscribe',
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            tagline: false,
          }}
        />
      </PayPalScriptProvider>
      {activating && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
          <span className="text-sm text-grappler-400">Activating your subscription...</span>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}
    </div>
  ) : (
    <button
      disabled
      className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-semibold text-sm opacity-50 flex items-center justify-center gap-2"
    >
      <Zap className="w-4 h-4" />
      Coming soon
    </button>
  );

  // ── Inline Card ──
  if (variant === 'inline') {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-grappler-800 to-grappler-850 border border-grappler-700/50 p-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center mx-auto mb-3">
          <Crown className="w-6 h-6 text-sky-400" />
        </div>
        <h3 className="text-lg font-bold text-grappler-50 mb-1">{featureName}</h3>
        <p className="text-sm text-grappler-400 mb-4">{featureDescription}</p>
        {billingToggle}
        {checkoutSection}
        <p className="text-center text-xs text-grappler-400 mt-3">
          PayPal, SEPA Lastschrift, or card. Cancel anytime.
        </p>
        {onDismiss && (
          <button onClick={onDismiss} className="mt-2 text-xs text-grappler-400 hover:text-grappler-300 transition-colors">
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
          className="bg-grappler-800 rounded-2xl p-6 max-w-sm w-full border border-grappler-700/50 shadow-2xl relative max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {onDismiss && (
            <button onClick={onDismiss} className="absolute top-4 right-4 text-grappler-500 hover:text-grappler-300">
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-3">
              <Crown className="w-8 h-8 text-sky-400" />
            </div>
            <h2 className="text-xl font-bold text-grappler-50">Unlock {featureName}</h2>
            <p className="text-sm text-grappler-400 mt-1">{featureDescription}</p>
          </div>

          <div className="space-y-2 mb-5">
            {PRO_HIGHLIGHTS.map((highlight) => (
              <div key={highlight} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-sm text-grappler-200">{highlight}</span>
              </div>
            ))}
          </div>

          {billingToggle}
          {checkoutSection}

          <p className="text-center text-xs text-grappler-400 mt-3">
            PayPal, SEPA Lastschrift, or card. Cancel anytime.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
