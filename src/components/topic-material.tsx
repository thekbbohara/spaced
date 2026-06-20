import { ReactNode } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '@/lib/design';
import { openFile, openLink, pickDocument, pickImage } from '@/lib/files';
import {
  addResource,
  removeResource,
  type FileResource,
  type LinkResource,
  type NoteResource,
  type Topic,
} from '@/lib/topics';
import { AppText, Button } from './cal';

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <AppText variant="titleSm">{title}</AppText>
        {count > 0 ? (
          <AppText variant="caption" color={colors.muted}>
            {count}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function RowCard({
  children,
  onPress,
  onLongPress,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.surfaceStrong : colors.surfaceCard,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        padding: spacing.md,
        gap: spacing.xxs,
      })}
    >
      {children}
    </Pressable>
  );
}

export function TopicMaterial({ topic }: { topic: Topic }) {
  const router = useRouter();
  const resources = topic.resources ?? [];
  const notes = resources.filter((r): r is NoteResource => r.type === 'note');
  const links = resources.filter((r): r is LinkResource => r.type === 'link');
  const files = resources.filter((r): r is FileResource => r.type === 'file');
  const images = files.filter((f) => f.isImage);
  const docs = files.filter((f) => !f.isImage);

  function confirmRemove(id: string, label: string) {
    Alert.alert('Remove?', label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeResource(topic.id, id) },
    ]);
  }

  async function attach(kind: 'image' | 'file') {
    const picked = kind === 'image' ? await pickImage() : await pickDocument();
    if (picked) {
      addResource(topic.id, {
        type: 'file',
        name: picked.name,
        uri: picked.uri,
        mime: picked.mime,
        isImage: picked.isImage,
      });
    }
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <AppText variant="titleMd">Study material</AppText>

      <Section title="Notes" count={notes.length}>
        {notes.map((n) => (
          <RowCard
            key={n.id}
            onPress={() => router.push(`/material/${topic.id}?type=note&resId=${n.id}`)}
            onLongPress={() => confirmRemove(n.id, n.text.slice(0, 40))}
          >
            <AppText variant="bodyMd" color={colors.ink} numberOfLines={4}>
              {n.text}
            </AppText>
          </RowCard>
        ))}
        <Button
          title="＋ Add note"
          variant="secondary"
          onPress={() => router.push(`/material/${topic.id}?type=note`)}
        />
      </Section>

      <Section title="Quick links" count={links.length}>
        {links.map((l) => (
          <RowCard
            key={l.id}
            onPress={() => openLink(l.url)}
            onLongPress={() =>
              Alert.alert(l.title || l.url, l.url, [
                { text: 'Open', onPress: () => openLink(l.url) },
                {
                  text: 'Edit',
                  onPress: () => router.push(`/material/${topic.id}?type=link&resId=${l.id}`),
                },
                { text: 'Remove', style: 'destructive', onPress: () => removeResource(topic.id, l.id) },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          >
            <AppText variant="titleSm" numberOfLines={1}>
              🔗 {l.title || l.url}
            </AppText>
            <AppText variant="caption" color={colors.muted} numberOfLines={1}>
              {l.url}
            </AppText>
          </RowCard>
        ))}
        <Button
          title="＋ Add link"
          variant="secondary"
          onPress={() => router.push(`/material/${topic.id}?type=link`)}
        />
      </Section>

      <Section title="Attachments" count={files.length}>
        {images.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {images.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => openFile(f.uri, f.mime)}
                onLongPress={() => confirmRemove(f.id, f.name)}
              >
                <Image
                  source={{ uri: f.uri }}
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceCard,
                  }}
                  contentFit="cover"
                />
              </Pressable>
            ))}
          </View>
        ) : null}
        {docs.map((f) => (
          <RowCard
            key={f.id}
            onPress={() => openFile(f.uri, f.mime)}
            onLongPress={() => confirmRemove(f.id, f.name)}
          >
            <AppText variant="titleSm" numberOfLines={1}>
              📄 {f.name}
            </AppText>
          </RowCard>
        ))}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            title="🖼 Photo"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => attach('image')}
          />
          <Button
            title="📎 File"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => attach('file')}
          />
        </View>
      </Section>
    </View>
  );
}
