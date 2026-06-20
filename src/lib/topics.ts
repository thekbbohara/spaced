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
import { deleteFile } from './files';

function resourceId(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

let cardSeq = 0;
function cardId(): string {
  return `c-${Date.now()}-${cardSeq++}-${Math.random().toString(36).slice(2, 5)}`;
}

export type Review = { date: string; remembered: boolean };

// A flashcard inside a topic's deck. Each card is scheduled independently
// (per-card spaced repetition) using the same INTERVALS as topics.
export type Card = {
  id: string;
  front: string;
  back: string;
  stage: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  mastered: boolean;
};

export type NoteResource = { id: string; type: 'note'; text: string; createdAt: string };
export type LinkResource = {
  id: string;
  type: 'link';
  title: string;
  url: string;
  createdAt: string;
};
export type FileResource = {
  id: string;
  type: 'file';
  name: string;
  uri: string;
  mime: string;
  isImage: boolean;
  createdAt: string;
};
export type Resource = NoteResource | LinkResource | FileResource;

export type ResourceInput =
  | { type: 'note'; text: string }
  | { type: 'link'; title: string; url: string }
  | { type: 'file'; name: string; uri: string; mime: string; isImage: boolean };

export type Topic = {
  id: string;
  title: string;
  notes: string;
  answer: string; // optional flashcard back; reveal-then-grade
  resources?: Resource[]; // notes, links, attachments — study hub
  cards?: Card[]; // flashcard deck — per-card spaced repetition
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

function mutateTopic(id: string, fn: (t: Topic) => Topic) {
  write(read().map((t) => (t.id === id ? fn(t) : t)));
}

export function addResource(topicId: string, input: ResourceInput) {
  const resource = { ...input, id: resourceId(), createdAt: new Date().toISOString() } as Resource;
  mutateTopic(topicId, (t) => ({ ...t, resources: [...(t.resources ?? []), resource] }));
}

export function updateResource(
  topicId: string,
  resourceId: string,
  patch: Partial<Pick<NoteResource, 'text'> & Pick<LinkResource, 'title' | 'url'>>
) {
  mutateTopic(topicId, (t) => ({
    ...t,
    resources: (t.resources ?? []).map((r) =>
      r.id === resourceId ? ({ ...r, ...patch } as Resource) : r
    ),
  }));
}

export function removeResource(topicId: string, resourceId: string) {
  const topic = read().find((t) => t.id === topicId);
  const target = topic?.resources?.find((r) => r.id === resourceId);
  if (target?.type === 'file') deleteFile(target.uri);
  mutateTopic(topicId, (t) => ({
    ...t,
    resources: (t.resources ?? []).filter((r) => r.id !== resourceId),
  }));
}

// --- Flashcard deck (per-card spaced repetition) ---

function makeCard(front: string, back: string): Card {
  return {
    id: cardId(),
    front: front.trim(),
    back: back.trim(),
    stage: 0,
    lastReviewedAt: null,
    nextReviewAt: startOfDay(new Date()).toISOString(), // new cards are due now
    mastered: false,
  };
}

export function addCard(topicId: string, front: string, back: string) {
  mutateTopic(topicId, (t) => ({ ...t, cards: [...(t.cards ?? []), makeCard(front, back)] }));
}

export function addCards(topicId: string, pairs: { front: string; back: string }[]) {
  const made = pairs.map((p) => makeCard(p.front, p.back));
  mutateTopic(topicId, (t) => ({ ...t, cards: [...(t.cards ?? []), ...made] }));
}

export function updateCard(
  topicId: string,
  cardIdValue: string,
  patch: { front?: string; back?: string }
) {
  mutateTopic(topicId, (t) => ({
    ...t,
    cards: (t.cards ?? []).map((c) =>
      c.id === cardIdValue
        ? { ...c, ...(patch.front != null && { front: patch.front.trim() }), ...(patch.back != null && { back: patch.back.trim() }) }
        : c
    ),
  }));
}

export function deleteCard(topicId: string, cardIdValue: string) {
  mutateTopic(topicId, (t) => ({
    ...t,
    cards: (t.cards ?? []).filter((c) => c.id !== cardIdValue),
  }));
}

export function gradeCard(topicId: string, cardIdValue: string, good: boolean) {
  const now = new Date();
  mutateTopic(topicId, (t) => ({
    ...t,
    cards: (t.cards ?? []).map((c) => {
      if (c.id !== cardIdValue) return c;
      const stage = good ? c.stage + 1 : 0;
      const mastered = good && stage >= INTERVALS.length;
      const nextReviewAt = good
        ? mastered
          ? null
          : startOfDay(addDays(now, intervalForStage(stage))).toISOString()
        : startOfDay(now).toISOString(); // "Again" → still due today
      return { ...c, stage, mastered, lastReviewedAt: now.toISOString(), nextReviewAt };
    }),
  }));
}

export function isCardDue(card: Card, on: Date = new Date()): boolean {
  if (card.mastered || !card.nextReviewAt) return false;
  return startOfDay(new Date(card.nextReviewAt)) <= startOfDay(on);
}

export function dueCards(topic: Topic, on: Date = new Date()): Card[] {
  return (topic.cards ?? []).filter((c) => isCardDue(c, on));
}

export function cardCounts(topic: Topic, on: Date = new Date()) {
  const cards = topic.cards ?? [];
  return {
    total: cards.length,
    due: cards.filter((c) => isCardDue(c, on)).length,
    mastered: cards.filter((c) => c.mastered).length,
  };
}

// Parse pasted text into front/back pairs, splitting each line on the first
// separator. Anything after the first separator becomes the back.
export const CARD_SEPARATORS = [
  { label: 'Dash  -', value: '-' },
  { label: 'Comma  ,', value: ',' },
  { label: 'Tab', value: '\t' },
  { label: 'Pipe  |', value: '|' },
  { label: 'Colon  :', value: ':' },
] as const;

export function parseCards(text: string, sep: string): { front: string; back: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(sep);
      if (idx < 0) return null;
      const front = line.slice(0, idx).trim();
      const back = line.slice(idx + sep.length).trim();
      if (!front || !back) return null;
      return { front, back };
    })
    .filter((p): p is { front: string; back: string } => p != null);
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
  topic?.resources?.forEach((r) => {
    if (r.type === 'file') deleteFile(r.uri);
  });
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
  // Deck topics are reviewed card-by-card, not as a single recall.
  if ((topic.cards?.length ?? 0) > 0) return false;
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
