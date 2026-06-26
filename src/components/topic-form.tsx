import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing, type } from '@/lib/design';
import { AppText, Button, Screen } from './cal';
import { GroupField } from './group-field';

export type TopicFormValues = {
  title: string;
  notes: string;
  answer: string;
  groupId: string | null;
};

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="caption" color={colors.muted}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

export function TopicForm({
  intro,
  initial,
  submitLabel,
  onSubmit,
}: {
  intro?: string;
  initial?: Partial<TopicFormValues>;
  submitLabel: string;
  onSubmit: (values: TopicFormValues) => Promise<void> | void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  const [groupId, setGroupId] = useState<string | null>(initial?.groupId ?? null);

  const canSave = title.trim().length > 0;

  async function submit() {
    if (!canSave) return;
    await onSubmit({ title, notes, answer, groupId });
    router.back();
  }

  return (
    <Screen keyboardShouldPersistTaps="handled">
      {intro ? (
        <AppText variant="bodySm" color={colors.muted}>
          {intro}
        </AppText>
      ) : null}

      <Field label="TOPIC">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Krebs cycle, useEffect deps"
          placeholderTextColor={colors.mutedSoft}
          autoFocus={!initial}
          style={inputStyle}
        />
      </Field>

      <Field label="PROMPT / CUE (OPTIONAL)">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="The question to recall against"
          placeholderTextColor={colors.mutedSoft}
          multiline
          style={[inputStyle, { height: 90, paddingTop: spacing.sm }]}
        />
      </Field>

      <Field label="ANSWER (OPTIONAL — FLASHCARD BACK)">
        <TextInput
          value={answer}
          onChangeText={setAnswer}
          placeholder="What you should be able to recall"
          placeholderTextColor={colors.mutedSoft}
          multiline
          style={[inputStyle, { height: 110, paddingTop: spacing.sm }]}
        />
      </Field>

      <GroupField value={groupId} onChange={setGroupId} />

      <Button title={submitLabel} onPress={submit} disabled={!canSave} />
      <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
