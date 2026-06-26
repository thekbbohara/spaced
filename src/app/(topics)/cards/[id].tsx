import { useMemo, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing, type } from '@/lib/design';
import { INTERVALS, formatRelativeDay } from '@/lib/schedule';
import { pickImage } from '@/lib/files';
import { exportDeckCsv, importDeckFile } from '@/lib/deck-io';
import { isCloze } from '@/lib/cloze';
import {
  addCard,
  addCards,
  CARD_SEPARATORS,
  deleteCard,
  parseCards,
  toggleStar,
  useTopic,
  type Card as CardType,
} from '@/lib/topics';
import { AppText, Button, Card, Screen } from '@/components/cal';

function ImagePickRow({
  label,
  uri,
  onPick,
  onClear,
}: {
  label: string;
  uri: string | null;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel={`${label} image preview`}
          style={{ width: 44, height: 44, borderRadius: radius.sm }}
          contentFit="cover"
        />
      ) : null}
      <Pressable onPress={onPick} hitSlop={6}>
        <AppText variant="caption" color={colors.primary}>
          {uri ? `Change ${label} image` : `+ ${label} image`}
        </AppText>
      </Pressable>
      {uri ? (
        <Pressable onPress={onClear} hitSlop={6}>
          <AppText variant="caption" color={colors.muted}>
            Remove
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function cardStatus(c: CardType): string {
  if (c.mastered) return 'Mastered';
  if (c.lastReviewedAt == null) return 'New';
  return `Stage ${c.stage + 1}/${INTERVALS.length} · ${formatRelativeDay(c.nextReviewAt)}`;
}

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
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
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

  const canAddSingle =
    (front.trim() || frontImage) && (back.trim() || backImage || isCloze(front));

  function addSingle() {
    if (!canAddSingle) return;
    addCard(id, front, back, frontImage, backImage);
    setFront('');
    setBack('');
    setFrontImage(null);
    setBackImage(null);
  }

  async function pickFor(side: 'front' | 'back') {
    const picked = await pickImage();
    if (!picked) return;
    if (side === 'front') setFrontImage(picked.uri);
    else setBackImage(picked.uri);
  }

  async function onImportFile() {
    try {
      const res = await importDeckFile();
      if (res.cancelled) return;
      if (res.pairs.length === 0) {
        Alert.alert('Nothing imported', 'No front/back rows were found in that file.');
        return;
      }
      addCards(id, res.pairs);
      Alert.alert('Imported', `${res.pairs.length} cards added.`);
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : String(e));
    }
  }

  async function onExportDeck() {
    if (!topic) return;
    try {
      const ok = await exportDeckCsv(topic.title, cards.map((c) => ({ front: c.front, back: c.back })));
      if (!ok) Alert.alert('Sharing unavailable', 'Cannot open the share sheet on this device.');
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    }
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
        <ImagePickRow
          label="front"
          uri={frontImage}
          onPick={() => pickFor('front')}
          onClear={() => setFrontImage(null)}
        />
        <TextInput
          value={back}
          onChangeText={setBack}
          placeholder="Back (answer) — e.g. H · 1"
          placeholderTextColor={colors.mutedSoft}
          style={inputStyle}
        />
        <ImagePickRow
          label="back"
          uri={backImage}
          onPick={() => pickFor('back')}
          onClear={() => setBackImage(null)}
        />
        <AppText variant="caption" color={colors.mutedSoft}>
          Tip: cloze deletion — put {'{{c1::hidden answer}}'} in the front and leave the back
          empty to make a fill-in-the-blank card.
        </AppText>
        <Button title="Add card" onPress={addSingle} disabled={!canAddSingle} />
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

      <Card tone="canvas">
        <AppText variant="titleSm">Import / export</AppText>
        <AppText variant="bodySm" color={colors.muted}>
          Import a CSV or Anki text (TSV) file — first two columns become front and back.
        </AppText>
        <Button title="Import from file" variant="secondary" onPress={onImportFile} />
        <Button
          title="Export deck to CSV"
          variant="secondary"
          onPress={onExportDeck}
          disabled={cards.length === 0}
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
                alignItems: 'center',
                gap: spacing.sm,
              })}
            >
              {c.frontImage || c.backImage ? (
                <Image
                  source={{ uri: (c.frontImage || c.backImage) as string }}
                  accessibilityLabel="card image"
                  style={{ width: 36, height: 36, borderRadius: radius.sm }}
                  contentFit="cover"
                />
              ) : null}
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <AppText variant="titleSm" style={{ flex: 1 }} numberOfLines={1}>
                    {c.front || (c.frontImage ? '🖼 image' : '')}
                  </AppText>
                  <AppText
                    variant="bodySm"
                    color={colors.muted}
                    style={{ flex: 1 }}
                    numberOfLines={1}
                  >
                    {c.back || (c.backImage ? '🖼 image' : '')}
                  </AppText>
                </View>
                <AppText variant="caption" color={colors.mutedSoft}>
                  {cardStatus(c)}
                </AppText>
              </View>
              <Pressable
                onPress={() => toggleStar(id, c.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={c.starred ? 'Unstar card' : 'Star card as hard'}
                accessibilityState={{ selected: !!c.starred }}
              >
                <AppText variant="titleSm" color={c.starred ? colors.warning : colors.mutedSoft}>
                  {c.starred ? '★' : '☆'}
                </AppText>
              </Pressable>
            </Pressable>
          ))}
          <AppText variant="caption" color={colors.mutedSoft}>
            Tap ★ to flag a hard card · long-press to delete.
          </AppText>
        </>
      ) : null}
    </Screen>
  );
}
