import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { colors, spacing } from '@/lib/design';
import { formatDate, formatMinutes } from '@/lib/schedule';
import { useSession } from '@/lib/sessions';
import { AppText, Button, Card, Screen } from '@/components/cal';

export default function SessionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession(id);
  const player = useAudioPlayer(session?.recallAudioUri ? { uri: session.recallAudioUri } : null);

  if (!session) {
    return (
      <Screen contentContainerStyle={{ gap: spacing.md }}>
        <AppText variant="titleMd">Session not found</AppText>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const hasVoice = session.recallMode === 'voice' && !!session.recallAudioUri;

  return (
    <Screen contentContainerStyle={{ gap: spacing.md }}>
      <AppText variant="displaySm" selectable>
        {session.label}
      </AppText>
      <AppText variant="bodySm" color={colors.muted}>
        {formatDate(session.completedAt)} · {formatMinutes(session.recallMs)} recall
        {session.studyMs > 0 ? ` · ${formatMinutes(session.studyMs)} focus` : ''}
      </AppText>

      <Card style={{ gap: spacing.xs }}>
        <AppText variant="caption" color={colors.muted}>
          WHAT YOU RECALLED
        </AppText>
        {hasVoice ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="bodyMd" color={colors.body}>
              🎙 Voice recall
            </AppText>
            <Button
              title="▶  Play recording"
              variant="secondary"
              onPress={() => {
                player.seekTo(0);
                player.play();
              }}
            />
            {session.recallText ? (
              <AppText variant="bodyMd" color={colors.ink} selectable>
                {session.recallText}
              </AppText>
            ) : null}
          </View>
        ) : session.recallText ? (
          <AppText variant="bodyMd" color={colors.ink} selectable>
            {session.recallText}
          </AppText>
        ) : (
          <AppText variant="bodyMd" color={colors.mutedSoft}>
            No recall was captured for this session.
          </AppText>
        )}
      </Card>

      {session.topicId ? (
        <Button
          title="Open topic"
          variant="secondary"
          onPress={() => router.push(`/topic/${session.topicId}`)}
        />
      ) : session.createdTopicId ? (
        <Button
          title="Open the topic this created"
          variant="secondary"
          onPress={() => router.push(`/topic/${session.createdTopicId}`)}
        />
      ) : null}
    </Screen>
  );
}
