import { useSyncExternalStore } from 'react';
import { storage } from './storage';
import {
  addDays,
  DEFAULT_REMINDER_HOUR,
  intervalForStage,
  INTERVALS,
  startOfDay,
} from './schedule';
import { ensurePermission, syncReviewReminders } from './notifications';
import { updateDueWidget } from './widget';
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
  starred?: boolean;
  introducedAt?: string | null; // first time the card was graded; gates new-per-hour
  lapses?: number; // total times forgotten; a "leech" auto-stars at LEECH_LAPSES
  frontImage?: string | null; // durable image uri shown with the front
  backImage?: string | null; // durable image uri shown with the back
};

// A card forgotten this many times auto-stars as a hard card ("leech").
export const LEECH_LAPSES = 4;

// At most this many brand-new cards enter due/study within a rolling hour.
export const NEW_PER_HOUR = 10;

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
  keyPoints?: string; // free-form "what to study" — the key points to recall
  resources?: Resource[]; // notes, links, attachments — study hub
  cards?: Card[]; // flashcard deck — per-card spaced repetition
  createdAt: string;
  stage: number;
  lastReviewedAt: string;
  nextReviewAt: string | null;
  mastered: boolean;
  history: Review[];
  notificationId: string | null;
  groupId?: string | null; // folder-tree node it lives under; null/undefined = ungrouped
};

const KEY = 'topics';
const SETTINGS_KEY = 'settings';

export type Settings = {
  remindersEnabled: boolean;
  reminderHour: number;
  newPerHour?: number; // cap on brand-new cards surfaced per rolling hour
};
const DEFAULT_SETTINGS: Settings = {
  remindersEnabled: true,
  reminderHour: DEFAULT_REMINDER_HOUR,
  newPerHour: NEW_PER_HOUR,
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

// How many cards/topics are reviewable right now — drives the reminder count.
export function dueTodayCount(on: Date = new Date()): number {
  return read().reduce((sum, t) => {
    if ((t.cards?.length ?? 0) > 0) return sum + availableCards(t, on).length;
    return sum + (isDue(t, on) ? 1 : 0);
  }, 0);
}

// Reschedule the whole aggregate reminder batch from the current due state, and
// refresh the home-screen widget with the same count.
export async function syncReminders() {
  const settings = getSettings();
  const dueCount = dueTodayCount();
  await syncReviewReminders({
    enabled: settings.remindersEnabled,
    hour: settings.reminderHour,
    dueCount,
  });
  await updateDueWidget(dueCount);
}

export async function addTopic(
  title: string,
  notes: string,
  answer = '',
  groupId: string | null = null,
  keyPoints = ''
): Promise<Topic> {
  const now = new Date();
  const topic: Topic = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim(),
    notes: notes.trim(),
    answer: answer.trim(),
    keyPoints: keyPoints.trim(),
    createdAt: now.toISOString(),
    stage: 0,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: nextAfter(0, now),
    mastered: false,
    history: [],
    notificationId: null,
    groupId,
  };
  write([topic, ...read()]);
  await syncReminders();
  return topic;
}

export async function editTopic(
  id: string,
  fields: {
    title: string;
    notes: string;
    answer: string;
    keyPoints?: string;
    groupId?: string | null;
  }
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
        keyPoints: fields.keyPoints !== undefined ? fields.keyPoints.trim() : t.keyPoints,
        groupId: fields.groupId !== undefined ? fields.groupId : t.groupId ?? null,
      };
      return updated;
    })
  );
  if (updated) await syncReminders();
}

// Move a topic to a folder node (or null to ungroup).
export function setTopicGroup(id: string, groupId: string | null) {
  mutateTopic(id, (t) => ({ ...t, groupId }));
}

// Re-attach every topic in one group to another (used when deleting a folder).
export function reassignGroupTopics(fromGroupId: string, toGroupId: string | null) {
  write(read().map((t) => (t.groupId === fromGroupId ? { ...t, groupId: toGroupId } : t)));
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

function makeCard(
  front: string,
  back: string,
  frontImage: string | null = null,
  backImage: string | null = null
): Card {
  return {
    id: cardId(),
    front: front.trim(),
    back: back.trim(),
    frontImage,
    backImage,
    stage: 0,
    lastReviewedAt: null,
    nextReviewAt: startOfDay(new Date()).toISOString(), // new cards are due now
    mastered: false,
    starred: false,
    introducedAt: null,
    lapses: 0,
  };
}

export function addCard(
  topicId: string,
  front: string,
  back: string,
  frontImage: string | null = null,
  backImage: string | null = null
) {
  mutateTopic(topicId, (t) => ({
    ...t,
    cards: [...(t.cards ?? []), makeCard(front, back, frontImage, backImage)],
  }));
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
  const target = read()
    .find((t) => t.id === topicId)
    ?.cards?.find((c) => c.id === cardIdValue);
  if (target?.frontImage) deleteFile(target.frontImage);
  if (target?.backImage) deleteFile(target.backImage);
  mutateTopic(topicId, (t) => ({
    ...t,
    cards: (t.cards ?? []).filter((c) => c.id !== cardIdValue),
  }));
}

export function toggleStar(topicId: string, cardIdValue: string) {
  mutateTopic(topicId, (t) => ({
    ...t,
    cards: (t.cards ?? []).map((c) =>
      c.id === cardIdValue ? { ...c, starred: !c.starred } : c
    ),
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
      const lapses = (c.lapses ?? 0) + (good ? 0 : 1);
      return {
        ...c,
        stage,
        mastered,
        lastReviewedAt: now.toISOString(),
        nextReviewAt,
        introducedAt: c.introducedAt ?? now.toISOString(),
        lapses,
        starred: c.starred || lapses >= LEECH_LAPSES, // auto-flag leeches
      };
    }),
  }));
}

// Overwrite a card with an earlier snapshot — used to undo a grade in the deck.
export function restoreCard(topicId: string, card: Card) {
  mutateTopic(topicId, (t) => ({
    ...t,
    cards: (t.cards ?? []).map((c) => (c.id === card.id ? card : c)),
  }));
}

function isNewCard(card: Card): boolean {
  return card.introducedAt == null;
}

// Due cards, but gated so at most NEW_PER_HOUR brand-new cards surface within a
// rolling hour. Review cards (already introduced) are never gated.
export function availableCards(topic: Topic, on: Date = new Date()): Card[] {
  const due = dueCards(topic, on);
  const hourAgo = on.getTime() - 60 * 60 * 1000;
  const introducedThisHour = (topic.cards ?? []).filter(
    (c) => c.introducedAt != null && new Date(c.introducedAt).getTime() >= hourAgo
  ).length;
  const limit = getSettings().newPerHour ?? NEW_PER_HOUR;
  let budget = Math.max(0, limit - introducedThisHour);
  return due.filter((c) => {
    if (!isNewCard(c)) return true;
    if (budget > 0) {
      budget -= 1;
      return true;
    }
    return false;
  });
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
    available: availableCards(topic, on).length,
    mastered: cards.filter((c) => c.mastered).length,
    starred: cards.filter((c) => c.starred).length,
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
  if (updated) await syncReminders();
}

export async function undoReview() {
  if (!pendingUndo) return;
  const snapshot = pendingUndo;
  setUndo(null);
  write(read().map((t) => (t.id === snapshot.id ? snapshot : t)));
  await syncReminders();
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
  topic?.resources?.forEach((r) => {
    if (r.type === 'file') deleteFile(r.uri);
  });
  clearUndo();
  write(read().filter((t) => t.id !== id));
  await syncReminders();
}

export async function setRemindersEnabled(enabled: boolean) {
  if (enabled) await ensurePermission();
  storage.set<Settings>(SETTINGS_KEY, { ...getSettings(), remindersEnabled: enabled });
  await syncReminders();
}

export async function setReminderHour(hour: number) {
  storage.set<Settings>(SETTINGS_KEY, { ...getSettings(), reminderHour: hour });
  await syncReminders();
}

export async function setNewPerHour(n: number) {
  storage.set<Settings>(SETTINGS_KEY, { ...getSettings(), newPerHour: Math.max(0, Math.round(n)) });
  await syncReminders();
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
