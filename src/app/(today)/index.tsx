import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '@/lib/design';
import { computeStats } from '@/lib/stats';
import { availableCards, isDue, isStudiedToday, undoReview, useTopics, useUndo } from '@/lib/topics';
import { AppText, Button, Card, Screen } from '@/components/cal';
import { ReviewCard } from '@/components/topic-card';

function Stat({ value, label }: { value: number; label: string }) {
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

function DarkStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: spacing.xxs }}>
      <AppText variant="titleLg" color={colors.ink}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.muted}>
        {label}
      </AppText>
    </View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const topics = useTopics();
  const undo = useUndo();

  const { due, decks, dueCardTotal, studiedToday, masteredCount, stats } = useMemo(() => {
    const now = new Date();
    const decks = topics
      .map((t) => ({ topic: t, count: availableCards(t, now).length }))
      .filter((d) => d.count > 0);
    return {
      due: topics.filter((t) => isDue(t, now)),
      decks,
      dueCardTotal: decks.reduce((s, d) => s + d.count, 0),
      studiedToday: topics.filter((t) => isStudiedToday(t, now)),
      masteredCount: topics.filter((t) => t.mastered).length,
      stats: computeStats(topics, now),
    };
  }, [topics]);

  return (
    <Screen>
      <Card tone="dark">
        <AppText variant="titleSm" color={colors.onDarkSoft}>
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </AppText>
        <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
          <Stat value={due.length + dueCardTotal} label="To review" />
          <Stat value={studiedToday.length} label="Studied today" />
          <Stat value={masteredCount} label="Mastered" />
        </View>
      </Card>

      {topics.length > 0 && (
        <Card>
          <View style={{ flexDirection: 'row' }}>
            <DarkStat value={`${stats.streak}🔥`} label="Day streak" />
            <DarkStat value={`${stats.accuracy}%`} label="Recall rate" />
            <DarkStat value={`${stats.totalReviews}`} label="Reviews" />
          </View>
        </Card>
      )}

      {undo && (
        <Pressable
          onPress={() => undoReview()}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.md,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            backgroundColor: pressed ? colors.primaryActive : colors.primary,
          })}
        >
          <AppText variant="bodySm" color={colors.onPrimary}>
            Graded “{undo.title}”.
          </AppText>
          <AppText variant="button" color={colors.onPrimary}>
            Undo
          </AppText>
        </Pressable>
      )}

      <Button
        title="＋  Log what you studied"
        onPress={() => router.push('/add')}
      />

      <AppText variant="titleMd" style={{ marginTop: spacing.xs }}>
        Review now
      </AppText>
      {due.length === 0 && decks.length === 0 ? (
        <Card>
          <AppText variant="titleSm">You&apos;re all caught up 🎉</AppText>
          <AppText variant="bodySm" color={colors.muted}>
            Nothing due right now. Log a new topic, or come back when your next
            review lands.
          </AppText>
        </Card>
      ) : (
        due.map((topic) => <ReviewCard key={topic.id} topic={topic} />)
      )}

      {decks.length > 1 ? (
        <Pressable
          onPress={() => router.push('/study/all?due=1&shuffle=1')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: pressed ? colors.surfaceCard : colors.canvas,
          })}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="titleSm" color={colors.primary}>
              Study all due
            </AppText>
            <AppText variant="caption" color={colors.muted}>
              {dueCardTotal} cards from {decks.length} decks, shuffled
            </AppText>
          </View>
          <AppText variant="button" color={colors.primary}>
            Start ›
          </AppText>
        </Pressable>
      ) : null}

      {decks.map(({ topic, count }) => (
        <Pressable
          key={topic.id}
          onPress={() => router.push(`/study/${topic.id}?due=1`)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: pressed ? colors.primaryActive : colors.primary,
          })}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="titleSm" color={colors.onPrimary} numberOfLines={1}>
              {topic.title}
            </AppText>
            <AppText variant="caption" color={colors.onDarkSoft}>
              {count} flashcard{count === 1 ? '' : 's'} due
            </AppText>
          </View>
          <AppText variant="button" color={colors.onPrimary}>
            Study ›
          </AppText>
        </Pressable>
      ))}

      {studiedToday.length > 0 && (
        <>
          <AppText variant="titleMd" style={{ marginTop: spacing.xs }}>
            Logged today
          </AppText>
          {studiedToday.map((topic) => (
            <Pressable
              key={topic.id}
              onPress={() => router.push(`/topic/${topic.id}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.lg,
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                backgroundColor: pressed ? colors.surfaceStrong : colors.surfaceCard,
              })}
            >
              <AppText variant="titleSm" numberOfLines={1} style={{ flex: 1 }}>
                {topic.title}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                next: tomorrow
              </AppText>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}
