/**
 * Barcode scanning + Open Food Facts lookup.
 * Uses BarcodeDetector API (Chrome 83+, Edge 83+) for camera scanning.
 * Falls back to manual barcode entry when not supported.
 * Looks up nutrition via Open Food Facts (free, no API key needed).
 */

export interface BarcodeNutrition {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  imageUrl?: string;
  barcode: string;
}

/** Check if the browser supports the BarcodeDetector API */
export function isBarcodeDetectorSupported(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return 'BarcodeDetector' in window && typeof (window as any).BarcodeDetector === 'function';
}

/**
 * Detect barcodes from a video element using BarcodeDetector API.
 * Returns the first detected barcode string, or null.
 */
export async function detectBarcode(videoEl: HTMLVideoElement): Promise<string | null> {
  if (!isBarcodeDetectorSupported()) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
    });
    const barcodes = await detector.detect(videoEl);
    if (barcodes.length > 0) {
      return barcodes[0].rawValue;
    }
  } catch {
    // Detection failed silently
  }
  return null;
}

/**
 * Look up a barcode on Open Food Facts.
 * Uses our API proxy to avoid CORS issues.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeNutrition | null> {
  try {
    const res = await fetch(`/api/nutrition/lookup?barcode=${encodeURIComponent(barcode)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    return data as BarcodeNutrition;
  } catch {
    return null;
  }
}

/**
 * Search Open Food Facts by text query.
 * Returns top matches with nutrition data.
 */
export async function searchFoodAPI(query: string): Promise<BarcodeNutrition[]> {
  try {
    const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Start camera stream for barcode scanning.
 * Returns a cleanup function to stop the stream.
 */
export async function startCameraStream(
  videoEl: HTMLVideoElement,
  onBarcodeDetected: (barcode: string) => void
): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
  });

  videoEl.srcObject = stream;
  await videoEl.play();

  let scanning = true;
  let animFrame: number;

  const scan = async () => {
    if (!scanning) return;

    const code = await detectBarcode(videoEl);
    if (code) {
      onBarcodeDetected(code);
      return; // Stop scanning after first detection
    }

    animFrame = requestAnimationFrame(scan);
  };

  // Start scanning loop
  if (isBarcodeDetectorSupported()) {
    animFrame = requestAnimationFrame(scan);
  }

  return () => {
    scanning = false;
    cancelAnimationFrame(animFrame);
    stream.getTracks().forEach(t => t.stop());
    videoEl.srcObject = null;
  };
}
