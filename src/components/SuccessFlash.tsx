'use client';

import { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

interface SuccessFlashProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
}

export default memo(function SuccessFlash({ show, message, onComplete }: SuccessFlashProps) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-50"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
            <Check className="w-7 h-7 text-white" strokeWidth={3} />
          </div>
          {message && (
            <p className="mt-2 text-sm font-medium text-green-300">{message}</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
