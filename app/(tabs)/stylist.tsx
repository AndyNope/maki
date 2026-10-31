import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Button, colors, Label, Notice, styles } from '../../components/ui';
import { generateOutfit, type ColorMode, type Outfit, type WardrobeItem } from '../../lib/api';
import { useWardrobe } from '../../lib/store';
import { ColorPicker } from '../../components/color-picker';
import { demoOutfit } from '../../lib/color-outfit';

export default function StylistScreen() {
  const wardrobe = useWardrobe();
  const { width } = useWindowDimensions();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ColorMode>('Harmonisch');
  const [targetColor, setTargetColor] = useState('#336699');
  const [saved, setSaved] = useState(false);
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const activeOutfits = showSaved ? savedOutfits : outfit ? [outfit] : [];

  async function generate() {
    setBusy(true);
    setError('');
    setSaved(false);
    setShowSaved(false);
    try {
      if (!/^#[0-9a-f]{6}$/i.test(targetColor)) throw new Error('Bitte einen gültigen HEX-Farbcode wählen.');
      if (wardrobe.connected) setOutfit(await generateOutfit(wardrobe.token, mode, targetColor));
      else setOutfit(demoOutfit(wardrobe.items, mode, targetColor));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Das Outfit konnte nicht erstellt werden.'); }
    finally { setBusy(false); }
  }

  return <ScrollView contentContainerStyle={[sheet.page, width < 700 && { padding: 22 }]}>
    <Text style={styles.eyebrow}>NEUE PERSPEKTIVE. DEINE TEILE.</Text><Text style={[styles.title, { marginTop: 12 }]}>Outfit Studio.</Text><Label style={{ color: colors.muted, marginTop: 10 }}>Heute: {mode}.</Label>
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>{(['Harmonisch', 'Kontrastreich', 'Einfarbig', 'Gewagt'] as ColorMode[]).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: mode === value }} disabled={busy} onPress={() => { setMode(value); setOutfit(null); }} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 5, backgroundColor: mode === value ? colors.green : '#EDF2E9' }}><Label style={{ color: mode === value ? '#fff' : colors.ink }}>{value}</Label></Pressable>)}</View>
    {mode === 'Einfarbig' && <View style={{ maxWidth: 440, marginTop: 18 }}><ColorPicker value={targetColor} onChange={value => { if (!busy) { setTargetColor(value); setOutfit(null); } }} /></View>}
    {!wardrobe.connected && <View style={{ marginTop: 20 }}><Notice>Demo-Kleiderschrank</Notice></View>}
    <View style={sheet.actions}><Button title={busy ? 'Dein Look entsteht ...' : 'Neuen Look kombinieren'} icon="sun" disabled={busy || wardrobe.loading || wardrobe.items.length === 0} onPress={generate} /><Button title={`Gemerkte Looks (${savedOutfits.length})`} icon="bookmark" secondary onPress={() => setShowSaved(value => !value)} /></View>
    {error !== '' && <Label style={{ color: '#A13B3B' }}>{error}</Label>}
    {activeOutfits.length === 0 && <View style={sheet.empty}><Image source={{ uri: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&auto=format&fit=crop&q=85' }} style={sheet.mood} /><View style={sheet.caption}><Label style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 24, color: '#fff' }}>{showSaved ? 'Noch kein Look gemerkt.' : 'Gleicher Schrank. Neues Gefühl.'}</Label></View></View>}
    {activeOutfits.map((look, index) => <View key={index} style={{ marginTop: 24 }}><View style={sheet.grid}>{look.item_ids.map(id => wardrobe.items.find(item => item.id === id)).filter((item): item is WardrobeItem => Boolean(item)).map(item => <View key={item.id} style={{ width: width < 700 ? '50%' : '25%', padding: 6 }}><Image source={{ uri: item.image_url }} style={sheet.image} /><Label style={{ marginTop: 8, fontSize: 12 }}>{item.description}</Label></View>)}</View><Label style={{ color: colors.muted, marginVertical: 20 }}>{look.explanation}</Label>{!showSaved && <Button title={saved ? 'Für diese Sitzung gemerkt' : 'Look merken'} icon="bookmark" secondary disabled={saved} onPress={() => { setSavedOutfits(previous => [look, ...previous]); setSaved(true); }} style={{ alignSelf: 'flex-start' }} />}</View>)}
  </ScrollView>;
}
const sheet = StyleSheet.create({
  page: { padding: 42, width: '100%', maxWidth: 1300, alignSelf: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  image: { width: '100%', aspectRatio: 0.8, borderRadius: 6, backgroundColor: '#EDF0E8' },
  empty: { marginTop: 12, height: 330, overflow: 'hidden', borderRadius: 7, backgroundColor: '#E5E8DF' },
  mood: { height: '100%', width: '100%' },
  caption: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: '#17251A88' },
});