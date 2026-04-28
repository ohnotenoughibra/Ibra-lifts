'use client';

import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-grappler-900">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6"
      >
        {/* Editorial wordmark */}
        <div className="text-center">
          <div className="font-display text-5xl md:text-6xl font-black tracking-tight leading-none text-white">
            IBRA<br />LIFTS<span className="text-primary-500">.</span>
          </div>
          <p className="text-[10px] text-grappler-500 mt-3 tracking-[0.3em] uppercase">
            Performance System
          </p>
        </div>

        {/* Minimal loading bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-32 h-px bg-grappler-800 overflow-hidden"
        >
          <motion.div
            className="h-full bg-primary-500"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
