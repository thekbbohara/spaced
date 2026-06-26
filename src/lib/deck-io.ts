import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

export type Pair = { front: string; back: string };

function csvEscape(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Export a deck to a CSV file and open the share sheet.
export async function exportDeckCsv(title: string, cards: Pair[]): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const csv = cards.map((c) => `${csvEscape(c.front)},${csvEscape(c.back)}`).join('\n');
  const safe = title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'deck';
  const file = new File(Paths.cache, `${safe}.csv`);
  try {
    file.create({ overwrite: true });
  } catch {
    // exists — overwrite below
  }
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export deck' });
  return true;
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/""/g, '"');
  return t;
}

// Parse CSV or Anki TSV text into front/back pairs. Each row's first two fields
// become front and back; '#' header lines (Anki) and blank lines are skipped.
export function parseDelimited(text: string): Pair[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
    .map((line) => {
      const sep = line.includes('\t') ? '\t' : ',';
      const fields = line.split(sep);
      const front = stripQuotes(fields[0] ?? '');
      const back = stripQuotes(fields.slice(1).join(sep === ',' ? ',' : '\t'));
      return { front, back };
    })
    .filter((p) => p.front && p.back);
}

export type ImportedDeck = { pairs: Pair[]; cancelled?: boolean };

export async function importDeckFile(): Promise<ImportedDeck> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/plain', 'text/tab-separated-values', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return { pairs: [], cancelled: true };
  const text = await new File(picked.assets[0].uri).text();
  return { pairs: parseDelimited(text) };
}
