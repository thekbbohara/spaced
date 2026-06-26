import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { storage } from './storage';

// expo-notifications was removed from Expo Go on Android (SDK 53+). Importing it
// there throws, so we only load it in dev/standalone builds and no-op in Expo Go.
export const remindersAvailable =
  Constants.executionEnvironment !== 'storeClient';

type NotificationsModule = typeof import('expo-notifications');
let mod: NotificationsModule | null = null;

function getModule(): NotificationsModule | null {
  if (!remindersAvailable) return null;
  if (!mod) {
    mod = require('expo-notifications') as NotificationsModule;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return mod;
}

let channelReady = false;
let focusChannelReady = false;

async function ensureAndroidChannel(N: NotificationsModule) {
  if (Platform.OS !== 'android' || channelReady) return;
  await N.setNotificationChannelAsync('reviews', {
    name: 'Review reminders',
    importance: N.AndroidImportance.HIGH, // heads-up banner + sound, like Duolingo
  });
  channelReady = true;
}

async function ensureFocusChannel(N: NotificationsModule) {
  if (Platform.OS !== 'android' || focusChannelReady) return;
  await N.setNotificationChannelAsync('focus', {
    name: 'Focus timer',
    importance: N.AndroidImportance.HIGH, // heads-up + sound when the goal lands
  });
  focusChannelReady = true;
}

export async function ensurePermission(): Promise<boolean> {
  const N = getModule();
  if (!N) return false;
  try {
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const next = await N.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

// --- Aggregate review reminders ---------------------------------------------
// Offline-only (no server push). We re-nag through the day with local
// notifications and stop once everything's reviewed. Re-synced on every review,
// app open, and settings change.

const BATCH_KEY = 'reviewNotifIds'; // ids we manage, so we can cancel/replace them
const ESCALATE_EVERY_H = 2.5; // re-nudge cadence while reviews remain
const LAST_SLOT_H = 21.5; // no nudges after ~9:30pm

// Future times today at hour, hour+2.5, … up to LAST_SLOT_H.
function todaySlots(hour: number): Date[] {
  const slots: Date[] = [];
  const now = Date.now();
  for (let h = hour; h <= LAST_SLOT_H + 1e-6; h += ESCALATE_EVERY_H) {
    const whole = Math.floor(h);
    const d = new Date();
    d.setHours(whole, Math.round((h - whole) * 60), 0, 0);
    if (d.getTime() > now + 1000) slots.push(d);
  }
  return slots;
}

// Cancels the previous batch and reschedules based on the live due count.
// `dueCount` is how many cards/topics are reviewable right now.
export async function syncReviewReminders(opts: {
  enabled: boolean;
  hour: number;
  dueCount: number;
}): Promise<void> {
  const N = getModule();
  if (!N) return;
  try {
    for (const id of storage.get<string[]>(BATCH_KEY, [])) await cancel(id);
    storage.set<string[]>(BATCH_KEY, []);
    if (!opts.enabled) return;
    await ensureAndroidChannel(N);

    const ids: string[] = [];

    // Daily digest — a standing repeating reminder so missed days still surface,
    // even if the app is never reopened.
    ids.push(
      await N.scheduleNotificationAsync({
        content: {
          title: 'Time to recall 📚',
          body: 'Open Spaced and clear today’s reviews — a few minutes keeps it in memory.',
          sound: true,
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DAILY,
          hour: Math.floor(opts.hour),
          minute: 0,
          channelId: 'reviews',
        },
      })
    );

    // Same-day escalation — nudge every 2.5h while reviews remain. Re-sync after
    // a review recomputes dueCount; when it hits 0, no escalation is scheduled.
    if (opts.dueCount > 0) {
      const n = opts.dueCount;
      const body = `You have ${n} card${n === 1 ? '' : 's'} due. 2 minutes keeps your streak.`;
      for (const date of todaySlots(opts.hour)) {
        ids.push(
          await N.scheduleNotificationAsync({
            content: { title: 'Reviews waiting', body, sound: true },
            trigger: { type: N.SchedulableTriggerInputTypes.DATE, date, channelId: 'reviews' },
          })
        );
      }
    }

    storage.set<string[]>(BATCH_KEY, ids);
  } catch {
    // ignore — reminders are best-effort
  }
}

// Fire a sound/heads-up notification when a focus session reaches its goal, so
// the cue lands even if the screen has slept and JS is paused. Returns the id.
export async function scheduleFocusEnd(label: string, ms: number): Promise<string | null> {
  const N = getModule();
  if (!N || ms <= 0) return null;
  try {
    await ensureFocusChannel(N);
    return await N.scheduleNotificationAsync({
      content: {
        title: 'Focus complete',
        body: label ? `Time to recall — ${label}.` : 'Time to recall what you studied.',
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(ms / 1000)),
        channelId: 'focus',
      },
    });
  } catch {
    return null;
  }
}

// Fire a notification a few seconds out so reminders can be verified instantly.
export async function sendTestReminder(): Promise<boolean> {
  const N = getModule();
  if (!N) return false;
  if (!(await ensurePermission())) return false;
  try {
    await ensureAndroidChannel(N);
    await N.scheduleNotificationAsync({
      content: {
        title: 'Test reminder ✅',
        body: 'Reminders work. You’ll get one like this when a topic is due.',
        sound: true,
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: 'reviews',
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancel(notificationId: string | null) {
  const N = getModule();
  if (!N || !notificationId) return;
  try {
    await N.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}
