import { useMemo } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing } from '@/lib/design';
import { availableCards, useTopics } from '@/lib/topics';
import { computeStats } from '@/lib/stats';
import { descendantIds, groupPathLabel, useGroups } from '@/lib/groups';
import { AppText, Button, Card, Screen } from '@/components/cal';
import { TopicRow } from '@/components/topic-card';

function Stat({ value, label }: { value: string; label: string }) {
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

export default function FolderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topics = useTopics();
  const groups = useGroups();

  const { name, inFolder, dueCards, mastered, accuracy } = useMemo(() => {
    const ids = new Set(descendantIds(groups, id));
    const inFolder = topics.filter((t) => t.groupId != null && ids.has(t.groupId));
    const now = new Date();
    return {
      name: groupPathLabel(groups, id) || 'Folder',
      inFolder,
      dueCards: inFolder.reduce((s, t) => s + availableCards(t, now).length, 0),
      mastered: inFolder.reduce(
        (s, t) => s + (t.cards ?? []).filter((c) => c.mastered).length,
        0
      ),
      accuracy: computeStats(inFolder, now).accuracy,
    };
  }, [topics, groups, id]);

  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />

      <Card>
        <View style={{ flexDirection: 'row' }}>
          <Stat value={`${inFolder.length}`} label="Topics" />
          <Stat value={`${dueCards}`} label="Cards due" />
          <Stat value={`${mastered}`} label="Mastered" />
          <Stat value={`${accuracy}%`} label="Recall" />
        </View>
      </Card>

      {dueCards > 0 ? (
        <Button
          title={`Study all ${dueCards} due in this folder`}
          onPress={() => router.push(`/study/all?due=1&shuffle=1&folder=${id}`)}
        />
      ) : (
        <AppText variant="bodySm" color={colors.muted}>
          Nothing due in this folder right now.
        </AppText>
      )}

      <AppText variant="titleMd" style={{ marginTop: spacing.xs }}>
        Topics
      </AppText>
      {inFolder.length === 0 ? (
        <Card>
          <AppText variant="bodySm" color={colors.muted}>
            No topics filed here yet.
          </AppText>
        </Card>
      ) : (
        inFolder.map((t) => <TopicRow key={t.id} topic={t} />)
      )}
    </Screen>
  );
}
