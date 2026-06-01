import { useMemo } from 'react';
import { useSsePostStream } from '@/hooks/useSsePostStream';

/**
 * Stable SSE stream hook — resolves analyze URL once on mount (client)
 * so useSsePostStream's start callback is not recreated every render.
 */
export function useAnalyzeSse(getAnalyzeUrl) {
  const url = useMemo(() => getAnalyzeUrl(), []);
  return useSsePostStream(url);
}
