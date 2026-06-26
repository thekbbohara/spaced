import { useMemo } from 'react';
import { Alert, View } from 'react-native';
import { colors, spacing } from '@/lib/design';
import { formatDate } from '@/lib/schedule';
import { clearEvents, useEvents, type ActivityEvent } from '@/lib/events';
import { AppText, Button, Card, Screen } from '@/components/cal';

const ICON: Record<string, string> = {
  app_open: '📱',
  topic_created: '➕',
  topic_reviewed: '🔁',
  card_reviewed: '🃏',
  card_skipped: '⏭',
  recall_session: '🧠',
};

const OUTCOME_LABEL: Record<string, string> = {
  recalled: 'Recalled',
  half: 'Half',
  forgot: 'Forgot',
  skipped: 'Skipped',
};

function outcomeColor(outcome?: string): string {
  if (outcome === 'recalled') return colors.success;
  if (outcome === 'half') return colors.warning;
  if (outcome === 'forgot') return colors.error;
  return colors.muted;
}

function describe(e: ActivityEvent): string {
  switch (e.type) {
    case 'app_open':
      return 'Opened app';
    case 'topic_created':
      return `Created topic — ${e.label ?? ''}`;
    case 'topic_reviewed':
      return `Reviewed — ${e.label ?? ''}`;
    case 'card_reviewed':
      return `Card — ${e.label ?? ''}`;
    case 'card_skipped':
      return `Skipped card — ${e.label ?? ''}`;
    case 'recall_session':
      return `Recall session — ${e.label ?? ''}`;
    default:
      return e.type;
  }
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function ActivityScreen() {
  const events = useEvents();

  const days = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of events) {
      const key = formatDate(e.at);
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    return Array.from(map.entries());
  }, [events]);

  function confirmClear() {
    Alert.alert('Clear activity log?', 'This removes the on-device history. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearEvents() },
    ]);
  }

  if (events.length === 0) {
    return (
      <Screen>
        <Card>
          <AppText variant="titleSm">No activity yet</AppText>
          <AppText variant="bodySm" color={colors.muted}>
            Everything you do — reviews, skips, recall sessions, new topics, even app opens — is
            logged here on your device.
          </AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="bodySm" color={colors.muted}>
        {events.length} events, stored only on this device.
      </AppText>

      {days.map(([day, items]) => (
        <View key={day} style={{ gap: spacing.xs }}>
          <AppText variant="titleSm" style={{ marginTop: spacing.xs }}>
            {day}
          </AppText>
          <Card style={{ gap: spacing.xs }}>
            {items.map((e) => (
              <View
                key={e.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <AppText variant="bodyMd">{ICON[e.type] ?? '•'}</AppText>
                <AppText variant="bodySm" color={colors.ink} style={{ flex: 1 }} numberOfLines={1}>
                  {describe(e)}
                </AppText>
                {e.outcome ? (
                  <AppText variant="caption" color={outcomeColor(e.outcome)}>
                    {OUTCOME_LABEL[e.outcome]}
                  </AppText>
                ) : null}
                <AppText variant="caption" color={colors.mutedSoft}>
                  {time(e.at)}
                </AppText>
              </View>
            ))}
          </Card>
        </View>
      ))}

      <Button
        title="Clear log"
        variant="secondary"
        onPress={confirmClear}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}
