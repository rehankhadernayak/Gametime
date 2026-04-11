/**
 * streamSSE — POST-based Server-Sent Events streaming for React Native / Expo Go.
 *
 * Uses XMLHttpRequest with onreadystatechange (readyState >= 3) to accumulate
 * responseText and parse SSE frames incrementally. This is the most compatible
 * approach across all React Native environments including Expo Go.
 *
 * @param {string}   url      - Full API URL (e.g. http://192.168.x.x:3001/ai/chat)
 * @param {object}   body     - JSON body to POST
 * @param {string}   token    - Bearer token (or '' for unauthenticated endpoints)
 * @param {function} onEvent  - Callback invoked for each parsed SSE event object
 * @returns {{ abort: () => void }}  Call abort() to cancel the ongoing stream
 */
export function streamSSE(url, body, token, onEvent) {
  const xhr = new XMLHttpRequest();
  let consumed = 0; // how many characters of responseText we have already parsed

  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', 'text/event-stream');
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }

  xhr.onreadystatechange = function () {
    // readyState 3 = LOADING (streaming), 4 = DONE
    if (xhr.readyState < 3) return;

    // Grab only the newly arrived text since last call
    const newChunk = xhr.responseText.slice(consumed);
    consumed = xhr.responseText.length;
    if (!newChunk) return;

    // Parse SSE format: one or more "data: <json>\n\n" blocks
    const lines = newChunk.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const event = JSON.parse(raw);
        onEvent(event);
      } catch {
        // Skip malformed frames — can happen if a frame spans two chunks
      }
    }
  };

  xhr.onerror = function () {
    onEvent({ type: 'error', message: 'Network error — check your connection.' });
  };

  xhr.ontimeout = function () {
    onEvent({ type: 'error', message: 'Request timed out.' });
  };

  // 90 second timeout for long AI responses
  xhr.timeout = 90000;

  xhr.send(JSON.stringify(body));

  return {
    abort: () => {
      try {
        xhr.abort();
      } catch {
        // ignore if already closed
      }
    },
  };
}
