import { useMemo } from 'react';
import { colors, spacing } from '@/lib/design';
import { isDue, useTopics, type Topic } from '@/lib/topics';
import { AppText, Card, Screen } from '@/components/cal';
import { TopicRow } from '@/components/topic-card';

function section(title: string, items: Topic[]) {
  if (items.length === 0) return null;
  return (
    <>
      <AppText variant="titleMd" style={{ marginTop: spacing.xs }}>
        {title}
      </AppText>
      {items.map((t) => (
        <TopicRow key={t.id} topic={t} />
      ))}
    </>
  );
}

export default function TopicsScreen() {
  const topics = useTopics();

  const groups = useMemo(() => {
    const now = new Date();
    const due = topics.filter((t) => isDue(t, now));
    const learning = topics.filter((t) => !t.mastered && !isDue(t, now));
    learning.sort((a, b) =>
      (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? '')
    );
    const mastered = topics.filter((t) => t.mastered);
    return { due, learning, mastered };
  }, [topics]);

  if (topics.length === 0) {
    return (
      <Screen>
        <Card>
          <AppText variant="titleSm">No topics yet</AppText>
          <AppText variant="bodySm" color={colors.muted}>
            Head to the Today tab and log the first thing you studied. It&apos;ll
            show up here with its review schedule.
          </AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      {section('Due', groups.due)}
      {section('Learning', groups.learning)}
      {section('Mastered', groups.mastered)}
    </Screen>
  );
}
