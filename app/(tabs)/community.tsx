import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, Icon, Label, Notice, styles } from '../../components/ui';

const posts = [
  { id: 1, name: 'Lena', handle: '@lena.wears', title: 'Sunday in the city', tags: 'Casual · 3 Lieblingsteile', likes: 128, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1000&auto=format&fit=crop&q=85' },
  { id: 2, name: 'Marie', handle: '@marie.minimal', title: 'Less, but better.', tags: 'Minimal · Capsule Wardrobe', likes: 86, image: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=1000&auto=format&fit=crop&q=85' },
  { id: 3, name: 'Nora', handle: '@nora.everyday', title: 'Mein Everyday Edit', tags: 'Classic · Zeitlose Basics', likes: 204, image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1000&auto=format&fit=crop&q=85' },
];

export default function CommunityScreen() {
  const { width } = useWindowDimensions();
  const [liked, setLiked] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  async function share(title: string, image: string) {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${title} · Maki Style\n${image}`);
        setMessage('Outfit-Link kopiert.');
      } else await Share.share({ message: `${title} · Maki Style\n${image}` });
    } catch { setMessage('Teilen ist gerade nicht verfügbar.'); }
  }
  return <ScrollView contentContainerStyle={[sheet.page, width < 700 && { padding: 22 }]}><Text style={styles.eyebrow}>ECHTE STILE. NEUE IDEEN.</Text><Text style={[styles.title, { marginTop: 12 }]}>Besser zusammen.</Text><Label style={{ color: colors.muted, marginTop: 10, marginBottom: 28 }}>Ein bisschen Inspiration für deinen nächsten Lieblingslook.</Label><Notice>Community-Vorschau mit Beispielprofilen. Likes gelten nur für diese Sitzung; ein öffentlicher Feed ist noch nicht angebunden.</Notice>{message !== '' && <Label accessibilityLiveRegion="polite" style={{ marginTop: 12, color: colors.green }}>{message}</Label>}<View style={sheet.grid}>{posts.map(post => <View key={post.id} style={{ width: width < 700 ? '100%' : width < 1200 ? '50%' : '33.333%', padding: 8 }}><View style={sheet.post}><View style={sheet.profile}><View style={sheet.avatar}><Label>{post.name[0]}</Label></View><View><Label style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13 }}>{post.name}</Label><Label style={{ color: colors.muted, fontSize: 11 }}>{post.handle}</Label></View></View><Image source={{ uri: post.image }} style={sheet.image} /><View style={{ padding: 16 }}><Label style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 16 }}>{post.title}</Label><Label style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{post.tags}</Label><View style={sheet.actions}><Pressable accessibilityRole="button" accessibilityLabel="Outfit liken" accessibilityState={{ selected: liked.includes(post.id) }} onPress={() => setLiked(previous => previous.includes(post.id) ? previous.filter(id => id !== post.id) : [...previous, post.id])} style={sheet.like}><Icon name="heart" size={18} color={liked.includes(post.id) ? '#B45252' : colors.ink} /><Label style={{ fontSize: 12 }}>{post.likes + Number(liked.includes(post.id))}</Label></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Outfit teilen" onPress={() => share(post.title, post.image)} style={sheet.like}><Icon name="share-2" size={17} /><Label style={{ fontSize: 12 }}>Teilen</Label></Pressable></View></View></View></View>)}</View></ScrollView>;
}
const sheet = StyleSheet.create({
  page: { padding: 42, maxWidth: 1400, width: '100%', alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, marginTop: 24 },
  post: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 7, overflow: 'hidden' },
  profile: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#E7ECDF', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', aspectRatio: 0.85 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  like: { flexDirection: 'row', gap: 8, minHeight: 35, alignItems: 'center' },
});