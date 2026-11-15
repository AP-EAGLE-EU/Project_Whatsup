// Live WebSocket client (FE-04 / contract v0.2 "WebSocket conventions", BE-06 #11).
// Same origin, authenticated by the session cookie at the handshake; the server only sends
// events for conversations the user takes part in. When the socket is down, the chat falls
// back to REST polling and catches up with ?after_id= on reconnect.
import type { RealtimeHandlers } from '../types/api';
import { parseRealtimeEvent } from './parsers';

const WS_PATH = '/api/ws';
const CLOSE_UNAUTHORIZED = 4401;
const BACKOFF_STEPS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];

export function connectLiveRealtime(handlers: RealtimeHandlers): () => void {
  let socket: WebSocket | null = null;
  let attempt = 0;
  let retryTimer: number | undefined;
  let closedByUs = false;

  function scheduleReconnect() {
    const wait = BACKOFF_STEPS_MS[Math.min(attempt, BACKOFF_STEPS_MS.length - 1)];
    attempt += 1;
    retryTimer = window.setTimeout(open, wait);
  }

  function open() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    handlers.onStatus('connecting');
    try {
      socket = new WebSocket(`${protocol}//${window.location.host}${WS_PATH}`);
    } catch {
      handlers.onStatus('offline');
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      attempt = 0;
      handlers.onStatus('live');
    };

    socket.onmessage = (frame: MessageEvent) => {
      if (typeof frame.data !== 'string') return;
      try {
        const event = parseRealtimeEvent(JSON.parse(frame.data));
        if (event !== null) handlers.onEvent(event);
      } catch {
        // Malformed frames are dropped, never rendered.
      }
    };

    socket.onclose = (closeEvent: CloseEvent) => {
      socket = null;
      if (closedByUs) return;
      if (closeEvent.code === CLOSE_UNAUTHORIZED) {
        handlers.onUnauthorized();
        return;
      }
      handlers.onStatus('offline');
      scheduleReconnect();
    };
  }

  open();

  return () => {
    closedByUs = true;
    window.clearTimeout(retryTimer);
    socket?.close(1000, 'client closed');
  };
}
