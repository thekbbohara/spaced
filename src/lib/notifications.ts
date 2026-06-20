import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { DEFAULT_REMINDER_HOUR } from './schedule';

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
    importance: N.AndroidImportance.DEFAULT,
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

// Schedules a reminder for a topic's next review at REMINDER_HOUR local time.
// Returns the notification id, or null if it could not be scheduled.
export async function scheduleForTopic(
  id: string,
  title: string,
  nextReviewAt: string | null,
  hour: number = DEFAULT_REMINDER_HOUR
): Promise<string | null> {
  const N = getModule();
  if (!N || !nextReviewAt) return null;
  try {
    const date = new Date(nextReviewAt);
    date.setHours(hour, 0, 0, 0);
    if (date.getTime() <= Date.now()) return null; // due now — shown in-app
    await ensureAndroidChannel(N);
    return await N.scheduleNotificationAsync({
      content: {
        title: 'Time to recall',
        body: `Review "${title}" while you can still pull it from memory.`,
        data: { topicId: id },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: 'reviews',
      },
    });
  } catch {
    return null;
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
