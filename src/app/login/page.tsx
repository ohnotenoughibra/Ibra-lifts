'use client';

import { Suspense, useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, Wand2 } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [magicMode, setMagicMode] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicValidating, setMagicValidating] = useState(false);

  // Handle magic link token from URL (?magic=ml_xxx)
  useEffect(() => {
    const magicToken = searchParams.get('magic');
    if (magicToken && magicToken.startsWith('ml_')) {
      setMagicValidating(true);
      fetch('/api/auth/magic-link', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: magicToken }),
      })
        .then(res => res.json())
        .then(async (data) => {
          if (data.success && data.email) {
            // Sign in with the validated magic link
            const result = await signIn('credentials', {
              email: data.email,
              password: `__magic__${magicToken}`,
              redirect: false,
            });
            if (result?.error) {
              setError('Magic link sign-in failed. Please try again.');
            } else {
              router.push('/');
              router.refresh();
            }
          } else {
            setError(data.error || 'Invalid or expired magic link.');
          }
        })
        .catch(() => setError('Something went wrong validating the magic link.'))
        .finally(() => setMagicValidating(false));
    }
  }, [searchParams, router]);

  // Show OAuth errors from NextAuth redirect (e.g. ?error=AccessDenied)
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      const messages: Record<string, string> = {
        AccessDenied: 'Sign-in was denied. Please try again.',
        OAuthSignin: 'Could not start Google sign-in. Please try again.',
        OAuthCallback: 'Google sign-in failed. Please try again.',
        OAuthAccountNotLinked: 'This email is already linked to another sign-in method. Try using your password instead.',
        OAuthCreateAccount: 'Could not create account via Google. Please try again.',
        Callback: 'Sign-in callback error. Please try again.',
        Configuration: 'Server configuration error. Please try again later.',
      };
      setError(messages[oauthError] || `Sign-in failed (${oauthError}). Please try again.`);
    }
  }, [searchParams]);

  const handleMagicLink = async () => {
    if (!email) {
      setError('Enter your email address first');
      return;
    }
    setMagicLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      if (res.ok) {
        setMagicSent(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send magic link');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setMagicLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        setError(attempts >= 2
          ? 'Invalid email or password. Forgot your password?'
          : 'Invalid email or password');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show a full-screen spinner while validating a magic link from URL
  if (magicValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto" />
          <p className="text-grappler-300 text-sm">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Editorial wordmark */}
        <div className="mb-8">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-grappler-500 mb-3">
            Welcome back
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-black tracking-tight leading-none text-white mb-3">
            IBRA<br />LIFTS<span className="text-primary-500">.</span>
          </h1>
          <div className="h-px bg-grappler-800 my-4" />
          <p className="text-sm text-grappler-400">Sign in to restore your data.</p>
        </div>

        {error && (
          <div className="rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm mb-4">
            {failedAttempts >= 2 ? (
              <>Invalid email or password. <Link href="/reset-password" className="text-primary-400 underline hover:text-primary-300">Reset your password</Link></>
            ) : (
              error
            )}
          </div>
        )}

        {/* Google Sign In — primary */}
        <button
          onClick={() => { setGoogleLoading(true); signIn('google', { callbackUrl: '/' }); }}
          disabled={loading || googleLoading}
          className="w-full py-3 rounded-xl bg-grappler-800 border border-grappler-700 text-grappler-100 font-medium text-sm hover:bg-grappler-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-3"
        >
          {googleLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecting to Google...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Apple Sign In — conditional */}
        {process.env.NEXT_PUBLIC_APPLE_ENABLED === 'true' && (
          <button
            onClick={() => { setAppleLoading(true); signIn('apple', { callbackUrl: '/' }); }}
            disabled={loading || appleLoading}
            className="w-full py-3 rounded-xl bg-grappler-800 border border-grappler-700 text-grappler-100 font-medium text-sm hover:bg-grappler-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-3 mt-3"
          >
            {appleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to Apple...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
              </>
            )}
          </button>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-grappler-700" />
          <span className="text-xs text-grappler-500">or sign in with email</span>
          <div className="flex-1 h-px bg-grappler-700" />
        </div>

        {magicSent ? (
          <div className="text-center space-y-3 py-4">
            <Mail className="w-10 h-10 text-primary-400 mx-auto" />
            <p className="text-sm text-grappler-200 font-medium">Check your email!</p>
            <p className="text-xs text-grappler-400">We sent a sign-in link to <span className="text-grappler-200">{email}</span>. It expires in 15 minutes.</p>
            <button
              onClick={() => { setMagicSent(false); setMagicMode(false); }}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              Use password instead
            </button>
          </div>
        ) : magicMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-grappler-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  enterKeyHint="send"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-grappler-800 border border-grappler-700 text-grappler-100 placeholder:text-grappler-600 focus-visible:border-primary-500 focus-visible:ring-1 focus-visible:ring-primary-500 outline-none transition-colors text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleMagicLink}
              disabled={magicLoading || !email}
              className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {magicLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Email me a sign-in link
                </>
              )}
            </button>
            <button
              onClick={() => setMagicMode(false)}
              className="w-full text-xs text-grappler-400 hover:text-grappler-300 transition-colors text-center"
            >
              Use password instead
            </button>
          </div>
        ) : (
          <>
            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="next"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-grappler-800 border border-grappler-700 text-grappler-100 placeholder:text-grappler-600 focus-visible:border-primary-500 focus-visible:ring-1 focus-visible:ring-primary-500 outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-grappler-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    autoComplete="current-password"
                    enterKeyHint="done"
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

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMagicMode(true)}
                  className="text-xs text-grappler-400 hover:text-grappler-300 transition-colors flex items-center gap-1"
                >
                  <Wand2 className="w-3 h-3" />
                  Email me a link
                </button>
                <Link href="/reset-password" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </>
        )}

        {/* Register link */}
        <p className="text-center text-sm text-grappler-400 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
