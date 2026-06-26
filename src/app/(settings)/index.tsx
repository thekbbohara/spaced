import { Alert, Pressable, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '@/lib/design';
import { formatHour, INTERVALS } from '@/lib/schedule';
import { computeStats } from '@/lib/stats';
import { remindersAvailable, sendTestReminder } from '@/lib/notifications';
import { exportBackup, importBackup } from '@/lib/backup';
import {
  NEW_PER_HOUR,
  setNewPerHour,
  setReminderHour,
  setRemindersEnabled,
  useSettings,
  useTopics,
} from '@/lib/topics';
import { AppText, Button, Card, Screen } from '@/components/cal';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: spacing.xxs }}>
      <AppText variant="displaySm" color={colors.onDark} style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.onDarkSoft}>
        {label}
      </AppText>
    </View>
  );
}

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.surfaceStrong : colors.surfaceCard,
      })}
    >
      <AppText variant="titleMd">{label}</AppText>
    </Pressable>
  );
}

async function onExport() {
  try {
    const ok = await exportBackup();
    if (!ok) Alert.alert('Sharing unavailable', 'Cannot open the share sheet on this device.');
  } catch (e) {
    Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
  }
}

function onImport() {
  Alert.alert(
    'Restore backup?',
    'This replaces your current topics, cards and settings with the backup file.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Choose file',
        onPress: async () => {
          try {
            const res = await importBackup();
            if (res.cancelled) return;
            Alert.alert('Restored', `${res.topics} topic${res.topics === 1 ? '' : 's'} imported.`);
          } catch (e) {
            Alert.alert('Import failed', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]
  );
}

async function onTestReminder() {
  const ok = await sendTestReminder();
  if (ok) {
    Alert.alert('Test sent', 'A notification will arrive in about 5 seconds.');
  } else {
    Alert.alert('Could not send', 'Notification permission is off, or this is Expo Go.');
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettings();
  const topics = useTopics();
  const stats = computeStats(topics);
  const on = settings.remindersEnabled && remindersAvailable;

  return (
    <Screen>
      {topics.length > 0 && (
        <Card tone="dark">
          <View style={{ flexDirection: 'row' }}>
            <Stat value={`${stats.streak}`} label="Day streak" />
            <Stat value={`${stats.accuracy}%`} label="Recall rate" />
            <Stat value={`${stats.activeDays}`} label="Active days" />
          </View>
        </Card>
      )}

      <Button
        title="📋  Activity log"
        variant="secondary"
        onPress={() => router.push('/activity')}
      />

      <Card tone="canvas">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <AppText variant="titleSm">Review reminders</AppText>
            <AppText variant="bodySm" color={colors.muted}>
              {remindersAvailable
                ? 'A notification on the day each topic is due.'
                : 'Notifications need a dev build — they’re disabled inside Expo Go.'}
            </AppText>
          </View>
          <Switch
            value={on}
            onValueChange={setRemindersEnabled}
            disabled={!remindersAvailable}
            trackColor={{ true: colors.primary }}
          />
        </View>

        {on && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTopWidth: 1,
              borderTopColor: colors.hairline,
              paddingTop: spacing.sm,
              marginTop: spacing.xxs,
            }}
          >
            <AppText variant="titleSm">Reminder time</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <StepperButton
                label="−"
                onPress={() => setReminderHour((settings.reminderHour + 23) % 24)}
              />
              <AppText
                variant="titleMd"
                style={{ width: 92, textAlign: 'center', fontVariant: ['tabular-nums'] }}
              >
                {formatHour(settings.reminderHour)}
              </AppText>
              <StepperButton
                label="+"
                onPress={() => setReminderHour((settings.reminderHour + 1) % 24)}
              />
            </View>
          </View>
        )}

        {on && (
          <Button
            title="Send test reminder"
            variant="secondary"
            onPress={onTestReminder}
            style={{ marginTop: spacing.xxs }}
          />
        )}
      </Card>

      <AppText variant="titleMd" style={{ marginTop: spacing.xs }}>
        Study
      </AppText>
      <Card tone="canvas">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <AppText variant="titleSm">New cards per hour</AppText>
            <AppText variant="bodySm" color={colors.muted}>
              How many brand-new cards a deck introduces at once, so big decks don&apos;t overwhelm you.
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <StepperButton
              label="−"
              onPress={() => setNewPerHour(Math.max(1, (settings.newPerHour ?? NEW_PER_HOUR) - 1))}
            />
            <AppText
              variant="titleMd"
              style={{ width: 36, textAlign: 'center', fontVariant: ['tabular-nums'] }}
            >
              {settings.newPerHour ?? NEW_PER_HOUR}
            </AppText>
            <StepperButton
              label="+"
              onPress={() => setNewPerHour((settings.newPerHour ?? NEW_PER_HOUR) + 1)}
            />
          </View>
        </View>
      </Card>

      <AppText variant="titleMd" style={{ marginTop: spacing.xs }}>
        Backup
      </AppText>
      <Card tone="canvas">
        <AppText variant="bodySm" color={colors.muted}>
          Your topics and cards live only on this device. Export a backup file
          and keep it safe — restore it on a new phone or after reinstalling.
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            title="Export backup"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={onExport}
          />
          <Button
            title="Restore"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={onImport}
          />
        </View>
      </Card>

      <AppText variant="titleMd" style={{ marginTop: spacing.xs }}>
        How it works
      </AppText>
      <Card>
        <AppText variant="bodySm" color={colors.body}>
          This app pairs two evidence-based techniques:
        </AppText>
        <AppText variant="bodySm" color={colors.body}>
          • <AppText variant="titleSm">Active recall</AppText> — grade yourself
          by pulling each topic from memory, not by rereading.
        </AppText>
        <AppText variant="bodySm" color={colors.body}>
          • <AppText variant="titleSm">Spaced repetition</AppText> — reviews come
          back on an expanding schedule, hitting memory just before you forget.
        </AppText>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.xs,
            marginTop: spacing.xs,
          }}
        >
          {INTERVALS.map((d, i) => (
            <View
              key={i}
              style={{
                backgroundColor: colors.surfaceStrong,
                borderRadius: 9999,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xxs,
              }}
            >
              <AppText variant="caption" color={colors.ink}>
                +{d}d
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" color={colors.mutedSoft} style={{ marginTop: spacing.xxs }}>
          Recall correctly → advance to the next interval. Forget → restart at
          day 1. Clear all stages → mastered.
        </AppText>
      </Card>
    </Screen>
  );
}
