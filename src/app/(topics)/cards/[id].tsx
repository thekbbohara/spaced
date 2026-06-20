import { useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, type } from '@/lib/design';
import {
  addCard,
  addCards,
  CARD_SEPARATORS,
  deleteCard,
  parseCards,
  useTopic,
} from '@/lib/topics';
import { AppText, Button, Card, Screen } from '@/components/cal';

const inputStyle = {
  ...type.bodyMd,
  color: colors.ink,
  backgroundColor: colors.canvas,
  borderWidth: 1,
  borderColor: colors.hairline,
  borderRadius: radius.md,
  borderCurve: 'continuous' as const,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
};

export default function CardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = useTopic(id);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [bulk, setBulk] = useState('');
  const [sep, setSep] = useState<string>(CARD_SEPARATORS[0].value);

  const parsed = useMemo(() => parseCards(bulk, sep), [bulk, sep]);

  if (!topic) {
    return (
      <Screen>
        <AppText variant="titleMd">Topic not found</AppText>
      </Screen>
    );
  }
  const cards = topic.cards ?? [];

  function addSingle() {
    if (!front.trim() || !back.trim()) return;
    addCard(id, front, back);
    setFront('');
    setBack('');
  }

  function addBulk() {
    if (parsed.length === 0) return;
    addCards(id, parsed);
    setBulk('');
  }

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: `Cards · ${cards.length}` }} />

      <Card tone="canvas">
        <AppText variant="titleSm">Add a card</AppText>
        <TextInput
          value={front}
          onChangeText={setFront}
          placeholder="Front (prompt) — e.g. Hydrogen"
          placeholderTextColor={colors.mutedSoft}
          style={inputStyle}
        />
        <TextInput
          value={back}
          onChangeText={setBack}
          placeholder="Back (answer) — e.g. H · 1"
          placeholderTextColor={colors.mutedSoft}
          style={inputStyle}
        />
        <Button title="Add card" onPress={addSingle} disabled={!front.trim() || !back.trim()} />
      </Card>

      <Card tone="canvas">
        <AppText variant="titleSm">Bulk paste</AppText>
        <AppText variant="bodySm" color={colors.muted}>
          One card per line. Front and back split on the first separator.
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {CARD_SEPARATORS.map((s) => {
            const on = s.value === sep;
            return (
              <Pressable
                key={s.value}
                onPress={() => setSep(s.value)}
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xxs,
                  borderRadius: radius.pill,
                  backgroundColor: on ? colors.primary : colors.surfaceCard,
                }}
              >
                <AppText variant="caption" color={on ? colors.onPrimary : colors.muted}>
                  {s.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={bulk}
          onChangeText={setBulk}
          placeholder={'Hydrogen - H - 1\nHelium - He - 4\nLithium - Li - 7'}
          placeholderTextColor={colors.mutedSoft}
          multiline
          textAlignVertical="top"
          style={[inputStyle, { minHeight: 160 }]}
        />
        <Button
          title={parsed.length > 0 ? `Add ${parsed.length} cards` : 'Add cards'}
          onPress={addBulk}
          disabled={parsed.length === 0}
        />
      </Card>

      {cards.length > 0 ? (
        <>
          <AppText variant="titleMd" style={{ marginTop: spacing.xs }}>
            Deck · {cards.length}
          </AppText>
          {cards.map((c) => (
            <Pressable
              key={c.id}
              onLongPress={() =>
                Alert.alert('Delete card?', `${c.front} — ${c.back}`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteCard(id, c.id) },
                ])
              }
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.surfaceStrong : colors.surfaceCard,
                borderRadius: radius.lg,
                borderCurve: 'continuous',
                padding: spacing.md,
                flexDirection: 'row',
                gap: spacing.sm,
              })}
            >
              <AppText variant="titleSm" style={{ flex: 1 }} numberOfLines={1}>
                {c.front}
              </AppText>
              <AppText variant="bodySm" color={colors.muted} style={{ flex: 1 }} numberOfLines={1}>
                {c.back}
              </AppText>
            </Pressable>
          ))}
          <AppText variant="caption" color={colors.mutedSoft}>
            Long-press a card to delete.
          </AppText>
        </>
      ) : null}
    </Screen>
  );
}
