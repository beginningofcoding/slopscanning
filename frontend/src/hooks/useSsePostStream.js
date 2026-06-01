import { useState, useCallback, useRef } from 'react';

/**
 * useSsePostStream - Custom hook to consume SSE from a POST request.
 * 
 * @param {string} url - The endpoint URL
 */
export function useSsePostStream(url) {
  const [events, setEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | streaming | complete | error
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const start = useCallback(async (payload) => {
    // Reset state
    setEvents([]);
    setResult(null);
    setStatus('streaming');
    setError(null);

    // Create a new abort controller for this request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const errBody = await response.json();
          detail = errBody.detail || errBody.message || detail;
          if (typeof detail !== 'string') detail = JSON.stringify(detail);
        } catch (_) {
          try {
            detail = (await response.text()).slice(0, 200) || detail;
          } catch (_) {}
        }
        throw new Error(detail);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Split chunks by double newline (SSE format)
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; // Keep the incomplete chunk in the buffer

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const dataStr = part.slice(6);
            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === 'progress') {
                setEvents((prev) => [...prev, data]);
                if (data.percent === 100) {
                  setStatus('complete');
                }
              } else if (data.type === 'result') {
                setResult({ data: data.data });
              } else if (data.type === 'error') {
                setError(data.message || 'Analysis failed');
                setStatus('error');
              }
            } catch (e) {
              console.error('Error parsing SSE JSON:', e);
            }
          }
        }
      }
      
      // Check if it finished without hitting the 100% complete event
      setStatus((prev) => (prev === 'streaming' ? 'complete' : prev));
      
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        console.error('Stream error:', err);
        setError(err.message || 'Stream error');
        setStatus('error');
      }
    }
  }, [url]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const lastEvent = events[events.length - 1] || null;

  return { events, lastEvent, result, status, error, start, abort };
}
