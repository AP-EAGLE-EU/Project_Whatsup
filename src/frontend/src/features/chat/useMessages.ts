import { useCallback, useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { Message } from '../../types/api';

// REST polling first (Blueprint §3); WebSockets are planned and would replace this hook.
const POLL_INTERVAL_MS = 3000;

function merge(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return [...byId.values()].sort((left, right) => left.id - right.id);
}

export function useMessages(channelId: number, enabled: boolean) {
  const api = useApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setMessages([]);
    setError(null);
    if (!enabled) {
      return;
    }

    let active = true;
    let lastId: number | undefined;
    let timer: number | undefined;

    async function poll() {
      try {
        const batch = await api.messages.list(channelId, lastId);
        if (!active) return;
        const newest = batch.at(-1);
        if (newest !== undefined) {
          lastId = newest.id;
          setMessages((current) => merge(current, batch));
        }
        setError(null);
      } catch (pollError) {
        if (!active) return;
        setError(pollError);
      }
      if (active) {
        timer = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    }

    void poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, channelId, enabled]);

  const upsert = useCallback((message: Message) => {
    setMessages((current) => merge(current, [message]));
  }, []);

  return { messages, error, upsert };
}
