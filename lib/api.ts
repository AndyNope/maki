import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';

export type Category = 'Tops' | 'Bottoms' | 'Schuhe' | 'Accessoires';
export type WardrobeItem = {
  id: number;
  category: Category;
  color: string;
  color_source?: 'pixel' | 'manual' | 'legacy';
  color_coverage?: number | null;
  brightness?: number | null;
  style: string;
  description: string;
  image_url: string;
  created_at: string;
};

export const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || (Platform.OS === 'web' ? '/api' : undefined);

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!apiUrl) throw new Error('Bitte zuerst die API-Adresse konfigurieren.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${apiUrl}/${path}`, {
      ...init,
      signal: controller.signal,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Die Anfrage ist fehlgeschlagen.');
    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Zeitüberschreitung. Bitte lade den Kleiderschrank neu, bevor du es erneut versuchst.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getItems(token: string): Promise<WardrobeItem[]> {
  const result = await request<{ items: WardrobeItem[] }>('items.php', token);
  return result.items;
}

export type Outfit = { item_ids: number[]; explanation: string };

export type ColorMode = 'Harmonisch' | 'Kontrastreich' | 'Einfarbig' | 'Gewagt';
export type UploadMetadata = { category: Category; color: string };

export async function generateOutfit(token: string, mode: ColorMode, color: string): Promise<Outfit> {
  return request<Outfit>('generate_outfit.php', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, color }),
  });
}

export async function uploadItem(asset: ImagePickerAsset, token: string, metadata: UploadMetadata): Promise<WardrobeItem> {
  const form = new FormData();
  form.append('category', metadata.category);
  form.append('color', metadata.color);
  const name = asset.fileName || 'wardrobe.jpg';
  if (Platform.OS === 'web') {
    const response = await fetch(asset.uri);
    form.append('image', await response.blob(), name);
  } else {
    form.append('image', { uri: asset.uri, name, type: asset.mimeType || 'image/jpeg' } as unknown as Blob);
  }
  const result = await request<{ item: WardrobeItem }>('upload_item.php', token, { method: 'POST', body: form });
  return result.item;
}