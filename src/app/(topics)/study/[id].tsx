import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, type } from '@/lib/design';
import {
  availableCards,
  gradeCard,
  restoreCard,
  syncReminders,
  toggleStar,
  updateCard,
  useTopics,
  type Card,
} from '@/lib/topics';
import { AppText, Button } from '@/components/cal';

function shuffled(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function Toggle({
  label,
  on,
  onPress,
  disabled,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radius.pill,
        backgroundColor: on ? colors.primary : colors.surfaceCard,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <AppText variant="caption" color={on ? colors.onPrimary : colors.muted}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function StudyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, due, shuffle, reverse, starred } = useLocalSearchParams<{
    id: string;
    due?: string;
    shuffle?: string;
    reverse?: string;
    starred?: string;
  }>();
  const topics = useTopics();
  const isAll = id === 'all'; // mixed review across every topic/folder
  const topic = isAll ? undefined : topics.find((t) => t.id === id);

  // Snapshot the deck once so grading (which mutates the store) doesn't reshuffle
  // the session under us. Each card remembers its owning topic so grades route
  // back correctly in a mixed session.
  const { deck, topicOf } = useMemo(() => {
    const map = new Map<string, Card>();
    const owner = new Map<string, string>();
    const sources = isAll ? topics : topic ? [topic] : [];
    for (const t of sources) {
      const pool =
        starred === '1'
          ? (t.cards ?? []).filter((c) => c.starred)
          : due === '1' || isAll
            ? availableCards(t)
            : (t.cards ?? []);
      for (const c of pool) {
        map.set(c.id, c);
        owner.set(c.id, t.id);
      }
    }
    return { deck: map, topicOf: owner };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [queue, setQueue] = useState<string[]>(() => {
    const ids = Array.from(deck.keys());
    return shuffle === '1' ? shuffled(ids) : ids;
  });
  const [rev, setRev] = useState(reverse === '1');
  const [typing, setTyping] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [typed, setTyped] = useState('');
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(0);
  const [again, setAgain] = useState(0);
  const [stars, setStars] = useState<Set<string>>(
    () => new Set(Array.from(deck.values()).filter((c) => c.starred).map((c) => c.id))
  );
  // Pre-grade card snapshots so the last grade can be undone.
  const [history, setHistory] = useState<{ snapshot: Card; requeued: boolean }[]>([]);
  // Mid-session card edits override the frozen deck snapshot's content.
  const [edits, setEdits] = useState<Record<string, { front: string; back: string }>>({});
  const [editing, setEditing] = useState(false);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  const total = deck.size;
  const currentId = queue[0];
  const card = currentId ? deck.get(currentId) : undefined;

  // Grading mutates due state; refresh the reminder batch when leaving the deck.
  useEffect(() => () => {
    syncReminders();
  }, []);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: flipped ? 1 : 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [flipped, currentId, anim]);

  const override = currentId ? edits[currentId] : undefined;
  const frontText = override?.front ?? card?.front ?? '';
  const backText = override?.back ?? card?.back ?? '';
  const prompt = rev ? backText : frontText;
  const answer = rev ? frontText : backText;
  const isStarred = currentId ? stars.has(currentId) : false;

  function flip() {
    setFlipped((f) => !f);
  }

  function nextCard(requeue: boolean) {
    anim.stopAnimation();
    anim.setValue(0); // snap to prompt so next card's answer never flashes
    setFlipped(false);
    setTyped('');
    setChecked(false);
    if (requeue) {
      setQueue((q) => [...q.slice(1), q[0]]);
    } else {
      setQueue((q) => q.slice(1));
    }
  }

  function grade(good: boolean) {
    if (!currentId) return;
    const tid = topicOf.get(currentId);
    if (!tid) return;
    const snapshot = topics.find((t) => t.id === tid)?.cards?.find((c) => c.id === currentId);
    gradeCard(tid, currentId, good);
    if (snapshot) setHistory((h) => [...h, { snapshot, requeued: !good }]);
    if (good) {
      setDone((d) => d + 1);
      nextCard(false);
    } else {
      setAgain((a) => a + 1);
      nextCard(true); // re-study this session
    }
  }

  function undo() {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    const cardId = last.snapshot.id;
    const tid = topicOf.get(cardId);
    if (tid) restoreCard(tid, last.snapshot); // revert SR fields, lapses, auto-star
    if (last.requeued) {
      setQueue((q) => {
        const i = q.lastIndexOf(cardId);
        const without = i >= 0 ? [...q.slice(0, i), ...q.slice(i + 1)] : q;
        return [cardId, ...without];
      });
      setAgain((a) => Math.max(0, a - 1));
    } else {
      setQueue((q) => [cardId, ...q]);
      setDone((d) => Math.max(0, d - 1));
    }
    setStars((s) => {
      const next = new Set(s);
      last.snapshot.starred ? next.add(cardId) : next.delete(cardId);
      return next;
    });
    anim.stopAnimation();
    anim.setValue(0);
    setFlipped(false);
    setChecked(false);
    setTyped('');
    setHistory((h) => h.slice(0, -1));
  }

  function startEdit() {
    setEditFront(frontText);
    setEditBack(backText);
    setEditing(true);
  }

  function saveEdit() {
    if (!currentId) return;
    const tid = topicOf.get(currentId);
    if (!tid) return;
    updateCard(tid, currentId, { front: editFront, back: editBack });
    setEdits((e) => ({ ...e, [currentId]: { front: editFront.trim(), back: editBack.trim() } }));
    setEditing(false);
  }

  function check() {
    setChecked(true);
    setFlipped(true);
  }

  function star() {
    if (!currentId) return;
    const tid = topicOf.get(currentId);
    if (!tid) return;
    toggleStar(tid, currentId);
    setStars((s) => {
      const next = new Set(s);
      next.has(currentId) ? next.delete(currentId) : next.add(currentId);
      return next;
    });
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

  const correct = checked && normalize(typed) === normalize(answer);
  const frontFace = {
    transform: [
      { perspective: 1000 },
      { rotateY: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
    ],
  };
  const backFace = {
    transform: [
      { perspective: 1000 },
      { rotateY: anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) },
    ],
  };

  return (
    <View style={wrap}>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <AppText variant="caption" color={colors.muted}>
          {done}/{total} done · {queue.length} left
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {history.length > 0 ? (
            <Pressable onPress={undo} hitSlop={12}>
              <AppText variant="button" color={colors.muted}>
                ↩ Undo
              </AppText>
            </Pressable>
          ) : null}
          <Pressable onPress={close} hitSlop={12}>
            <AppText variant="button" color={colors.muted}>
              Close
            </AppText>
          </Pressable>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.xs,
          flexWrap: 'wrap',
          marginTop: spacing.sm,
        }}
      >
        <Toggle label="⇄ Reverse" on={rev} onPress={() => setRev((r) => !r)} />
        <Toggle
          label="⌨ Type"
          on={typing}
          onPress={() => {
            setTyping((t) => !t);
            setChecked(false);
            setTyped('');
            setFlipped(false);
          }}
        />
        <Toggle
          label="🔀 Shuffle"
          onPress={() => {
            setQueue((q) => shuffled(q));
            setFlipped(false);
          }}
          disabled={queue.length < 2}
        />
        <Toggle label={isStarred ? '★ Starred' : '☆ Star'} on={isStarred} onPress={star} />
        <Toggle label="✎ Edit" on={editing} onPress={editing ? () => setEditing(false) : startEdit} />
      </View>

      <View style={{ flex: 1, marginVertical: spacing.md }}>
        {editing ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: spacing.xs }}
            keyboardShouldPersistTaps="handled"
          >
            <AppText variant="caption" color={colors.muted}>
              FRONT
            </AppText>
            <TextInput
              value={editFront}
              onChangeText={setEditFront}
              multiline
              placeholder="Front"
              placeholderTextColor={colors.mutedSoft}
              style={{
                ...type.bodyMd,
                color: colors.ink,
                backgroundColor: colors.surfaceCard,
                borderWidth: 1,
                borderColor: colors.hairline,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                padding: spacing.md,
                minHeight: 80,
              }}
            />
            <AppText variant="caption" color={colors.muted} style={{ marginTop: spacing.sm }}>
              BACK
            </AppText>
            <TextInput
              value={editBack}
              onChangeText={setEditBack}
              multiline
              placeholder="Back"
              placeholderTextColor={colors.mutedSoft}
              style={{
                ...type.bodyMd,
                color: colors.ink,
                backgroundColor: colors.surfaceCard,
                borderWidth: 1,
                borderColor: colors.hairline,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                padding: spacing.md,
                minHeight: 80,
              }}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setEditing(false)}
              />
              <Button
                title="Save"
                style={{ flex: 1 }}
                onPress={saveEdit}
                disabled={!editFront.trim() || !editBack.trim()}
              />
            </View>
          </ScrollView>
        ) : (
          <Pressable
            onPress={typing && !checked ? undefined : flip}
            style={{ flex: 1 }}
          >
          {[
            { face: frontFace, text: prompt, label: 'PROMPT', filled: false },
            { face: backFace, text: answer, label: 'ANSWER', filled: true },
          ].map((f) => (
            <Animated.View
              key={f.label}
              style={[
                {
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  backgroundColor: f.filled ? colors.surfaceCard : colors.canvas,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                  borderRadius: radius.xl,
                  borderCurve: 'continuous',
                },
                f.face,
              ]}
            >
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: spacing.xl,
                }}
              >
                <AppText
                  variant="caption"
                  color={colors.mutedSoft}
                  style={{ marginBottom: spacing.md }}
                >
                  {f.label}
                </AppText>
                <AppText style={{ ...type.displaySm, textAlign: 'center' }} selectable>
                  {f.text}
                </AppText>
                {!f.filled && !typing ? (
                  <AppText
                    variant="caption"
                    color={colors.mutedSoft}
                    style={{ marginTop: spacing.lg }}
                  >
                    tap to flip
                  </AppText>
                ) : null}
              </ScrollView>
            </Animated.View>
          ))}
          </Pressable>
        )}
      </View>

      {!editing && typing && checked ? (
        <AppText
          variant="bodySm"
          color={correct ? colors.success : colors.error}
          style={{ textAlign: 'center', marginBottom: spacing.sm }}
        >
          {correct ? '✓ Correct' : `✗ You wrote “${typed.trim() || '—'}”`}
        </AppText>
      ) : null}

      {editing ? null : typing && !checked ? (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            placeholder="Type the answer…"
            placeholderTextColor={colors.mutedSoft}
            autoFocus
            onSubmitEditing={check}
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
          <Button title="Check" onPress={check} />
        </View>
      ) : flipped || checked ? (
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
