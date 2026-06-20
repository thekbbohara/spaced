import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { storage } from './storage';

const KEYS = ['topics', 'settings', 'sessions'] as const;
const FORMAT = 'active-recall-backup';

type Backup = {
  format: string;
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
};

function collect(): Backup {
  const data: Record<string, unknown> = {};
  for (const key of KEYS) {
    const raw = localStorage.getItem(key);
    if (raw != null) data[key] = JSON.parse(raw);
  }
  return { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), data };
}

// Write the backup to a JSON file and open the share sheet (save to Files,
// send to yourself, etc.). Returns false if sharing is unavailable.
export async function exportBackup(): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `active-recall-${stamp}.json`);
  try {
    file.create({ overwrite: true });
  } catch {
    // already exists — fall through and overwrite contents
  }
  file.write(JSON.stringify(collect(), null, 2));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save Active Recall backup',
  });
  return true;
}

export type ImportResult = { topics: number; cancelled?: boolean };

// Pick a backup JSON and restore it, replacing current topics/settings/sessions.
export async function importBackup(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return { topics: 0, cancelled: true };

  const text = await new File(picked.assets[0].uri).text();
  const parsed = JSON.parse(text) as Backup;
  if (parsed?.format !== FORMAT || !parsed.data || !Array.isArray(parsed.data.topics)) {
    throw new Error('Not an Active Recall backup file.');
  }
  for (const key of KEYS) {
    if (parsed.data[key] !== undefined) storage.set(key, parsed.data[key]);
  }
  return { topics: (parsed.data.topics as unknown[]).length };
}
