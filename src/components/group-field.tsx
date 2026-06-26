import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { colors, radius, spacing, type } from '@/lib/design';
import {
  GROUP_KINDS,
  GROUP_KIND_LABEL,
  addGroup,
  childrenOf,
  groupPathLabel,
  useGroups,
  type Group,
  type GroupKind,
} from '@/lib/groups';
import { AppText } from './cal';

type Flat = { group: Group; depth: number };

// Depth-first flatten so the picker shows the tree with indentation.
function flatten(groups: Group[], parentId: string | null, depth: number): Flat[] {
  return childrenOf(groups, parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((g) => [{ group: g, depth }, ...flatten(groups, g.id, depth + 1)]);
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radius.pill,
        backgroundColor: on ? colors.primary : colors.surfaceCard,
      }}
    >
      <AppText variant="caption" color={on ? colors.onPrimary : colors.muted}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function GroupField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (groupId: string | null) => void;
}) {
  const groups = useGroups();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<GroupKind>('subject');

  const rows = useMemo(() => flatten(groups, null, 0), [groups]);
  const selectedLabel = groupPathLabel(groups, value);
  const parentLabel = value ? selectedLabel : 'Top level';

  function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const g = addGroup(trimmed, kind, value); // nests under the current selection
    onChange(g.id);
    setName('');
    setCreating(false);
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="caption" color={colors.muted}>
        FOLDER (OPTIONAL)
      </AppText>

      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.canvas,
          borderWidth: 1,
          borderColor: colors.hairline,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <AppText variant="bodyMd" color={value ? colors.ink : colors.mutedSoft} numberOfLines={1}>
          {value ? selectedLabel : 'No folder'}
        </AppText>
        <AppText variant="caption" color={colors.muted}>
          {open ? 'Done' : 'Change'}
        </AppText>
      </Pressable>

      {open ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.hairline,
            borderRadius: radius.md,
            borderCurve: 'continuous',
            padding: spacing.xs,
            gap: 2,
          }}
        >
          <Pressable
            onPress={() => onChange(null)}
            style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }}
          >
            <AppText variant="bodyMd" color={value === null ? colors.primary : colors.body}>
              {value === null ? '✓ ' : ''}No folder
            </AppText>
          </Pressable>

          {rows.map(({ group, depth }) => (
            <Pressable
              key={group.id}
              onPress={() => onChange(group.id)}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                paddingLeft: spacing.sm + depth * spacing.md,
              }}
            >
              <AppText
                variant="bodyMd"
                color={value === group.id ? colors.primary : colors.body}
                numberOfLines={1}
              >
                {value === group.id ? '✓ ' : ''}
                {group.name}{' '}
                <AppText variant="caption" color={colors.mutedSoft}>
                  {GROUP_KIND_LABEL[group.kind]}
                </AppText>
              </AppText>
            </Pressable>
          ))}

          {creating ? (
            <View style={{ gap: spacing.xs, padding: spacing.sm }}>
              <AppText variant="caption" color={colors.muted}>
                New folder inside: {parentLabel}
              </AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Folder name (e.g. Physics, Mechanics)"
                placeholderTextColor={colors.mutedSoft}
                autoFocus
                onSubmitEditing={create}
                style={{
                  ...type.bodyMd,
                  color: colors.ink,
                  backgroundColor: colors.canvas,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                  borderRadius: radius.md,
                  borderCurve: 'continuous',
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                }}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {GROUP_KINDS.map((k) => (
                  <Chip key={k} label={GROUP_KIND_LABEL[k]} on={kind === k} onPress={() => setKind(k)} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Pressable onPress={create} hitSlop={8}>
                  <AppText variant="button" color={colors.primary}>
                    Add folder
                  </AppText>
                </Pressable>
                <Pressable onPress={() => setCreating(false)} hitSlop={8}>
                  <AppText variant="button" color={colors.muted}>
                    Cancel
                  </AppText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setCreating(true)}
              style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }}
            >
              <AppText variant="bodyMd" color={colors.primary}>
                ＋ New folder{value ? ` inside ${selectedLabel}` : ''}
              </AppText>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}
