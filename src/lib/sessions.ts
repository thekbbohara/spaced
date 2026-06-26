import { useSyncExternalStore } from 'react';
import { storage } from './storage';
import { addTopic } from './topics';
import { logEvent } from './events';

export type RecallMode = 'write' | 'voice';

export type FocusSession = {
  id: string;
  topicId: string | null; // set when studying an existing lesson
  label: string;
  studyMs: number; // actual focused time (includes flow-mode overtime)
  recallMs: number; // time spent in the recall phase
  recallMode: RecallMode | null;
  recallText: string;
  recallAudioUri: string | null;
  flowMode: boolean;
  createdTopicId: string | null; // review topic spawned from a standalone session
  startedAt: string;
  completedAt: string;
};

const KEY = 'sessions';

// Active recall gets 15% of the studied time.
export const RECALL_FRACTION = 0.15;

export function recallTargetMs(studyMs: number): number {
  return Math.round(studyMs * RECALL_FRACTION);
}

const EMPTY_SESSIONS: FocusSession[] = []; // stable ref for useSyncExternalStore

function read(): FocusSession[] {
  return storage.get<FocusSession[]>(KEY, EMPTY_SESSIONS);
}

export type NewSession = {
  topicId: string | null;
  label: string;
  studyMs: number;
  recallMs: number;
  recallMode: RecallMode | null;
  recallText: string;
  recallAudioUri: string | null;
  flowMode: boolean;
};

export async function saveSession(input: NewSession): Promise<FocusSession> {
  const now = new Date();
  let createdTopicId: string | null = null;

  // A standalone session turns its recall into a topic that enters the
  // spaced-repetition schedule. Topic-linked sessions just log against the lesson.
  if (!input.topicId) {
    const mins = Math.round(input.studyMs / 60000);
    const topic = await addTopic(
      input.label,
      `Active recall after ${mins}m focus`,
      input.recallText
    );
    createdTopicId = topic.id;
  }

  const session: FocusSession = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    ...input,
    createdTopicId,
    startedAt: new Date(now.getTime() - input.studyMs - input.recallMs).toISOString(),
    completedAt: now.toISOString(),
  };
  storage.set(KEY, [session, ...read()]);
  logEvent('recall_session', { label: input.label });
  return session;
}

export function totalFocusMs(sessions: FocusSession[]): number {
  return sessions.reduce((sum, s) => sum + s.studyMs, 0);
}

export function useSessions(): FocusSession[] {
  return useSyncExternalStore((cb) => storage.subscribe(KEY, cb), read, read);
}

export function useSession(id: string): FocusSession | undefined {
  return useSessions().find((s) => s.id === id);
}
