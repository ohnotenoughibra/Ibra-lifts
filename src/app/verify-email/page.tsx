'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Dumbbell } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token provided.');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Something went wrong. Please try again.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        <div className="w-16 h-16 bg-primary-500/20 rounded-lg flex items-center justify-center mx-auto mb-6">
          <Dumbbell className="w-8 h-8 text-primary-400" />
        </div>

        {status === 'loading' && (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto" />
            <p className="text-grappler-300">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <h1 className="text-xl font-bold text-grappler-50">Email Verified!</h1>
            <p className="text-sm text-grappler-400">Cloud sync is now enabled. Your data will be backed up automatically.</p>
            <Link
              href="/"
              className="inline-block mt-4 px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors"
            >
              Back to App
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-grappler-50">Verification Failed</h1>
            <p className="text-sm text-grappler-400">{errorMsg}</p>
            <Link
              href="/"
              className="inline-block mt-4 px-6 py-3 rounded-xl bg-grappler-700 text-grappler-200 font-semibold text-sm hover:bg-grappler-600 transition-colors"
            >
              Back to App
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
