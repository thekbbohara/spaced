import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { colors, radius, spacing, type } from '@/lib/design';
import { formatClock } from '@/lib/schedule';
import { cancel, scheduleFocusEnd } from '@/lib/notifications';
import { recallTargetMs, saveSession, type RecallMode } from '@/lib/sessions';
import { reviewTopic } from '@/lib/topics';
import { AppText, Button } from '@/components/cal';

type Phase = 'study' | 'pick' | 'recall';

// Recall-only sessions (launched from a topic's "Recalled it") skip the focus
// timer and run a flat 5-minute, skippable recall.
const RECALL_ONLY_MS = 5 * 60000;

export default function RunScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    label: string;
    duration: string;
    flow: string;
    topicId?: string;
    recallOnly?: string;
  }>();

  const label = params.label ?? 'Study session';
  const plannedMs = (Number(params.duration) || 30) * 60000;
  const flow = params.flow === '1';
  const topicId = params.topicId ?? null;
  const recallOnly = params.recallOnly === '1';

  const [phase, setPhase] = useState<Phase>(recallOnly ? 'pick' : 'study');
  const [now, setNow] = useState(Date.now());
  const studyStart = useRef(Date.now());
  const recallStart = useRef<number | null>(null);
  const cued = useRef(false);
  const focusNotifId = useRef<string | null>(null);
  const [studyMs, setStudyMs] = useState(0);

  // Recall capture
  const [mode, setMode] = useState<RecallMode | null>(null);
  const [text, setText] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chime = useAudioPlayer(require('../../../assets/chime.wav'));
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const preview = useAudioPlayer(audioUri ? { uri: audioUri } : null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // Schedule an OS notification for the goal time so the cue fires even if the
  // screen sleeps and JS pauses — no need to keep the screen on (saves battery).
  useEffect(() => {
    if (recallOnly) return; // no focus timer in a recall-only session
    let stale = false;
    scheduleFocusEnd(label, plannedMs).then((id) => {
      if (stale) cancel(id);
      else focusNotifId.current = id;
    });
    return () => {
      stale = true;
      cancel(focusNotifId.current);
      focusNotifId.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cancelFocusNotif() {
    cancel(focusNotifId.current);
    focusNotifId.current = null;
  }

  // 250ms ticker drives both timers.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const studyElapsed = phase === 'study' ? now - studyStart.current : studyMs;
  const overtime = Math.max(0, studyElapsed - plannedMs);

  // Subtle end-of-focus cue. In flow mode the timer keeps running.
  useEffect(() => {
    if (phase !== 'study' || cued.current) return;
    if (studyElapsed >= plannedMs) {
      cued.current = true;
      cancelFocusNotif(); // foreground reached the goal — the in-app chime covers it
      chime.seekTo(0);
      chime.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (!flow) endStudy(plannedMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyElapsed, phase]);

  function endStudy(ms: number) {
    cancelFocusNotif(); // moving on — don't let a stale goal alert fire mid-recall
    setStudyMs(ms);
    setPhase('pick');
  }

  async function chooseMode(m: RecallMode) {
    if (m === 'voice') {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Microphone needed', 'Enable mic access to record your recall, or write it instead.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    }
    setMode(m);
    recallStart.current = Date.now();
    setPhase('recall');
  }

  async function toggleRecording() {
    if (recorderState.isRecording) {
      await recorder.stop();
      if (recorder.uri) {
        try {
          const dest = new File(Paths.document, `recall-${Date.now()}.m4a`);
          new File(recorder.uri).move(dest);
          setAudioUri(dest.uri);
        } catch {
          setAudioUri(recorder.uri);
        }
      }
    } else {
      setAudioUri(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
    }
  }

  async function finish() {
    if (saving) return;
    setSaving(true);
    const recallMs = recallStart.current ? Date.now() - recallStart.current : 0;
    await saveSession({
      topicId,
      label,
      studyMs,
      recallMs,
      recallMode: mode,
      recallText: text,
      recallAudioUri: audioUri,
      flowMode: flow,
    });
    if (recallOnly && topicId) await reviewTopic(topicId, true);
    router.back();
  }

  function confirmQuit() {
    Alert.alert('End session?', 'Your progress in this session will be discarded.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  const recallTarget = recallOnly ? RECALL_ONLY_MS : recallTargetMs(studyMs);
  const recallElapsed = recallStart.current ? now - recallStart.current : 0;

  // ---- STUDY PHASE ----
  if (phase === 'study') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surfaceDark,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingHorizontal: spacing.lg,
        }}
      >
        <AppText variant="titleSm" color={colors.onDarkSoft} numberOfLines={1}>
          {label}
        </AppText>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
          <AppText variant="caption" color={overtime > 0 ? colors.badgeEmerald : colors.onDarkSoft}>
            {overtime > 0 ? 'IN FLOW · OVERTIME' : 'FOCUS'}
          </AppText>
          <AppText
            style={{
              ...type.displayXl,
              fontSize: 72,
              lineHeight: 78,
              color: colors.onDark,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatClock(studyElapsed)}
          </AppText>
          <AppText variant="bodySm" color={colors.onDarkSoft}>
            {overtime > 0
              ? `+${formatClock(overtime)} past your ${plannedMs / 60000} min goal`
              : `Goal: ${plannedMs / 60000} min`}
          </AppText>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Button title="End focus & recall" onPress={() => endStudy(studyElapsed)} />
          <Button title="Cancel" variant="secondary" onPress={confirmQuit} />
        </View>
      </View>
    );
  }

  // ---- PICK RECALL MODE ----
  if (phase === 'pick') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.canvas,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.lg,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}
      >
        <AppText variant="displaySm">Now recall it</AppText>
        <AppText variant="bodyMd" color={colors.body}>
          {recallOnly
            ? `Pull everything you remember about “${label}” out of memory — no notes. Aim for about ${formatClock(recallTarget)}, but finish whenever you're done.`
            : `You focused for ${formatClock(studyMs)}. Spend about ${formatClock(recallTarget)} pulling what you learned out of memory — no notes.`}
        </AppText>
        <View style={{ flex: 1 }} />
        <Button title="✍️  Write your recall" onPress={() => chooseMode('write')} />
        <Button title="🎙  Recall out loud (record)" variant="secondary" onPress={() => chooseMode('voice')} />
        <Button title="Cancel" variant="secondary" onPress={confirmQuit} />
      </View>
    );
  }

  // ---- RECALL PHASE ----
  const overTarget = recallElapsed >= recallTarget;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.lg,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="titleMd">Active recall</AppText>
        <AppText
          variant="titleMd"
          color={overTarget ? colors.success : colors.ink}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {formatClock(recallElapsed)} / {formatClock(recallTarget)}
        </AppText>
      </View>
      <AppText variant="bodySm" color={colors.muted}>
        {label}
      </AppText>

      {mode === 'write' ? (
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write everything you can remember…"
          placeholderTextColor={colors.mutedSoft}
          multiline
          autoFocus
          textAlignVertical="top"
          style={{
            ...type.bodyMd,
            color: colors.ink,
            minHeight: 240,
            borderWidth: 1,
            borderColor: colors.hairline,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            padding: spacing.md,
          }}
        />
      ) : (
        <View style={{ gap: spacing.md, alignItems: 'center', paddingVertical: spacing.lg }}>
          <Pressable
            onPress={toggleRecording}
            style={{
              width: 96,
              height: 96,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: recorderState.isRecording ? colors.error : colors.primary,
            }}
          >
            <AppText variant="button" color={colors.onPrimary}>
              {recorderState.isRecording ? 'Stop' : audioUri ? 'Redo' : 'Record'}
            </AppText>
          </Pressable>
          <AppText variant="bodySm" color={colors.muted}>
            {recorderState.isRecording
              ? `Recording… ${formatClock(recorderState.durationMillis ?? 0)}`
              : audioUri
                ? 'Recorded. Tap play to review, or Redo.'
                : 'Tap to record yourself explaining it from memory.'}
          </AppText>
          {audioUri && !recorderState.isRecording ? (
            <Button
              title="▶  Play back"
              variant="secondary"
              onPress={() => {
                preview.seekTo(0);
                preview.play();
              }}
            />
          ) : null}
        </View>
      )}

      <Button
        title={saving ? 'Saving…' : recallOnly ? 'Save & mark recalled' : 'Save & schedule review'}
        onPress={finish}
        disabled={saving || (mode === 'write' ? text.trim().length === 0 : !audioUri)}
      />
      <Button title="Discard" variant="secondary" onPress={confirmQuit} />
    </ScrollView>
  );
}
