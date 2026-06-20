import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/lib/design';
import { cardCounts, type Topic } from '@/lib/topics';
import { AppText, Button, Card } from './cal';

export function TopicCards({ topic }: { topic: Topic }) {
  const router = useRouter();
  const { total, due, available, mastered, starred } = cardCounts(topic);

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
          {available > 0 ? (
            <Button
              title={`▶  Study ${available} due card${available === 1 ? '' : 's'}`}
              onPress={() => router.push(`/study/${topic.id}?due=1`)}
            />
          ) : (
            <AppText variant="bodySm" color={colors.muted}>
              {due > 0
                ? `${due} due, but new cards are paced (10/hour). Check back soon.`
                : 'All caught up. Next cards come back on schedule.'}
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
            title="🔀 Shuffle all"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => router.push(`/study/${topic.id}?shuffle=1`)}
          />
        ) : null}
      </View>

      {starred > 0 ? (
        <Button
          title={`★ Study ${starred} starred`}
          variant="secondary"
          onPress={() => router.push(`/study/${topic.id}?starred=1&shuffle=1`)}
        />
      ) : null}
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
