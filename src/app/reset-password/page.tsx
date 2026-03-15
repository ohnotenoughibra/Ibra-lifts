'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Dumbbell, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, Check } from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'request' | 'reset' | 'sent' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If token is in URL (from email link), go straight to reset step
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      setStep('reset');
    }
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.token) {
        // Token returned directly (no email service — dev/self-hosted fallback)
        setToken(data.token);
        setStep('reset');
      } else {
        // Email was sent, or user not found (same response for security)
        setStep('sent');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!token) {
      setError('No reset token found. Please start over.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
      } else {
        setStep('done');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 safe-area-top safe-area-bottom">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-2xl font-black text-grappler-50">
            {step === 'done' ? 'Password Reset' : step === 'sent' ? 'Check Your Email' : 'Forgot Password'}
          </h1>
          <p className="text-sm text-grappler-400 mt-1">
            {step === 'request' && 'Enter your email to reset your password'}
            {step === 'reset' && 'Enter your new password'}
            {step === 'sent' && 'We sent you a reset link'}
            {step === 'done' && 'Your password has been updated'}
          </p>
        </div>

        {step === 'request' && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            {error && (
              <div className="rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-grappler-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-grappler-800 border border-grappler-700 text-grappler-100 placeholder:text-grappler-600 focus-visible:border-primary-500 focus-visible:ring-1 focus-visible:ring-primary-500 outline-none transition-colors text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-grappler-400 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-grappler-800 border border-grappler-700 text-grappler-100 placeholder:text-grappler-600 focus-visible:border-primary-500 focus-visible:ring-1 focus-visible:ring-primary-500 outline-none transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-grappler-500 hover:text-grappler-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-grappler-400 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-grappler-800 border border-grappler-700 text-grappler-100 placeholder:text-grappler-600 focus-visible:border-primary-500 focus-visible:ring-1 focus-visible:ring-primary-500 outline-none transition-colors text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Set New Password'
              )}
            </button>
          </form>
        )}

        {step === 'sent' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary-400" />
            </div>
            <p className="text-sm text-grappler-300 mb-6">
              If an account exists for <span className="text-grappler-100 font-medium">{email}</span>, we sent a reset link to your inbox. Check your spam folder too.
            </p>
            <button
              onClick={() => { setStep('request'); setError(''); }}
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              Try a different email
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        )}

        {/* Back to login */}
        {step !== 'done' && step !== 'sent' && (
          <p className="text-center mt-6">
            <Link href="/login" className="text-sm text-grappler-400 hover:text-grappler-200 inline-flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
