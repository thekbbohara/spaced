import { useSyncExternalStore } from 'react';
import { storage } from './storage';

// A free folder tree: nest to any depth, skip any level. A topic attaches to any
// node (or none). Kinds are just labels — class › subject › unit › chapter — none
// are required.
export const GROUP_KINDS = ['class', 'subject', 'unit', 'chapter', 'custom'] as const;
export type GroupKind = (typeof GROUP_KINDS)[number];

export const GROUP_KIND_LABEL: Record<GroupKind, string> = {
  class: 'Class',
  subject: 'Subject',
  unit: 'Unit',
  chapter: 'Chapter',
  custom: 'Folder',
};

export type Group = {
  id: string;
  name: string;
  kind: GroupKind;
  parentId: string | null;
  createdAt: string;
};

const KEY = 'groups';
const EMPTY: Group[] = []; // stable ref for useSyncExternalStore

function read(): Group[] {
  return storage.get<Group[]>(KEY, EMPTY);
}

function write(groups: Group[]) {
  storage.set(KEY, groups);
}

export function addGroup(name: string, kind: GroupKind, parentId: string | null): Group {
  const now = new Date();
  const group: Group = {
    id: `g-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    kind,
    parentId,
    createdAt: now.toISOString(),
  };
  write([...read(), group]);
  return group;
}

export function renameGroup(id: string, name: string) {
  write(read().map((g) => (g.id === id ? { ...g, name: name.trim() } : g)));
}

export function setGroupKind(id: string, kind: GroupKind) {
  write(read().map((g) => (g.id === id ? { ...g, kind } : g)));
}

// Removes a group; its child groups (and any topics, handled by the caller)
// move up to the deleted group's parent so nothing is orphaned.
export function deleteGroup(id: string) {
  const all = read();
  const parentId = all.find((g) => g.id === id)?.parentId ?? null;
  write(all.filter((g) => g.id !== id).map((g) => (g.parentId === id ? { ...g, parentId } : g)));
}

export function childrenOf(groups: Group[], parentId: string | null): Group[] {
  return groups.filter((g) => g.parentId === parentId);
}

// A group and all groups nested beneath it.
export function descendantIds(groups: Group[], id: string): string[] {
  const out: string[] = [id];
  for (const child of childrenOf(groups, id)) out.push(...descendantIds(groups, child.id));
  return out;
}

// Root → node breadcrumb.
export function groupPath(groups: Group[], id: string | null): Group[] {
  const path: Group[] = [];
  let current = id ? groups.find((g) => g.id === id) : undefined;
  while (current) {
    path.unshift(current);
    current = current.parentId ? groups.find((g) => g.id === current!.parentId) : undefined;
  }
  return path;
}

export function groupPathLabel(groups: Group[], id: string | null): string {
  const path = groupPath(groups, id);
  return path.length ? path.map((g) => g.name).join(' › ') : '';
}

export function useGroups(): Group[] {
  return useSyncExternalStore((cb) => storage.subscribe(KEY, cb), read, read);
}
