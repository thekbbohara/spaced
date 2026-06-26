import { Stack, useLocalSearchParams } from 'expo-router';
import { editTopic, useTopic } from '@/lib/topics';
import { AppText, Screen } from '@/components/cal';
import { TopicForm } from '@/components/topic-form';

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = useTopic(id);

  if (!topic) {
    return (
      <Screen>
        <AppText variant="titleMd">Topic not found</AppText>
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit topic' }} />
      <TopicForm
        initial={{
          title: topic.title,
          notes: topic.notes,
          answer: topic.answer,
          keyPoints: topic.keyPoints ?? '',
          groupId: topic.groupId ?? null,
        }}
        submitLabel="Save changes"
        onSubmit={(values) => editTopic(topic.id, values)}
      />
    </>
  );
}
