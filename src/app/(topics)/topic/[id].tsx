import { Alert, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing } from '@/lib/design';
import { INTERVALS, formatDate, formatRelativeDay } from '@/lib/schedule';
import { deleteTopic, useTopic } from '@/lib/topics';
import { AppText, Badge, Button, Card, Screen, StageDots } from '@/components/cal';
import { ReviewCard } from '@/components/topic-card';
import { TopicMaterial } from '@/components/topic-material';
import { TopicCards } from '@/components/topic-cards';

export default function TopicDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const topic = useTopic(id);

  if (!topic) {
    return (
      <Screen>
        <AppText variant="titleMd">Topic not found</AppText>
      </Screen>
    );
  }

  const due =
    (topic.cards?.length ?? 0) === 0 &&
    !topic.mastered &&
    topic.nextReviewAt != null &&
    new Date(topic.nextReviewAt).getTime() <= Date.now();

  function confirmDelete() {
    Alert.alert('Delete topic?', `"${topic!.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTopic(topic!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Topic' }} />

      <AppText variant="displaySm" selectable>
        {topic.title}
      </AppText>
      {topic.notes ? (
        <AppText variant="bodyMd" color={colors.body} selectable>
          {topic.notes}
        </AppText>
      ) : null}

      {topic.answer ? (
        <Card>
          <AppText variant="caption" color={colors.muted}>
            ANSWER
          </AppText>
          <AppText variant="bodyMd" color={colors.ink} selectable>
            {topic.answer}
          </AppText>
        </Card>
      ) : null}

      <Card>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <AppText variant="titleSm">Progress</AppText>
          {topic.mastered ? (
            <Badge label="Mastered" color={colors.success} textColor={colors.onPrimary} />
          ) : (
            <Badge
              label={`Stage ${topic.stage + 1}/${INTERVALS.length}`}
              color={colors.surfaceStrong}
            />
          )}
        </View>
        <StageDots stage={topic.stage} total={INTERVALS.length} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="caption" color={colors.muted}>
            Next review
          </AppText>
          <AppText variant="caption" color={colors.ink}>
            {topic.mastered ? '—' : formatRelativeDay(topic.nextReviewAt)}
          </AppText>
        </View>
      </Card>

      {topic.keyPoints ? (
        <Card>
          <AppText variant="caption" color={colors.muted}>
            KEY POINTS TO STUDY
          </AppText>
          <AppText variant="bodyMd" color={colors.ink} selectable>
            {topic.keyPoints}
          </AppText>
        </Card>
      ) : null}

      {due && <ReviewCard topic={topic} />}

      <TopicCards topic={topic} />

      <TopicMaterial topic={topic} />

      <AppText variant="titleMd" style={{ marginTop: spacing.xs }}>
        History
      </AppText>
      {topic.history.length === 0 ? (
        <Card>
          <AppText variant="bodySm" color={colors.muted}>
            No reviews yet — first one is {formatRelativeDay(topic.nextReviewAt)}.
          </AppText>
        </Card>
      ) : (
        <Card>
          {[...topic.history].reverse().map((h, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: spacing.xxs,
              }}
            >
              <AppText variant="bodySm" color={colors.body}>
                {formatDate(h.date)}
              </AppText>
              <AppText
                variant="bodySm"
                color={h.remembered ? colors.success : colors.error}
              >
                {h.remembered ? 'Recalled' : 'Forgot'}
              </AppText>
            </View>
          ))}
        </Card>
      )}

      <Button
        title="▶  Study this lesson"
        onPress={() =>
          router.push({
            pathname: '/run',
            params: { label: topic.title, duration: '30', flow: '1', topicId: topic.id },
          })
        }
        style={{ marginTop: spacing.sm }}
      />
      <Button
        title="Edit topic"
        variant="secondary"
        onPress={() => router.push(`/edit/${topic.id}`)}
      />
      <Button
        title="Delete topic"
        variant="danger"
        onPress={confirmDelete}
      />
    </Screen>
  );
}
