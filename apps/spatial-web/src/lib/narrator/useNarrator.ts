
import { useState, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { debounce } from 'lodash';

const functions = getFunctions();
const narrate = httpsCallable(functions, 'narrate');

const DEBOUNCE_DELAY = 1000; // 1 second

export function useNarrator() {
  const [narration, setNarration] = useState<string | null>(null);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const debouncedNarrate = useCallback(
    debounce(async (text: string) => {
      setIsNarrating(true);
      setError(null);
      try {
        const result = await narrate({ text });
        setNarration(result.data.narration as string);
      } catch (e) {
        setError(e as Error);
        console.error("Narration failed:", e);
      } finally {
        setIsNarrating(false);
      }
    }, DEBOUNCE_DELAY),
    []
  );

  const requestNarration = (text: string) => {
    debouncedNarrate(text);
  };

  return { narration, isNarrating, error, requestNarration };
}
