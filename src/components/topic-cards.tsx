import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/lib/design';
import { cardCounts, type Topic } from '@/lib/topics';
import { AppText, Button, Card } from './cal';

export function TopicCards({ topic }: { topic: Topic }) {
  const router = useRouter();
  const { total, due, mastered } = cardCounts(topic);

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <AppText variant="titleMd">Flashcards</AppText>
        {total > 0 ? (
          <AppText variant="caption" color={colors.muted}>
            {total}
          </AppText>
        ) : null}
      </View>

      {total === 0 ? (
        <Card>
          <AppText variant="bodySm" color={colors.muted}>
            Build a deck of cards for this topic — paste a list to make many at
            once. Each card is reviewed on its own spaced-repetition schedule.
          </AppText>
        </Card>
      ) : (
        <Card tone="canvas">
          <View style={{ flexDirection: 'row' }}>
            <Stat value={due} label="Due now" highlight={due > 0} />
            <Stat value={total - mastered} label="Learning" />
            <Stat value={mastered} label="Mastered" />
          </View>
          {due > 0 ? (
            <Button
              title={`▶  Study ${due} due card${due === 1 ? '' : 's'}`}
              onPress={() => router.push(`/study/${topic.id}?due=1`)}
            />
          ) : (
            <AppText variant="bodySm" color={colors.muted}>
              All caught up. Next cards come back on schedule.
            </AppText>
          )}
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          title={total === 0 ? '＋ Add cards' : 'Manage cards'}
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push(`/cards/${topic.id}`)}
        />
        {total > 0 ? (
          <Button
            title="Study all"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => router.push(`/study/${topic.id}`)}
          />
        ) : null}
      </View>
    </View>
  );
}

function Stat({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <View style={{ flex: 1, gap: spacing.xxs }}>
      <AppText
        variant="displaySm"
        color={highlight ? colors.ink : colors.muted}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </AppText>
      <AppText variant="caption" color={colors.muted}>
        {label}
      </AppText>
    </View>
  );
}
