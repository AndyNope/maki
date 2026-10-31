import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Link, useRouter } from 'expo-router';
import { Button, colors, Icon, IconButton, Label, Notice, styles } from '../../components/ui';
import { useWardrobe } from '../../lib/store';
import type { Category, WardrobeItem } from '../../lib/api';
import { ColorPicker } from '../../components/color-picker';
import { WardrobeCamera } from '../../components/wardrobe-camera';

const categories: ('Alle' | Category)[] = ['Alle', 'Tops', 'Bottoms', 'Schuhe', 'Accessoires'];

export default function WardrobeScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const columns = width >= 1250 ? 4 : width >= 1000 ? 3 : width >= 700 ? 3 : 2;
  const router = useRouter();
  const wardrobe = useWardrobe();
  const [category, setCategory] = useState('Alle');
  const [query, setQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [oldestFirst, setOldestFirst] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<WardrobeItem | null>(null);
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadCategory, setUploadCategory] = useState<Category>('Tops');
  const [uploadColor, setUploadColor] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const items = wardrobe.items.filter(item => (category === 'Alle' || item.category === category) && (!onlyFavorites || wardrobe.favorites.includes(item.id)) && `${item.description} ${item.color} ${item.style}`.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de'))).sort((first, second) => oldestFirst ? first.created_at.localeCompare(second.created_at) : second.created_at.localeCompare(first.created_at));

  async function pick() {
    try {
      setUploadError('');
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, allowsEditing: true };
      const result = await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) {
        if ((result.assets[0].fileSize || 0) > 8 * 1024 * 1024) throw new Error('Das Bild darf maximal 8 MB groß sein.');
        setAsset(result.assets[0]);
      }
    } catch (error) { setUploadError(error instanceof Error ? error.message : 'Das Foto konnte nicht geöffnet werden.'); }
  }

  async function save() {
    if (!asset || busy) return;
    setBusy(true);
    setUploadError('');
    try {
      if (uploadColor !== '' && !/^#[0-9a-f]{6}$/i.test(uploadColor)) throw new Error('Bitte einen gültigen HEX-Farbcode eingeben.');
      await wardrobe.upload(asset, { category: uploadCategory, color: uploadColor });
      setUploadOpen(false);
      setAsset(null);
      setCategory('Alle');
      setQuery('');
      setOnlyFavorites(false);
      setMessage('Dein neues Kleidungsstück ist im Kleiderschrank.');
    } catch (error) { setUploadError(error instanceof Error ? error.message : 'Upload fehlgeschlagen.'); }
    finally { setBusy(false); }
  }

  function closeUpload() { if (!busy) { setUploadOpen(false); setUploadError(''); setCameraOpen(false); } }

  return <View style={{ flex: 1 }}><ScrollView contentContainerStyle={[sheet.page, compact && { paddingHorizontal: 20, paddingTop: 22 }]}>
    <View style={sheet.topline}><Label style={{ fontSize: 12, color: colors.muted }}>Dein Space <Text style={{ color: '#BEC3B8' }}> / </Text><Text style={{ color: colors.ink }}>Kleiderschrank</Text></Label><View style={sheet.topRight}><View style={sheet.statusDot} /><Label style={{ fontSize: 11, color: colors.muted }}>{wardrobe.connected ? 'Dein Kleiderschrank' : 'Demo-Kollektion'}</Label><Link href="/profile" asChild><Pressable accessibilityLabel="Profil öffnen" style={sheet.avatar}><Label style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12 }}>M</Label></Pressable></Link></View></View>
    <View style={[sheet.headingRow, compact && { alignItems: 'flex-start', gap: 20 }]}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>WENIGER SUCHEN. MEHR DU SEIN.</Text><Text style={[styles.title, { marginTop: 9 }, compact && { fontSize: 27, lineHeight: 36 }]}>Dein Kleiderschrank<Text style={{ color: '#7D9574' }}>.</Text></Text><Label style={{ color: colors.muted, marginTop: 8, fontSize: 13 }}>Lieblingsteile. Neue Möglichkeiten.</Label></View>{!compact && <Button title="Kleidungsstück hinzufügen" icon="plus" onPress={() => setUploadOpen(true)} />}</View>
    {compact && <Button title="Kleidungsstück hinzufügen" icon="plus" onPress={() => setUploadOpen(true)} style={{ alignSelf: 'flex-start', marginTop: 18 }} />}
    <View style={[sheet.stylistBand, compact && { marginTop: 25 }]}><View style={sheet.spark}><Icon name="sun" color={colors.green} size={25} /></View><View style={{ flex: 1 }}><Label style={{ fontFamily: 'DMSans_600SemiBold', fontSize: compact ? 14 : 16 }}>Ein neuer Look steckt schon in deinem Schrank.</Label><Label style={{ color: '#7D8777', fontSize: 12, marginTop: 3 }}>Entdecke Kombinationen aus deinen Lieblingsteilen.</Label></View><Pressable accessibilityRole="button" accessibilityLabel="Outfit entdecken" onPress={() => router.push('/stylist')} style={sheet.bandAction}>{!compact && <Label style={{ fontFamily: 'DMSans_600SemiBold', color: colors.green, fontSize: 12 }}>Outfit entdecken</Label>}<Icon name="arrow-up-right" color={colors.green} size={20} /></Pressable></View>
    <View style={sheet.collectionHeading}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Label style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 17 }}>Deine Kollektion</Label><View style={sheet.count}><Label style={{ fontSize: 10, color: colors.green, lineHeight: 18 }}>{wardrobe.items.length}</Label></View></View><Pressable accessibilityRole="button" onPress={() => setOnlyFavorites(!onlyFavorites)} style={sheet.favoriteFilter}><Icon name="heart" size={14} color={onlyFavorites ? colors.green : colors.muted} /><Label style={{ fontSize: 12, color: onlyFavorites ? colors.green : colors.muted }}>{onlyFavorites ? 'Alle anzeigen' : 'Favoriten'}</Label></Pressable></View>
    <View style={[sheet.filters, width < 1150 && { flexDirection: 'column', alignItems: 'stretch', gap: 16 }]}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: compact ? 4 : 8 }}>{categories.map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: category === value }} onPress={() => setCategory(value)} style={[sheet.category, category === value && sheet.categoryActive]}><Label style={{ color: category === value ? '#fff' : colors.muted, fontSize: 12, fontFamily: category === value ? 'DMSans_600SemiBold' : 'DMSans_400Regular' }}>{value}</Label></Pressable>)}</ScrollView><View style={sheet.searchRow}><View style={sheet.search}><Icon name="search" size={15} color={colors.muted} /><TextInput accessibilityLabel="Kleiderschrank durchsuchen" placeholder="Deine Teile durchsuchen ..." placeholderTextColor="#9CA196" value={query} onChangeText={setQuery} style={sheet.searchInput} />{query !== '' && <IconButton icon="x" label="Suche löschen" onPress={() => setQuery('')} />}</View><Pressable accessibilityRole="button" onPress={() => setOldestFirst(!oldestFirst)} style={sheet.sort}><Icon name="sliders" size={14} /><Label style={{ fontSize: 11 }}>{oldestFirst ? 'Älteste' : 'Neueste'}</Label><Icon name="chevron-down" size={12} /></Pressable></View></View>
    {(message || wardrobe.error) !== '' && <View style={{ marginBottom: 20 }}><Notice>{wardrobe.error || message}</Notice>{wardrobe.error !== '' && <Button title="Erneut laden" secondary icon="refresh-cw" onPress={wardrobe.refresh} style={{ marginTop: 8 }} />}</View>}
    {wardrobe.loading ? <ActivityIndicator accessibilityLabel="Kleiderschrank wird geladen" color={colors.green} style={{ padding: 70 }} /> : <View style={sheet.grid}>{items.map(item => <View key={item.id} style={{ width: `${100 / columns}%`, padding: 8 }}><View style={sheet.item}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.description} ansehen`} onPress={() => setSelected(item)} style={sheet.imageBox}><Image source={{ uri: item.image_url }} style={sheet.productImage} resizeMode="cover" /><View style={sheet.categoryBadge}><Label style={{ fontSize: 9, lineHeight: 17 }}>{item.category}</Label></View></Pressable><View style={sheet.heart}><IconButton icon="heart" label={wardrobe.favorites.includes(item.id) ? 'Aus Favoriten entfernen' : 'Als Favorit merken'} active={wardrobe.favorites.includes(item.id)} onPress={() => wardrobe.toggleFavorite(item.id)} />{wardrobe.favorites.includes(item.id) && <View pointerEvents="none" style={sheet.favoriteDot} />}</View>
      <View style={{ paddingTop: 12, paddingHorizontal: 2 }}><Label style={{ fontFamily: 'DMSans_500Medium', fontSize: compact ? 12 : 13 }} numberOfLines={undefined}>{item.description}</Label><View style={sheet.itemMeta}><View style={[sheet.colorDot, { backgroundColor: colorSwatch(item.color) }]} /><Label style={{ color: colors.muted, fontSize: 11 }}>{item.color}</Label><Text style={{ color: '#CDD1C7' }}>·</Text><Label style={{ color: colors.muted, fontSize: 11, flexShrink: 1 }}>{item.style}</Label></View></View>
    </View></View>)}<View style={{ width: `${100 / columns}%`, padding: 8 }}><Pressable accessibilityRole="button" accessibilityLabel="Neues Kleidungsstück hinzufügen" onPress={() => setUploadOpen(true)} style={sheet.addTile}><View style={sheet.addCircle}><Icon name="plus" size={23} color={colors.green} /></View><Label style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 14, textAlign: 'center' }}>Platz für ein Lieblingsteil</Label><Label style={{ fontSize: 11, color: colors.muted, marginTop: 4, textAlign: 'center' }}>Deine Kollektion wächst mit dir.</Label></Pressable></View></View>}
    {!wardrobe.loading && items.length === 0 && <Label style={{ color: colors.muted, padding: 20, textAlign: 'center' }}>{wardrobe.items.length ? 'Keine passenden Teile gefunden.' : 'Dein Kleiderschrank wartet auf dein erstes Teil.'}</Label>}
    <View style={sheet.footer}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Icon name="feather" size={13} color={colors.muted} /><Label style={{ fontSize: 10, color: colors.muted }}>Bewusster kombinieren. Länger lieben.</Label></View><Label style={{ fontSize: 10, color: colors.muted }}>{items.length} von {wardrobe.items.length} Teilen</Label></View>
  </ScrollView>
    <Modal visible={uploadOpen} transparent animationType="fade" onRequestClose={closeUpload}><View style={sheet.overlay}><View style={sheet.modal}><View style={sheet.modalHeading}><Label style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 21 }}>Ein neues Lieblingsteil</Label><IconButton icon="x" label="Schließen" onPress={closeUpload} /></View><ScrollView>
      {cameraOpen ? <WardrobeCamera onClose={() => setCameraOpen(false)} onCapture={photo => { setAsset(photo); setCameraOpen(false); }} /> : <>
        {asset ? <Image source={{ uri: asset.uri }} style={sheet.preview} resizeMode="contain" /> : <View style={sheet.emptyPreview}><Icon name="image" size={40} color="#91A088" /></View>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 18 }}><Button title="Foto wählen" icon="image" secondary disabled={busy} onPress={() => pick()} /><Button title="Kamera" icon="camera" secondary disabled={busy} onPress={() => setCameraOpen(true)} /></View>
        <Label style={{ marginBottom: 8 }}>Kategorie</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>{categories.filter((value): value is Category => value !== 'Alle').map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: uploadCategory === value }} disabled={busy} onPress={() => setUploadCategory(value)} style={[sheet.category, uploadCategory === value && sheet.categoryActive]}><Label style={{ color: uploadCategory === value ? '#fff' : colors.ink }}>{value}</Label></Pressable>)}</View>
        <Label style={{ marginBottom: 8 }}>Hauptfarbe</Label><ColorPicker value={uploadColor} onChange={value => { if (!busy) setUploadColor(value); }} automatic />
        {uploadError !== '' && <Label style={{ color: '#A13B3B', marginVertical: 16 }} accessibilityLiveRegion="polite">{uploadError}</Label>}
        {!wardrobe.connected && <View style={{ marginTop: 16 }}><Notice>Demo-Modus: Fotos werden erst mit verbundenem Backend gespeichert.</Notice></View>}
        <View style={{ marginTop: 18 }}><Button title={busy ? 'Farbe wird ermittelt ...' : wardrobe.connected ? 'Hinzufügen' : 'Backend im Profil verbinden'} icon={busy ? 'loader' : wardrobe.connected ? 'plus' : 'arrow-right'} disabled={busy || (wardrobe.connected && !asset)} onPress={wardrobe.connected ? save : () => { closeUpload(); router.push('/profile'); }} /></View>{busy && <ActivityIndicator style={{ marginTop: 14 }} color={colors.green} />}
      </>}
    </ScrollView></View></View></Modal>
    <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}><View style={sheet.overlay}><View style={sheet.modal}>{selected && <><View style={sheet.modalHeading}><Label style={{ fontFamily: 'Manrope_600SemiBold', fontSize: 19, flex: 1 }}>{selected.description}</Label><IconButton icon="x" label="Details schließen" onPress={() => setSelected(null)} /></View><Image source={{ uri: selected.image_url }} style={sheet.preview} resizeMode="contain" /><Label style={{ marginVertical: 18 }}>{selected.category} · {selected.color} · {selected.style}</Label><Button title={wardrobe.favorites.includes(selected.id) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'} icon="heart" onPress={() => wardrobe.toggleFavorite(selected.id)} /></>}</View></View></Modal>
  </View>;
}

function colorSwatch(color: string) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  return ({ 'Weiß': '#FAFAF6', 'Blau': '#728CA0', 'Cognac': '#B38A62', 'Creme': '#DFD9C9', 'Hellblau': '#BACCD4', 'Grau': '#AAAFA7', 'Schwarz': '#30342E', 'Rot': '#AB5049', 'Grün': '#7C9174' } as Record<string, string>)[color] || '#D8DCD2';
}

const sheet = StyleSheet.create({
  page: { paddingHorizontal: 42, paddingTop: 24, paddingBottom: 24, maxWidth: 1550, width: '100%', alignSelf: 'center' },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  avatar: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#E6EADC', alignItems: 'center', justifyContent: 'center', marginLeft: 14 },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#8B9E7C' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 44, gap: 20 },
  stylistBand: { marginTop: 31, backgroundColor: '#EDF2E7', paddingVertical: 22, paddingHorizontal: 23, borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 17 },
  spark: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#E1E9D9', alignItems: 'center', justifyContent: 'center' },
  bandAction: { flexDirection: 'row', gap: 10, alignItems: 'center', minWidth: 32, minHeight: 44, justifyContent: 'center' },
  collectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 34, marginBottom: 22 },
  count: { minWidth: 23, height: 22, borderRadius: 4, backgroundColor: '#EAF0E5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  favoriteFilter: { flexDirection: 'row', gap: 7, alignItems: 'center', minHeight: 35 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 23 },
  category: { paddingHorizontal: 17, minHeight: 36, justifyContent: 'center', borderRadius: 5 },
  categoryActive: { backgroundColor: colors.green },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  search: { minHeight: 36, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 5, backgroundColor: '#fff', paddingLeft: 11, flex: 1, minWidth: 170 },
  searchInput: { fontFamily: 'DMSans_400Regular', fontSize: 11, flex: 1, minWidth: 0, paddingHorizontal: 9, height: 36, color: colors.ink },
  sort: { minHeight: 36, flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, rowGap: 15 },
  item: { position: 'relative' },
  imageBox: { aspectRatio: 0.94, borderRadius: 7, overflow: 'hidden', backgroundColor: '#F0F0EA' },
  productImage: { width: '100%', height: '100%' },
  categoryBadge: { position: 'absolute', bottom: 10, left: 10, backgroundColor: '#FFFFFFE8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3 },
  heart: { position: 'absolute', right: 9, top: 9 },
  favoriteDot: { position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: 3, backgroundColor: colors.green },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1, flexWrap: 'wrap' },
  colorDot: { height: 9, width: 9, borderRadius: 5, borderWidth: 1, borderColor: '#00000012' },
  addTile: { aspectRatio: 0.94, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CFD8C7', borderRadius: 7, backgroundColor: '#F4F7F0', justifyContent: 'center', alignItems: 'center', padding: 14 },
  addCircle: { height: 43, width: 43, borderRadius: 22, backgroundColor: '#E6EDDF', justifyContent: 'center', alignItems: 'center' },
  footer: { borderTopWidth: 1, borderColor: colors.line, paddingTop: 22, marginTop: 34, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  overlay: { flex: 1, backgroundColor: '#18231977', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 8, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90%' },
  modalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 15 },
  preview: { width: '100%', height: 250, borderRadius: 6, backgroundColor: '#F3F4EF' },
  emptyPreview: { width: '100%', height: 180, borderRadius: 6, backgroundColor: '#F3F4EF', alignItems: 'center', justifyContent: 'center' },
});