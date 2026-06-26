import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { colors, radius, spacing, type } from '@/lib/design';
import { useTopics, type Topic } from '@/lib/topics';
import { AppText, Card, Screen } from '@/components/cal';
import { TopicRow } from '@/components/topic-card';

function matches(topic: Topic, q: string): { hit: boolean; cardHits: string[] } {
  const inText = [topic.title, topic.notes, topic.answer, topic.keyPoints ?? '']
    .join('\n')
    .toLowerCase()
    .includes(q);
  const cardHits: string[] = [];
  for (const c of topic.cards ?? []) {
    if (`${c.front}\n${c.back}`.toLowerCase().includes(q)) {
      cardHits.push(`${c.front} — ${c.back}`);
    }
  }
  return { hit: inText || cardHits.length > 0, cardHits };
}

export default function SearchScreen() {
  const topics = useTopics();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];
    return topics
      .map((t) => ({ topic: t, ...matches(t, q) }))
      .filter((r) => r.hit);
  }, [query, topics]);

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Search' }} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search topics and cards…"
        placeholderTextColor={colors.mutedSoft}
        autoFocus
        style={{
          ...type.bodyMd,
          color: colors.ink,
          backgroundColor: colors.surfaceCard,
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      />

      {query.trim().length === 0 ? (
        <AppText variant="bodySm" color={colors.muted}>
          Type to search across every topic, note, key point, answer, and flashcard.
        </AppText>
      ) : results.length === 0 ? (
        <AppText variant="bodySm" color={colors.muted}>
          No matches for “{query.trim()}”.
        </AppText>
      ) : (
        <>
          <AppText variant="caption" color={colors.mutedSoft}>
            {results.length} topic{results.length === 1 ? '' : 's'}
          </AppText>
          {results.map(({ topic, cardHits }) => (
            <View key={topic.id} style={{ gap: spacing.xxs }}>
              <TopicRow topic={topic} />
              {cardHits.length > 0 ? (
                <Card style={{ gap: 2 }}>
                  {cardHits.slice(0, 4).map((h, i) => (
                    <AppText key={i} variant="caption" color={colors.muted} numberOfLines={1}>
                      🃏 {h}
                    </AppText>
                  ))}
                  {cardHits.length > 4 ? (
                    <AppText variant="caption" color={colors.mutedSoft}>
                      +{cardHits.length - 4} more cards
                    </AppText>
                  ) : null}
                </Card>
              ) : null}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
