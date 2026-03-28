'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader2, AlertCircle, Plus, ScanBarcode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lookupBarcode, type BarcodeProduct } from '@/lib/barcode-lookup';
import type { MealType } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

type ScannerState =
  | { phase: 'scanning' }
  | { phase: 'loading'; barcode: string }
  | { phase: 'found'; product: BarcodeProduct }
  | { phase: 'not_found'; barcode: string }
  | { phase: 'error'; message: string };

interface BarcodeScannerProps {
  onAdd: (item: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    portion?: string;
  }, mealType?: MealType) => void;
  onClose: () => void;
  defaultMealType?: MealType;
}

// ── Meal type labels ─────────────────────────────────────────────────────────

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function BarcodeScanner({ onAdd, onClose, defaultMealType }: BarcodeScannerProps) {
  const [state, setState] = useState<ScannerState>({ phase: 'scanning' });
  const [mealType, setMealType] = useState<MealType>(defaultMealType ?? 'snack');
  const [servings, setServings] = useState(1);

  // Manual fallback form
  const [manualName, setManualName] = useState('');
  const [manualCal, setManualCal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void } | null>(null);
  const hasProcessedRef = useRef(false);

  // ── Start camera + scanner ───────────────────────────────────────────────

  const startScanner = useCallback(async () => {
    hasProcessedRef.current = false;
    setState({ phase: 'scanning' });

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = { stop: () => scanner.stop().catch(() => {}) };

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.5,
        },
        async (decodedText) => {
          if (hasProcessedRef.current) return;
          hasProcessedRef.current = true;

          // Haptic feedback
          if (navigator.vibrate) navigator.vibrate(50);

          scanner.stop().catch(() => {});
          setState({ phase: 'loading', barcode: decodedText });

          const product = await lookupBarcode(decodedText);
          if (product) {
            setState({ phase: 'found', product });
          } else {
            setState({ phase: 'not_found', barcode: decodedText });
          }
        },
        () => {
          // Scan failure (no barcode detected in frame) — ignore
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      setState({ phase: 'error', message: msg });
    }
  }, []);

  useEffect(() => {
    startScanner();
    return () => {
      scannerRef.current?.stop();
    };
  }, [startScanner]);

  // ── Add product to meal log ──────────────────────────────────────────────

  const handleAddProduct = () => {
    if (state.phase !== 'found') return;
    const { macros, name, brand, servingSize } = state.product;
    const s = servings;
    onAdd(
      {
        name: brand ? `${name} (${brand})` : name,
        calories: Math.round(macros.calories * s),
        protein: Math.round(macros.protein * s * 10) / 10,
        carbs: Math.round(macros.carbs * s * 10) / 10,
        fat: Math.round(macros.fat * s * 10) / 10,
        portion: s === 1 ? servingSize : `${s}x ${servingSize}`,
      },
      mealType,
    );
    onClose();
  };

  // ── Manual entry submit ──────────────────────────────────────────────────

  const handleManualAdd = () => {
    const cal = parseFloat(manualCal.replace(',', '.')) || 0;
    if (!manualName.trim() || cal === 0) return;
    onAdd(
      {
        name: manualName.trim(),
        calories: cal,
        protein: parseFloat(manualProtein.replace(',', '.')) || 0,
        carbs: parseFloat(manualCarbs.replace(',', '.')) || 0,
        fat: parseFloat(manualFat.replace(',', '.')) || 0,
      },
      mealType,
    );
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-grappler-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-grappler-200">
          <ScanBarcode className="w-5 h-5 text-primary-400" />
          <span className="text-sm font-medium">Scan Barcode</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-grappler-400 hover:text-grappler-200 transition-colors"
          aria-label="Close scanner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scanner viewport */}
      {state.phase === 'scanning' && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div
            id="barcode-reader"
            className="w-full max-w-sm rounded-2xl overflow-hidden"
          />
          <p className="mt-4 text-sm text-grappler-500 text-center">
            Point camera at a barcode on food packaging
          </p>
        </div>
      )}

      {/* Hidden video element for camera (used by html5-qrcode internally) */}
      <video ref={videoRef} className="hidden" />

      {/* Loading state */}
      {state.phase === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <p className="text-sm text-grappler-400">Looking up product...</p>
          <p className="text-xs text-grappler-600 font-mono">{state.barcode}</p>
        </div>
      )}

      {/* Error state */}
      {state.phase === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <Camera className="w-10 h-10 text-grappler-600" />
          <p className="text-sm text-grappler-300 text-center">
            Could not access camera
          </p>
          <p className="text-xs text-grappler-500 text-center">{state.message}</p>
          <button
            onClick={startScanner}
            className="mt-4 px-4 py-2 bg-primary-500 text-white text-sm rounded-xl hover:bg-primary-600 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Product found */}
      <AnimatePresence>
        {state.phase === 'found' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="flex-1 flex flex-col px-4 pt-6 pb-8 overflow-y-auto"
          >
            {/* Product card */}
            <div className="bg-grappler-800 rounded-2xl p-4 space-y-4">
              <div className="flex gap-3">
                {state.product.imageUrl && (
                  <img
                    src={state.product.imageUrl}
                    alt={state.product.name}
                    className="w-16 h-16 rounded-xl object-cover bg-grappler-700"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-grappler-100 truncate">
                    {state.product.name}
                  </h3>
                  {state.product.brand && (
                    <p className="text-xs text-grappler-500 truncate">{state.product.brand}</p>
                  )}
                  {state.product.servingSize && (
                    <p className="text-xs text-grappler-500 mt-0.5">
                      Serving: {state.product.servingSize}
                    </p>
                  )}
                </div>
              </div>

              {/* Macros grid */}
              <div className="grid grid-cols-4 gap-2">
                {([
                  { label: 'Calories', value: state.product.macros.calories * servings, unit: '' },
                  { label: 'Protein', value: state.product.macros.protein * servings, unit: 'g' },
                  { label: 'Carbs', value: state.product.macros.carbs * servings, unit: 'g' },
                  { label: 'Fat', value: state.product.macros.fat * servings, unit: 'g' },
                ] as const).map(({ label, value, unit }) => (
                  <div key={label} className="bg-grappler-900/50 rounded-xl p-2 text-center">
                    <p className="text-xs text-grappler-500">{label}</p>
                    <p className="text-sm font-semibold text-grappler-200">
                      {Math.round(value * 10) / 10}{unit}
                    </p>
                  </div>
                ))}
              </div>

              {/* Servings */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-grappler-500 shrink-0">Servings</span>
                <div className="flex items-center gap-2 flex-1">
                  {[0.5, 1, 1.5, 2, 3].map(s => (
                    <button
                      key={s}
                      onClick={() => setServings(s)}
                      className={cn(
                        'flex-1 py-1.5 text-xs rounded-lg transition-colors',
                        servings === s
                          ? 'bg-primary-500 text-white'
                          : 'bg-grappler-700 text-grappler-400 hover:text-grappler-200',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meal type */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-grappler-500 shrink-0">Meal</span>
                <select
                  value={mealType}
                  onChange={e => setMealType(e.target.value as MealType)}
                  className="flex-1 bg-grappler-700 text-grappler-200 text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary-500/50"
                >
                  {(Object.entries(MEAL_TYPE_LABELS) as [MealType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setServings(1);
                  startScanner();
                }}
                className="flex-1 py-3 bg-grappler-800 text-grappler-300 text-sm rounded-xl hover:bg-grappler-700 transition-colors"
              >
                Scan again
              </button>
              <button
                onClick={handleAddProduct}
                className="flex-1 py-3 bg-primary-500 text-white text-sm font-medium rounded-xl hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add to log
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not found — manual entry fallback */}
      <AnimatePresence>
        {state.phase === 'not_found' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="flex-1 flex flex-col px-4 pt-6 pb-8 overflow-y-auto"
          >
            <div className="bg-grappler-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">Product not found</p>
              </div>
              <p className="text-xs text-grappler-500">
                Barcode <span className="font-mono">{state.barcode}</span> is not in the
                OpenFoodFacts database. Enter the info manually from the label.
              </p>

              {/* Manual form */}
              <div className="space-y-3">
                <input
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder="Product name"
                  className="w-full bg-grappler-900/50 rounded-xl px-3 py-2.5 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={manualCal}
                    onChange={e => setManualCal(e.target.value)}
                    placeholder="Calories"
                    inputMode="decimal"
                    className="bg-grappler-900/50 rounded-xl px-3 py-2.5 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50"
                  />
                  <input
                    value={manualProtein}
                    onChange={e => setManualProtein(e.target.value)}
                    placeholder="Protein (g)"
                    inputMode="decimal"
                    className="bg-grappler-900/50 rounded-xl px-3 py-2.5 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50"
                  />
                  <input
                    value={manualCarbs}
                    onChange={e => setManualCarbs(e.target.value)}
                    placeholder="Carbs (g)"
                    inputMode="decimal"
                    className="bg-grappler-900/50 rounded-xl px-3 py-2.5 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50"
                  />
                  <input
                    value={manualFat}
                    onChange={e => setManualFat(e.target.value)}
                    placeholder="Fat (g)"
                    inputMode="decimal"
                    className="bg-grappler-900/50 rounded-xl px-3 py-2.5 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50"
                  />
                </div>

                {/* Meal type */}
                <select
                  value={mealType}
                  onChange={e => setMealType(e.target.value as MealType)}
                  className="w-full bg-grappler-900/50 text-grappler-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary-500/50"
                >
                  {(Object.entries(MEAL_TYPE_LABELS) as [MealType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={startScanner}
                className="flex-1 py-3 bg-grappler-800 text-grappler-300 text-sm rounded-xl hover:bg-grappler-700 transition-colors"
              >
                Scan again
              </button>
              <button
                onClick={handleManualAdd}
                disabled={!manualName.trim() || !(parseFloat(manualCal.replace(',', '.')) > 0)}
                className="flex-1 py-3 bg-primary-500 text-white text-sm font-medium rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add manually
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
