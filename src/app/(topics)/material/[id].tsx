import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius, spacing, type } from '@/lib/design';
import {
  addResource,
  removeResource,
  updateResource,
  useTopic,
  type LinkResource,
  type NoteResource,
} from '@/lib/topics';
import { AppText, Button, Screen } from '@/components/cal';

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

export default function MaterialEditor() {
  const router = useRouter();
  const { id, type: kind, resId } = useLocalSearchParams<{
    id: string;
    type: 'note' | 'link';
    resId?: string;
  }>();
  const topic = useTopic(id);
  const existing = topic?.resources?.find((r) => r.id === resId);

  const [text, setText] = useState(
    existing?.type === 'note' ? (existing as NoteResource).text : ''
  );
  const [title, setTitle] = useState(
    existing?.type === 'link' ? (existing as LinkResource).title : ''
  );
  const [url, setUrl] = useState(
    existing?.type === 'link' ? (existing as LinkResource).url : ''
  );

  const isLink = kind === 'link';
  const canSave = isLink ? url.trim().length > 0 : text.trim().length > 0;

  function save() {
    if (!canSave || !topic) return;
    if (resId) {
      updateResource(
        topic.id,
        resId,
        isLink ? { title: title.trim(), url: url.trim() } : { text: text.trim() }
      );
    } else if (isLink) {
      addResource(topic.id, { type: 'link', title: title.trim(), url: url.trim() });
    } else {
      addResource(topic.id, { type: 'note', text: text.trim() });
    }
    router.back();
  }

  function remove() {
    if (topic && resId) removeResource(topic.id, resId);
    router.back();
  }

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{ title: `${resId ? 'Edit' : 'Add'} ${isLink ? 'link' : 'note'}` }}
      />

      {isLink ? (
        <>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="caption" color={colors.muted}>
              TITLE (OPTIONAL)
            </AppText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Khan Academy — mitosis"
              placeholderTextColor={colors.mutedSoft}
              style={inputStyle}
            />
          </View>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="caption" color={colors.muted}>
              URL
            </AppText>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://…"
              placeholderTextColor={colors.mutedSoft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus={!resId}
              style={inputStyle}
            />
          </View>
        </>
      ) : (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="caption" color={colors.muted}>
            NOTE
          </AppText>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write your study notes…"
            placeholderTextColor={colors.mutedSoft}
            multiline
            autoFocus={!resId}
            textAlignVertical="top"
            style={[inputStyle, { minHeight: 200 }]}
          />
        </View>
      )}

      <Button title={resId ? 'Save changes' : 'Add'} onPress={save} disabled={!canSave} />
      {resId ? (
        <Button title="Remove" variant="danger" onPress={remove} />
      ) : (
        <Button title="Cancel" variant="secondary" onPress={() => router.back()} />
      )}
    </Screen>
  );
}
