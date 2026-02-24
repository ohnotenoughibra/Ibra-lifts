/**
 * Voice input utility using Web Speech API.
 * Zero dependencies — uses browser-native speech recognition.
 * Falls back gracefully when not supported.
 */

type SpeechRecognitionEvent = {
  results: { [index: number]: { [index: number]: { transcript: string; confidence: number } }; length: number };
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

// Browser compat: SpeechRecognition is prefixed in most browsers
function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SR || null;
}

export function isVoiceInputSupported(): boolean {
  return getSpeechRecognition() !== null;
}

interface VoiceInputOptions {
  /** Language code (default: 'en-US') */
  lang?: string;
  /** Timeout in ms before auto-stopping (default: 5000) */
  timeout?: number;
  /** Called with interim results as user speaks */
  onInterim?: (text: string) => void;
}

/**
 * Start voice input and return the transcribed text.
 * Resolves with the final transcript, rejects on error or timeout.
 */
export function startVoiceInput(options: VoiceInputOptions = {}): Promise<string> {
  const { lang = 'en-US', timeout = 5000, onInterim } = options;

  return new Promise((resolve, reject) => {
    const SR = getSpeechRecognition();
    if (!SR) {
      reject(new Error('Speech recognition not supported in this browser'));
      return;
    }

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = !!onInterim;
    recognition.maxAlternatives = 1;

    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      settled = true;
      clearTimeout(timeoutId);
      try { recognition.stop(); } catch { /* already stopped */ }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result[0]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((result as any).isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
      }

      if (interimTranscript && onInterim) {
        onInterim(interimTranscript);
      }

      if (finalTranscript) {
        cleanup();
        resolve(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (settled) return;
      cleanup();
      if (event.error === 'no-speech') {
        reject(new Error('No speech detected. Try again.'));
      } else if (event.error === 'not-allowed') {
        reject(new Error('Microphone access denied. Check browser permissions.'));
      } else {
        reject(new Error(`Voice input error: ${event.error}`));
      }
    };

    recognition.onend = () => {
      if (!settled) {
        cleanup();
        reject(new Error('Voice input ended without result. Try again.'));
      }
    };

    // Auto-timeout
    timeoutId = setTimeout(() => {
      if (!settled) {
        cleanup();
        reject(new Error('Voice input timed out. Try again.'));
      }
    }, timeout);

    try {
      recognition.start();
    } catch (err) {
      cleanup();
      reject(new Error('Failed to start voice input'));
    }
  });
}
