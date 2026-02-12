'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function ThemeToggle() {
  const { themeMode, setThemeMode } = useAppStore();

  useEffect(() => {
    if (themeMode === 'light') {
      document.body.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f8fafc');
    } else {
      document.body.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0f172a');
    }
  }, [themeMode]);

  return (
    <button
      onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
      className={`relative w-10 h-6 rounded-full transition-colors flex items-center p-0.5 ${
        themeMode === 'dark' ? 'bg-grappler-700' : 'bg-gray-300'
      }`}
      aria-label="Toggle theme"
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center"
        animate={{ x: themeMode === 'dark' ? 0 : 16 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {themeMode === 'dark' ? (
          <Moon className="w-3 h-3 text-grappler-800" />
        ) : (
          <Sun className="w-3 h-3 text-yellow-500" />
        )}
      </motion.div>
    </button>
  );
}
