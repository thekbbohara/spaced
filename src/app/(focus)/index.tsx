import { useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing, type } from '@/lib/design';
import { formatDate, formatMinutes } from '@/lib/schedule';
import { RECALL_FRACTION, totalFocusMs, useSessions } from '@/lib/sessions';
import { AppText, Button, Card, Screen } from '@/components/cal';

const MIN_DURATION = 5;
const MAX_DURATION = 120;

function StepperButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
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

export default function FocusScreen() {
  const router = useRouter();
  const sessions = useSessions();

  const [label, setLabel] = useState('');
  const [duration, setDuration] = useState(30);
  const [flow, setFlow] = useState(true);

  const recallMin = Math.max(1, Math.round(duration * RECALL_FRACTION));

  function start() {
    router.push({
      pathname: '/run',
      params: {
        label: label.trim() || 'Study session',
        duration: String(duration),
        flow: flow ? '1' : '0',
      },
    });
  }

  return (
    <Screen>
      <Card tone="dark">
        <AppText variant="caption" color={colors.onDarkSoft}>
          TOTAL FOCUSED TIME
        </AppText>
        <AppText variant="displaySm" color={colors.onDark}>
          {formatMinutes(totalFocusMs(sessions))}
        </AppText>
      </Card>

      <Card tone="canvas">
        <AppText variant="caption" color={colors.muted}>
          WHAT ARE YOU STUDYING?
        </AppText>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. Organic chemistry — chapter 4"
          placeholderTextColor={colors.mutedSoft}
          style={{
            ...type.bodyMd,
            color: colors.ink,
            borderWidth: 1,
            borderColor: colors.hairline,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.xs,
          }}
        >
          <AppText variant="titleSm">Focus length</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <StepperButton
              label="−"
              onPress={() => setDuration((d) => Math.max(MIN_DURATION, d - 5))}
            />
            <AppText
              variant="titleMd"
              style={{ width: 80, textAlign: 'center', fontVariant: ['tabular-nums'] }}
            >
              {duration} min
            </AppText>
            <StepperButton
              label="+"
              onPress={() => setDuration((d) => Math.min(MAX_DURATION, d + 5))}
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
            paddingTop: spacing.sm,
          }}
        >
          <View style={{ flex: 1, paddingRight: spacing.md, gap: spacing.xxs }}>
            <AppText variant="titleSm">Flow mode</AppText>
            <AppText variant="bodySm" color={colors.muted}>
              At the end, a soft chime — but the timer keeps counting so it won&apos;t
              break your flow. Recall is sized to your total time.
            </AppText>
          </View>
          <Switch value={flow} onValueChange={setFlow} trackColor={{ true: colors.primary }} />
        </View>

        <AppText variant="caption" color={colors.mutedSoft}>
          Then a {recallMin}-min active-recall session (15% of {duration} min).
        </AppText>
      </Card>

      <Button title="▶  Start focus session" onPress={start} />

      {sessions.length > 0 && (
        <>
          <AppText variant="titleMd" style={{ marginTop: spacing.xs }}>
            Recent sessions
          </AppText>
          {sessions.slice(0, 12).map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(`/session/${s.id}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Card style={{ gap: spacing.xxs }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <AppText variant="titleSm" numberOfLines={1} style={{ flex: 1 }}>
                    {s.label}
                  </AppText>
                  <AppText variant="caption" color={colors.muted}>
                    {formatDate(s.completedAt)}
                  </AppText>
                </View>
                <AppText variant="bodySm" color={colors.muted}>
                  {s.studyMs > 0 ? `${formatMinutes(s.studyMs)} focus · ` : ''}
                  {formatMinutes(s.recallMs)} recall
                  {s.recallMode ? ` · ${s.recallMode === 'voice' ? '🎙 voice' : '✍️ written'}` : ''}
                </AppText>
                {s.recallText ? (
                  <AppText variant="bodySm" color={colors.body} numberOfLines={2}>
                    {s.recallText}
                  </AppText>
                ) : s.recallMode === 'voice' ? (
                  <AppText variant="bodySm" color={colors.mutedSoft}>
                    Tap to play your recording
                  </AppText>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}
