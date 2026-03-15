'use client';

import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-grappler-900 safe-area-top safe-area-bottom">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/[0.04] rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative flex flex-col items-center gap-8"
      >
        {/* Brand Mark */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative"
        >
          <img
            src="/icon-192.png"
            alt="Roots Gains"
            width={64}
            height={64}
            className="rounded-2xl shadow-lg shadow-primary-500/20"
          />
        </motion.div>

        {/* App Name */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-center"
        >
          <h1 className="text-2xl font-black text-grappler-50 tracking-tight font-display">
            Roots Gains
          </h1>
          <p className="text-xs text-grappler-400 mt-1.5 tracking-wide uppercase font-medium">
            Performance System
          </p>
        </motion.div>

        {/* Minimal loading bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-32 h-0.5 bg-grappler-800 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-primary-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
