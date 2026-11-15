import { useCallback, useEffect, useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { Message } from '../../types/api';
import { useRealtime } from '../realtime/RealtimeContext';

// FE-04: live events first; REST polling only while the live connection is down.
const POLL_INTERVAL_MS = 3000;

/**
 * Merges messages by id and keeps them ordered by id. The same message can arrive from the
 * POST response, a live event (possibly delivered twice) and a catch-up fetch: it is kept once,
 * and a later copy (e.g. with its attachment added) replaces the earlier one.
 */
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return [...byId.values()].sort((left, right) => left.id - right.id);
}

export function useMessages(conversationId: number, enabled: boolean) {
  const api = useApi();
  const { status, subscribe } = useRealtime();
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  const lastId = useRef<number | undefined>(undefined);

  const upsertMany = useCallback((incoming: Message[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => mergeMessages(current, incoming));
    const newest = Math.max(...incoming.map((message) => message.id));
    if (lastId.current === undefined || newest > lastId.current) {
      lastId.current = newest;
    }
  }, []);

  // Initial history (and reset when the conversation changes).
  useEffect(() => {
    setMessages([]);
    setError(null);
    setLoaded(false);
    lastId.current = undefined;
    if (!enabled) return;

    let active = true;
    api.messages
      .list(conversationId)
      .then((batch) => {
        if (!active) return;
        upsertMany(batch);
        setLoaded(true);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [api, conversationId, enabled, upsertMany]);

  // Live events for this conversation.
  useEffect(() => {
    if (!enabled) return;
    return subscribe((event) => {
      if (event.type === 'conversation.updated') return;
      if (event.message.conversation_id === conversationId) {
        upsertMany([event.message]);
      }
    });
  }, [enabled, conversationId, subscribe, upsertMany]);

  // Catch-up when (re)connected; polling fallback while not live.
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const fetchNew = () => {
      api.messages
        .list(conversationId, lastId.current)
        .then((batch) => {
          if (!active) return;
          upsertMany(batch);
          setError(null);
        })
        .catch((pollError: unknown) => {
          if (active) setError(pollError);
        });
    };

    if (status === 'live') {
      fetchNew(); // missed messages while the socket was down (BE-06: "retrieve missed messages using REST")
      return () => {
        active = false;
      };
    }
    const timer = window.setInterval(fetchNew, POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [api, conversationId, enabled, status, upsertMany]);

  const upsert = useCallback((message: Message) => upsertMany([message]), [upsertMany]);

  return { messages, error, loaded, upsert, liveStatus: status };
}
