import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, type } from '@/lib/design';
import { dueCards, gradeCard, useTopic, type Card } from '@/lib/topics';
import { AppText, Button } from '@/components/cal';

export default function StudyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, due } = useLocalSearchParams<{ id: string; due?: string }>();
  const topic = useTopic(id);

  // Snapshot the deck once so grading (which mutates the store) doesn't reshuffle
  // the session under us.
  const deck = useMemo(() => {
    if (!topic) return new Map<string, Card>();
    const pool = due === '1' ? dueCards(topic) : (topic.cards ?? []);
    return new Map(pool.map((c) => [c.id, c]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [queue, setQueue] = useState<string[]>(() => Array.from(deck.keys()));
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [again, setAgain] = useState(0);

  const total = deck.size;
  const currentId = queue[0];
  const card = currentId ? deck.get(currentId) : undefined;

  function grade(good: boolean) {
    if (!currentId) return;
    gradeCard(id, currentId, good);
    setFlipped(false);
    if (good) {
      setDone((d) => d + 1);
      setQueue((q) => q.slice(1));
    } else {
      setAgain((a) => a + 1);
      setQueue((q) => [...q.slice(1), currentId]); // re-study this session
    }
  }

  function close() {
    Alert.alert('End study session?', undefined, [
      { text: 'Keep studying', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  const wrap = {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingTop: insets.top + spacing.md,
    paddingBottom: insets.bottom + spacing.lg,
    paddingHorizontal: spacing.lg,
  } as const;

  if (total === 0) {
    return (
      <View style={[wrap, { justifyContent: 'center', gap: spacing.md }]}>
        <AppText variant="displaySm" style={{ textAlign: 'center' }}>
          No cards to study
        </AppText>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  if (!card) {
    return (
      <View style={[wrap, { justifyContent: 'center', gap: spacing.sm }]}>
        <AppText variant="displaySm" style={{ textAlign: 'center' }}>
          Session complete 🎉
        </AppText>
        <AppText variant="bodyMd" color={colors.muted} style={{ textAlign: 'center' }}>
          {done} card{done === 1 ? '' : 's'} reviewed{again > 0 ? ` · ${again} repeats` : ''}.
        </AppText>
        <Button title="Done" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  return (
    <View style={wrap}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <AppText variant="caption" color={colors.muted}>
          {done}/{total} done · {queue.length} left
        </AppText>
        <Pressable onPress={close} hitSlop={12}>
          <AppText variant="button" color={colors.muted}>
            Close
          </AppText>
        </Pressable>
      </View>

      <Pressable
        onPress={() => setFlipped((f) => !f)}
        style={{ flex: 1, marginVertical: spacing.md }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: flipped ? colors.surfaceCard : colors.canvas,
            borderWidth: 1,
            borderColor: colors.hairline,
            borderRadius: radius.xl,
            borderCurve: 'continuous',
            padding: spacing.xl,
          }}
        >
          <AppText variant="caption" color={colors.mutedSoft} style={{ marginBottom: spacing.md }}>
            {flipped ? 'ANSWER' : 'PROMPT'}
          </AppText>
          <AppText
            style={{ ...type.displaySm, textAlign: 'center' }}
            selectable
          >
            {flipped ? card.back : card.front}
          </AppText>
          {!flipped ? (
            <AppText variant="caption" color={colors.mutedSoft} style={{ marginTop: spacing.lg }}>
              tap to flip
            </AppText>
          ) : null}
        </ScrollView>
      </Pressable>

      {flipped ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title="Again" variant="secondary" style={{ flex: 1 }} onPress={() => grade(false)} />
          <Button title="Good" style={{ flex: 1 }} onPress={() => grade(true)} />
        </View>
      ) : (
        <Button title="Show answer" onPress={() => setFlipped(true)} />
      )}
    </View>
  );
}
