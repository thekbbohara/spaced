import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '@/lib/design';
import { INTERVALS, formatRelativeDay } from '@/lib/schedule';
import { reviewTopic, type Topic } from '@/lib/topics';
import { AppText, Badge, Button, Card, StageDots } from './cal';

// A due topic with recall actions, shown on the Today screen.
export function ReviewCard({ topic }: { topic: Topic }) {
  const hasAnswer = !!topic.answer;
  const [revealed, setRevealed] = useState(false);

  return (
    <Card tone="canvas">
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: spacing.sm,
        }}
      >
        <AppText variant="titleMd" style={{ flex: 1 }} selectable>
          {topic.title}
        </AppText>
        <Badge
          label={formatRelativeDay(topic.nextReviewAt)}
          color={colors.surfaceCard}
          textColor={colors.muted}
        />
      </View>
      {topic.notes ? (
        <AppText variant="bodySm" color={colors.muted} selectable>
          {topic.notes}
        </AppText>
      ) : null}
      <StageDots stage={topic.stage} total={INTERVALS.length} />

      {hasAnswer && revealed ? (
        <View
          style={{
            backgroundColor: colors.surfaceCard,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            padding: spacing.md,
            gap: spacing.xxs,
          }}
        >
          <AppText variant="caption" color={colors.muted}>
            ANSWER
          </AppText>
          <AppText variant="bodyMd" color={colors.ink} selectable>
            {topic.answer}
          </AppText>
        </View>
      ) : (
        <AppText variant="caption" color={colors.mutedSoft}>
          {hasAnswer
            ? 'Recall the answer from memory, then reveal to check.'
            : 'Try to recall it from memory first, then grade yourself.'}
        </AppText>
      )}

      {hasAnswer && !revealed ? (
        <Button
          title="Reveal answer"
          variant="secondary"
          onPress={() => setRevealed(true)}
          style={{ marginTop: spacing.xxs }}
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxs }}>
          <Button
            title="Forgot"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => reviewTopic(topic.id, false)}
          />
          <Button
            title="Recalled it"
            style={{ flex: 1 }}
            onPress={() => reviewTopic(topic.id, true)}
          />
        </View>
      )}
    </Card>
  );
}

// A compact row used in lists, linking to the topic detail.
export function TopicRow({ topic }: { topic: Topic }) {
  const router = useRouter();
  const cardCount = topic.cards?.length ?? 0;
  return (
      <Pressable
        onPress={() => router.push(`/topic/${topic.id}`)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: pressed ? colors.surfaceStrong : colors.surfaceCard,
        })}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: radius.full,
            backgroundColor: topic.mastered
              ? colors.success
              : topic.nextReviewAt &&
                  new Date(topic.nextReviewAt).getTime() <= Date.now()
                ? colors.warning
                : colors.surfaceStrong,
          }}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="titleSm" numberOfLines={1}>
            {topic.title}
          </AppText>
          <AppText variant="caption" color={colors.muted}>
            {cardCount > 0
              ? `${cardCount} cards`
              : topic.mastered
                ? `Mastered · ${topic.history.length} reviews`
                : `Stage ${topic.stage + 1}/${INTERVALS.length} · ${formatRelativeDay(topic.nextReviewAt)}`}
          </AppText>
        </View>
        <AppText variant="bodyMd" color={colors.mutedSoft}>
          ›
        </AppText>
      </Pressable>
  );
}
