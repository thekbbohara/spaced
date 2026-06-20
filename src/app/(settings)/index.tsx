import { Pressable, Switch, View } from 'react-native';
import { colors, radius, spacing } from '@/lib/design';
import { formatHour, INTERVALS } from '@/lib/schedule';
import { computeStats } from '@/lib/stats';
import { remindersAvailable } from '@/lib/notifications';
import {
  setReminderHour,
  setRemindersEnabled,
  useSettings,
  useTopics,
} from '@/lib/topics';
import { AppText, Card, Screen } from '@/components/cal';

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

export default function SettingsScreen() {
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
