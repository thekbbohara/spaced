import { useSyncExternalStore } from 'react';
import { storage } from './storage';

// Append-only activity log. Everything happens on-device, so this is the full
// history of what you did: app opens, topics created, every card/topic review
// outcome, skips, and recall sessions.
export type EventType =
  | 'app_open'
  | 'topic_created'
  | 'topic_reviewed'
  | 'card_reviewed'
  | 'card_skipped'
  | 'recall_session';

// For reviews: how it went. 'recalled' (good), 'half' (hard), 'forgot' (again),
// 'skipped' (no grade).
export type ReviewOutcome = 'recalled' | 'half' | 'forgot' | 'skipped';

export type ActivityEvent = {
  id: string;
  at: string; // ISO timestamp
  type: EventType;
  label?: string; // topic/card title or session label
  outcome?: ReviewOutcome;
};

const KEY = 'events';
const CAP = 2000; // keep the most recent N events
const EMPTY: ActivityEvent[] = []; // stable ref for useSyncExternalStore

function read(): ActivityEvent[] {
  return storage.get<ActivityEvent[]>(KEY, EMPTY);
}

export function logEvent(type: EventType, fields: { label?: string; outcome?: ReviewOutcome } = {}) {
  const event: ActivityEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    type,
    ...fields,
  };
  const next = [event, ...read()];
  storage.set(KEY, next.length > CAP ? next.slice(0, CAP) : next);
}

export function useEvents(): ActivityEvent[] {
  return useSyncExternalStore((cb) => storage.subscribe(KEY, cb), read, read);
}

export function clearEvents() {
  storage.set(KEY, []);
}
