import { addTopic } from '@/lib/topics';
import { TopicForm } from '@/components/topic-form';

export default function AddScreen() {
  return (
    <TopicForm
      intro="Add a topic you studied today. We'll resurface it tomorrow, then on an expanding schedule (3, 7, 14, 30+ days) so it sticks."
      submitLabel="Save topic"
      onSubmit={async ({ title, notes, answer }) => {
        await addTopic(title, notes, answer);
      }}
    />
  );
}
