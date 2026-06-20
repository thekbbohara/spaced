import { useSyncExternalStore } from 'react';
import { storage } from './storage';
import {
  addDays,
  DEFAULT_REMINDER_HOUR,
  intervalForStage,
  INTERVALS,
  startOfDay,
} from './schedule';
import { cancel, ensurePermission, scheduleForTopic } from './notifications';

export type Review = { date: string; remembered: boolean };

export type Topic = {
  id: string;
  title: string;
  notes: string;
  answer: string; // optional flashcard back; reveal-then-grade
  createdAt: string;
  stage: number;
  lastReviewedAt: string;
  nextReviewAt: string | null;
  mastered: boolean;
  history: Review[];
  notificationId: string | null;
};

const KEY = 'topics';
const SETTINGS_KEY = 'settings';

export type Settings = { remindersEnabled: boolean; reminderHour: number };
const DEFAULT_SETTINGS: Settings = {
  remindersEnabled: true,
  reminderHour: DEFAULT_REMINDER_HOUR,
};

const EMPTY_TOPICS: Topic[] = []; // stable ref for useSyncExternalStore default

function read(): Topic[] {
  return storage.get<Topic[]>(KEY, EMPTY_TOPICS);
}

function write(topics: Topic[]) {
  storage.set(KEY, topics);
}

function getSettings(): Settings {
  // Must return a stable reference for useSyncExternalStore — no fresh merge here.
  return storage.get<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);
}

// One-time migration: normalize older settings (pre reminderHour) to full shape.
(function migrateSettings() {
  const raw = storage.get<Partial<Settings> | null>(SETTINGS_KEY, null);
  if (raw && (raw.remindersEnabled === undefined || raw.reminderHour === undefined)) {
    storage.set<Settings>(SETTINGS_KEY, { ...DEFAULT_SETTINGS, ...raw });
  }
})();

function nextAfter(stage: number, from: Date): string {
  return startOfDay(addDays(from, intervalForStage(stage))).toISOString();
}

async function syncReminder(topic: Topic) {
  await cancel(topic.notificationId);
  let notificationId: string | null = null;
  const settings = getSettings();
  if (settings.remindersEnabled) {
    notificationId = await scheduleForTopic(
      topic.id,
      topic.title,
      topic.nextReviewAt,
      settings.reminderHour
    );
  }
  // Persist the new notification id without disturbing other edits.
  write(read().map((t) => (t.id === topic.id ? { ...t, notificationId } : t)));
}

export async function addTopic(
  title: string,
  notes: string,
  answer = ''
): Promise<Topic> {
  const now = new Date();
  const topic: Topic = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim(),
    notes: notes.trim(),
    answer: answer.trim(),
    createdAt: now.toISOString(),
    stage: 0,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: nextAfter(0, now),
    mastered: false,
    history: [],
    notificationId: null,
  };
  write([topic, ...read()]);
  await syncReminder(topic);
  return topic;
}

export async function editTopic(
  id: string,
  fields: { title: string; notes: string; answer: string }
) {
  let updated: Topic | undefined;
  write(
    read().map((t) => {
      if (t.id !== id) return t;
      updated = {
        ...t,
        title: fields.title.trim(),
        notes: fields.notes.trim(),
        answer: fields.answer.trim(),
      };
      return updated;
    })
  );
  if (updated) await syncReminder(updated); // title changed → reminder text
}

// --- Undo support: keep the pre-review snapshot so a mis-tap can be reverted.
let pendingUndo: Topic | null = null;
const undoListeners = new Set<() => void>();
function setUndo(topic: Topic | null) {
  pendingUndo = topic;
  undoListeners.forEach((fn) => fn());
}

export async function reviewTopic(id: string, remembered: boolean) {
  const now = new Date();
  let before: Topic | undefined;
  let updated: Topic | undefined;
  const topics = read().map((t) => {
    if (t.id !== id) return t;
    before = t;
    const stage = remembered ? t.stage + 1 : 0;
    const mastered = remembered && stage >= INTERVALS.length;
    updated = {
      ...t,
      stage,
      mastered,
      lastReviewedAt: now.toISOString(),
      nextReviewAt: mastered ? null : nextAfter(stage, now),
      history: [...t.history, { date: now.toISOString(), remembered }],
    };
    return updated;
  });
  write(topics);
  if (before) setUndo(before);
  if (updated) await syncReminder(updated);
}

export async function undoReview() {
  if (!pendingUndo) return;
  const snapshot = pendingUndo;
  setUndo(null);
  write(read().map((t) => (t.id === snapshot.id ? snapshot : t)));
  await syncReminder(snapshot);
}

export function clearUndo() {
  if (pendingUndo) setUndo(null);
}

export function useUndo(): Topic | null {
  return useSyncExternalStore(
    (cb) => {
      undoListeners.add(cb);
      return () => undoListeners.delete(cb);
    },
    () => pendingUndo,
    () => pendingUndo
  );
}

export async function deleteTopic(id: string) {
  const topic = read().find((t) => t.id === id);
  await cancel(topic?.notificationId ?? null);
  clearUndo();
  write(read().filter((t) => t.id !== id));
}

export async function setRemindersEnabled(enabled: boolean) {
  if (enabled) await ensurePermission();
  storage.set<Settings>(SETTINGS_KEY, { ...getSettings(), remindersEnabled: enabled });
  for (const topic of read()) await syncReminder(topic);
}

export async function setReminderHour(hour: number) {
  storage.set<Settings>(SETTINGS_KEY, { ...getSettings(), reminderHour: hour });
  for (const topic of read()) await syncReminder(topic);
}

export function isDue(topic: Topic, on: Date = new Date()): boolean {
  if (topic.mastered || !topic.nextReviewAt) return false;
  return startOfDay(new Date(topic.nextReviewAt)) <= startOfDay(on);
}

export function isStudiedToday(topic: Topic, on: Date = new Date()): boolean {
  return startOfDay(new Date(topic.createdAt)).getTime() === startOfDay(on).getTime();
}

export function useTopics(): Topic[] {
  return useSyncExternalStore((cb) => storage.subscribe(KEY, cb), read, read);
}

export function useTopic(id: string): Topic | undefined {
  return useTopics().find((t) => t.id === id);
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => storage.subscribe(SETTINGS_KEY, cb),
    getSettings,
    getSettings
  );
}
