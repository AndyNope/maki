import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiUrl, getItems, uploadItem, type WardrobeItem, type UploadMetadata } from './api';
import { demoItems } from './demo';
import type { ImagePickerAsset } from 'expo-image-picker';

function useWardrobeState() {
  const [token, setToken] = useState('');
  const [items, setItems] = useState<WardrobeItem[]>(demoItems);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [preference, setPreference] = useState('Minimal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const connected = Boolean(apiUrl && token);

  useEffect(() => {
    let active = true;
    setError('');
    setFavorites([]);
    if (!connected) {
      setItems(demoItems);
      setLoading(false);
      return;
    }
    setItems([]);
    setLoading(true);
    getItems(token).then(data => { if (active) setItems(data); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Verbindung fehlgeschlagen.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [connected, token, revision]);

  async function upload(asset: ImagePickerAsset, metadata: UploadMetadata) {
    if (!connected) throw new Error('Verbinde zuerst dein Backend im Profil.');
    const item = await uploadItem(asset, token, metadata);
    setItems(previous => [item, ...previous.filter(existing => existing.id !== item.id)]);
    return item;
  }

  function toggleFavorite(id: number) {
    setFavorites(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  }

  return { token, setToken, items, favorites, toggleFavorite, preference, setPreference, loading, error, connected, upload, refresh: () => setRevision(value => value + 1) };
}

const WardrobeContext = createContext<ReturnType<typeof useWardrobeState> | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const state = useWardrobeState();
  return <WardrobeContext.Provider value={state}>{children}</WardrobeContext.Provider>;
}

export function useWardrobe() {
  const state = useContext(WardrobeContext);
  if (!state) throw new Error('WardrobeProvider fehlt.');
  return state;
}