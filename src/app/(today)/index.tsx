import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { colors, radius, spacing } from '@/lib/design';
import { computeStats } from '@/lib/stats';
import { isDue, isStudiedToday, undoReview, useTopics, useUndo } from '@/lib/topics';
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

  const { due, studiedToday, masteredCount, stats } = useMemo(() => {
    const now = new Date();
    return {
      due: topics.filter((t) => isDue(t, now)),
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
          <Stat value={due.length} label="To review" />
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
      {due.length === 0 ? (
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

      {studiedToday.length > 0 && (
        <>
          <AppText variant="titleMd" style={{ marginTop: spacing.xs }}>
            Logged today
          </AppText>
          {studiedToday.map((topic) => (
            <Link key={topic.id} href={`/topic/${topic.id}`} asChild>
              <Pressable
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.lg,
                  borderRadius: radius.lg,
                  borderCurve: 'continuous',
                  backgroundColor: pressed
                    ? colors.surfaceStrong
                    : colors.surfaceCard,
                })}
              >
                <AppText variant="titleSm" numberOfLines={1} style={{ flex: 1 }}>
                  {topic.title}
                </AppText>
                <AppText variant="caption" color={colors.muted}>
                  next: tomorrow
                </AppText>
              </Pressable>
            </Link>
          ))}
        </>
      )}
    </Screen>
  );
}
