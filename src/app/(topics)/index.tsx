import { useMemo, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing, type } from '@/lib/design';
import { reassignGroupTopics, useTopics, type Topic } from '@/lib/topics';
import {
  GROUP_KIND_LABEL,
  childrenOf,
  deleteGroup,
  descendantIds,
  renameGroup,
  useGroups,
  type Group,
} from '@/lib/groups';
import { AppText, Badge, Button, Card, Screen } from '@/components/cal';
import { TopicRow } from '@/components/topic-card';

function GroupNode({
  group,
  depth,
  groups,
  byGroup,
  collapsed,
  toggle,
  onEdit,
}: {
  group: Group;
  depth: number;
  groups: Group[];
  byGroup: Map<string | null, Topic[]>;
  collapsed: Set<string>;
  toggle: (id: string) => void;
  onEdit: (group: Group) => void;
}) {
  const isCollapsed = collapsed.has(group.id);
  const direct = byGroup.get(group.id) ?? [];
  const subtreeCount = descendantIds(groups, group.id).reduce(
    (n, gid) => n + (byGroup.get(gid)?.length ?? 0),
    0
  );
  const children = childrenOf(groups, group.id).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View>
      <Pressable
        onPress={() => toggle(group.id)}
        onLongPress={() => onEdit(group)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.xs,
          marginTop: depth === 0 ? spacing.xs : 0,
        }}
      >
        <AppText variant="bodySm" color={colors.muted}>
          {isCollapsed ? '▸' : '▾'}
        </AppText>
        <AppText variant="titleSm" style={{ flex: 1 }} numberOfLines={1}>
          {group.name}
        </AppText>
        <Badge
          label={`${GROUP_KIND_LABEL[group.kind]} · ${subtreeCount}`}
          color={colors.surfaceCard}
          textColor={colors.muted}
        />
      </Pressable>

      {!isCollapsed ? (
        <View
          style={{
            marginLeft: spacing.sm,
            paddingLeft: spacing.sm,
            borderLeftWidth: 1,
            borderLeftColor: colors.hairline,
            gap: spacing.xs,
          }}
        >
          {direct.map((t) => (
            <TopicRow key={t.id} topic={t} />
          ))}
          {children.map((child) => (
            <GroupNode
              key={child.id}
              group={child}
              depth={depth + 1}
              groups={groups}
              byGroup={byGroup}
              collapsed={collapsed}
              toggle={toggle}
              onEdit={onEdit}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function TopicsScreen() {
  const router = useRouter();
  const topics = useTopics();
  const groups = useGroups();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Group | null>(null);
  const [renameText, setRenameText] = useState('');

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openEdit(group: Group) {
    setEditing(group);
    setRenameText(group.name);
  }

  function saveRename() {
    if (editing && renameText.trim()) renameGroup(editing.id, renameText);
    setEditing(null);
  }

  function removeFolder() {
    if (!editing) return;
    reassignGroupTopics(editing.id, editing.parentId); // topics move up to the parent
    deleteGroup(editing.id);
    setEditing(null);
  }

  const byGroup = useMemo(() => {
    const map = new Map<string | null, Topic[]>();
    for (const t of topics) {
      const key = t.groupId ?? null;
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [topics]);

  const roots = useMemo(
    () => childrenOf(groups, null).sort((a, b) => a.name.localeCompare(b.name)),
    [groups]
  );
  const ungrouped = byGroup.get(null) ?? [];

  if (topics.length === 0) {
    return (
      <Screen>
        <Card>
          <AppText variant="titleSm">No topics yet</AppText>
          <AppText variant="bodySm" color={colors.muted}>
            Head to the Today tab and log the first thing you studied. It&apos;ll show up here,
            and you can file it into folders like Physics › Mechanics.
          </AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      {roots.length > 0 ? (
        <AppText variant="caption" color={colors.mutedSoft}>
          Long-press a folder to rename or delete it.
        </AppText>
      ) : null}

      {roots.map((g) => (
        <GroupNode
          key={g.id}
          group={g}
          depth={0}
          groups={groups}
          byGroup={byGroup}
          collapsed={collapsed}
          toggle={toggle}
          onEdit={openEdit}
        />
      ))}

      {ungrouped.length > 0 ? (
        <>
          <AppText variant="titleMd" style={{ marginTop: spacing.sm }}>
            {roots.length > 0 ? 'No folder' : 'All topics'}
          </AppText>
          {ungrouped.map((t) => (
            <TopicRow key={t.id} topic={t} />
          ))}
        </>
      ) : null}

      <Modal
        visible={editing != null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(null)}
      >
        <Pressable
          onPress={() => setEditing(null)}
          style={{
            flex: 1,
            backgroundColor: '#00000088',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.canvas,
              borderRadius: radius.lg,
              borderCurve: 'continuous',
              padding: spacing.lg,
              gap: spacing.sm,
            }}
          >
            <AppText variant="titleMd">Folder</AppText>
            <Button
              title="Open folder (stats & study)"
              variant="secondary"
              onPress={() => {
                const target = editing;
                setEditing(null);
                if (target) router.push(`/folder/${target.id}`);
              }}
            />
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Folder name"
              placeholderTextColor={colors.mutedSoft}
              autoFocus
              onSubmitEditing={saveRename}
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
            <Button title="Save name" onPress={saveRename} disabled={!renameText.trim()} />
            <Button
              title="Delete folder"
              variant="secondary"
              onPress={removeFolder}
            />
            <AppText variant="caption" color={colors.mutedSoft}>
              Deleting keeps the topics — they move up to the parent folder.
            </AppText>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
