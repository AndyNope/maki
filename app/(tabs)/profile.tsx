import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Button, colors, Icon, Label, Notice, styles } from '../../components/ui';
import { apiUrl } from '../../lib/api';
import { useWardrobe } from '../../lib/store';

export default function ProfileScreen() {
  const wardrobe = useWardrobe();
  const { width } = useWindowDimensions();
  const [tokenInput, setTokenInput] = useState('');
  return <ScrollView contentContainerStyle={[sheet.page, width < 700 && { padding: 22 }]}><Text style={styles.eyebrow}>DEIN SPACE. DEINE REGELN.</Text><Text style={[styles.title, { marginTop: 12 }]}>Ganz du.</Text><Label style={{ color: colors.muted, marginTop: 10 }}>Deine Vorlieben machen den Unterschied.</Label>
    <View style={sheet.section}><Text style={sheet.sectionTitle}>Dein Stil</Text><View style={sheet.preferences}>{['Minimal', 'Casual', 'Classic', 'Sporty', 'Streetwear'].map(value => <Pressable accessibilityRole="radio" accessibilityState={{ checked: wardrobe.preference === value }} key={value} onPress={() => wardrobe.setPreference(value)} style={[sheet.preference, wardrobe.preference === value && { borderColor: colors.green, backgroundColor: colors.light }]}><Icon name={wardrobe.preference === value ? 'check-circle' : 'circle'} size={17} color={wardrobe.preference === value ? colors.green : colors.muted} /><Label>{value}</Label></Pressable>)}</View><Label style={{ color: colors.muted, fontSize: 12, marginTop: 14 }}>Deine Auswahl und Favoriten gelten für diese Sitzung.</Label></View>
    <View style={sheet.section}><Text style={sheet.sectionTitle}>Backend-Verbindung</Text><Label style={{ color: colors.muted, marginBottom: 18 }}>API-Adresse</Label><Label selectable style={[styles.input, { paddingVertical: 11, color: apiUrl ? colors.ink : colors.muted }]}>{apiUrl || 'Noch nicht konfiguriert'}</Label><Label style={{ marginTop: 22, marginBottom: 8 }}>Persönlicher Zugangstoken</Label><TextInput accessibilityLabel="Persönlicher Zugangstoken" value={tokenInput} onChangeText={setTokenInput} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Zugangstoken eingeben" placeholderTextColor={colors.muted} style={styles.input} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}><Button title="Verbinden" icon="link" disabled={!apiUrl || tokenInput.trim().length < 32} onPress={() => { wardrobe.setToken(tokenInput.trim()); setTokenInput(''); }} />{wardrobe.connected && <Button title="Trennen" icon="log-out" secondary onPress={() => wardrobe.setToken('')} />}</View><View style={{ marginTop: 20 }}><Notice>{wardrobe.loading ? 'Verbindung wird geprüft ...' : wardrobe.error ? wardrobe.error : wardrobe.connected ? 'Backend konfiguriert. Dein Token bleibt nur im Arbeitsspeicher.' : 'Demo-Modus aktiv. Für echte Uploads wird eine konfigurierte PHP-API benötigt.'}</Notice></View></View>
    <View style={sheet.section}><Text style={sheet.sectionTitle}>Deine Kollektion auf einen Blick</Text><View style={{ flexDirection: 'row', gap: 45, marginTop: 15 }}><View><Text style={styles.title}>{wardrobe.items.length}</Text><Label style={{ color: colors.muted, fontSize: 12 }}>Kleidungsstücke</Label></View><View><Text style={styles.title}>{wardrobe.favorites.length}</Text><Label style={{ color: colors.muted, fontSize: 12 }}>Favoriten</Label></View></View></View>
  </ScrollView>;
}
const sheet = StyleSheet.create({
  page: { padding: 42, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  section: { borderTopWidth: 1, borderColor: colors.line, paddingTop: 28, marginTop: 34, paddingBottom: 8 },
  sectionTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: 18, color: colors.ink, marginBottom: 18 },
  preferences: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  preference: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingHorizontal: 16, backgroundColor: '#fff' },
});