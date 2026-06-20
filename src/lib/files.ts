import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import { File, Paths } from 'expo-file-system';

export type PickedFile = { uri: string; name: string; mime: string; isImage: boolean };

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60) || 'file';
}

// Copy a transient picked/recorded file into the app's document storage so it
// survives cache clears, and return the durable uri.
export function persistToDocuments(uri: string, name: string): string {
  try {
    const dest = new File(Paths.document, `att-${Date.now()}-${safeName(name)}`);
    new File(uri).move(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

export function deleteFile(uri: string) {
  try {
    new File(uri).delete();
  } catch {
    // already gone / not removable — ignore
  }
}

export async function pickImage(): Promise<PickedFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  const name = a.fileName ?? `photo-${Date.now()}.jpg`;
  return {
    uri: persistToDocuments(a.uri, name),
    name,
    mime: a.mimeType ?? 'image/jpeg',
    isImage: true,
  };
}

export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    type: '*/*',
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  const mime = a.mimeType ?? 'application/octet-stream';
  return {
    uri: persistToDocuments(a.uri, a.name),
    name: a.name,
    mime,
    isImage: mime.startsWith('image/'),
  };
}

// Open an attachment in another app (PDF viewer, gallery, etc.).
export async function openFile(uri: string, mime: string) {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: mime });
      return;
    }
  } catch {
    // fall through to Linking
  }
  Linking.openURL(uri).catch(() => {});
}

export function openLink(url: string) {
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  Linking.openURL(normalized).catch(() => {});
}
