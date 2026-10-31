import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Button, IconButton, Label } from './ui';

export function WardrobeCamera({ onCapture, onClose }: { onCapture: (asset: ImagePickerAsset) => void; onClose: () => void }) {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function capture() {
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.85 });
      if (!photo) throw new Error('Kein Foto aufgenommen.');
      onCapture({ uri: photo.uri, width: photo.width, height: photo.height, mimeType: 'image/jpeg', fileName: 'wardrobe.jpg' });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Aufnahme fehlgeschlagen.'); }
    finally { setBusy(false); }
  }

  if (!permission?.granted) return <View style={{ gap: 16 }}><Label>Kamerazugriff {permission?.canAskAgain === false ? 'in den Geräteeinstellungen erforderlich' : 'erforderlich'}.</Label>{permission?.canAskAgain !== false && <Button title="Kamera freigeben" icon="camera" onPress={() => { void requestPermission().catch(() => setError('Kamerazugriff nicht verfügbar.')); }} />}<Button title="Zurück" secondary onPress={onClose} />{error !== '' && <Label>{error}</Label>}</View>;
  return <View style={{ gap: 12 }}>
    <View style={sheet.frame}><CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" flash={flash ? 'on' : 'off'} onCameraReady={() => setReady(true)} onMountError={() => setError('Kamera nicht verfügbar. Bitte ein Foto wählen.')} /><View pointerEvents="none" style={sheet.guide} /></View>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><IconButton icon="x" label="Kamera schließen" onPress={onClose} />{Platform.OS !== 'web' && <IconButton icon={flash ? 'zap' : 'zap-off'} label={flash ? 'Blitz ausschalten' : 'Blitz einschalten'} active={flash} onPress={() => setFlash(previous => !previous)} />}<Button title={busy ? 'Aufnahme ...' : 'Foto aufnehmen'} icon="camera" disabled={!ready || busy} onPress={capture} style={{ flex: 1 }} /></View>
    {error !== '' && <Label style={{ color: '#A13B3B' }}>{error}</Label>}
  </View>;
}
const sheet = StyleSheet.create({
  frame: { height: 300, width: '100%', overflow: 'hidden', backgroundColor: '#202820', borderRadius: 6 },
  guide: { position: 'absolute', left: '25%', top: '20%', width: '50%', height: '60%', borderWidth: 2, borderColor: '#FFFFFFBB', borderRadius: 4 },
});