import { Link, Slot, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, Icon, Label, type IconName } from '../../components/ui';
import { useWardrobe } from '../../lib/store';

const tabs: { href: '/' | '/stylist' | '/community' | '/profile'; label: string; mobile: string; icon: IconName }[] = [
  { href: '/', label: 'Kleiderschrank', mobile: 'Schrank', icon: 'grid' },
  { href: '/stylist', label: 'Outfit Studio', mobile: 'Studio', icon: 'sun' },
  { href: '/community', label: 'Community', mobile: 'Community', icon: 'users' },
  { href: '/profile', label: 'Mein Profil', mobile: 'Profil', icon: 'user' },
];

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const pathname = usePathname();
  const { connected } = useWardrobe();
  return <SafeAreaView style={sheet.root} edges={['top', 'bottom']}>
    {desktop && <View style={sheet.sidebar}>
      <Link href="/" style={sheet.brand}>maki<Text style={{ color: '#769570' }}>.</Text></Link>
      <Label style={sheet.brandSub}>A little more you.</Label>
      <Text style={sheet.menuLabel}>DEIN PERSÖNLICHER SPACE</Text>
      <View style={{ gap: 8 }}>{tabs.map(tab => <Link key={tab.href} href={tab.href} asChild><Pressable style={StyleSheet.flatten([sheet.nav, pathname === tab.href && sheet.active])}><Icon name={tab.icon} color={pathname === tab.href ? colors.green : colors.muted} size={19} /><Label style={{ fontFamily: pathname === tab.href ? 'DMSans_600SemiBold' : 'DMSans_400Regular', color: pathname === tab.href ? colors.green : colors.muted }}>{tab.label}</Label>{pathname === tab.href && <View style={sheet.dot} />}</Pressable></Link>)}</View>
      <View style={{ flex: 1 }} />
      <View style={sheet.sideNote}><Icon name="feather" size={25} color={colors.green} /><Label style={{ fontFamily: 'DMSans_600SemiBold', marginTop: 12 }}>Weniger neu. Mehr du.</Label><Label style={{ color: colors.muted, fontSize: 12, marginTop: 5 }}>Guter Stil beginnt mit dem, was du schon hast.</Label></View>
      <Link href="/profile" asChild><Pressable style={sheet.account}><View style={sheet.avatar}><Label style={{ fontFamily: 'DMSans_600SemiBold' }}>M</Label></View><View style={{ flex: 1 }}><Label style={{ fontSize: 13, fontFamily: 'DMSans_600SemiBold' }}>Mein Space</Label><Label style={{ fontSize: 11, color: colors.muted }}>{connected ? 'Backend verbunden' : 'Demo-Kleiderschrank'}</Label></View><Icon name="chevron-right" size={16} /></Pressable></Link>
    </View>}
    <View style={{ flex: 1, minWidth: 0 }}>
      {!desktop && <View style={sheet.mobileHeader}><Link href="/" style={StyleSheet.flatten([sheet.brand, { fontSize: 29 }])}>maki.</Link><Label style={{ color: colors.muted, fontSize: 12 }}>Dein persönlicher Style-Space</Label></View>}
      <Slot />
      {!desktop && <View style={sheet.bottomNav}>{tabs.map(tab => <Link href={tab.href} key={tab.href} asChild><Pressable style={sheet.bottomItem}><Icon name={tab.icon} color={pathname === tab.href ? colors.green : colors.muted} /><Label style={{ fontSize: 10, color: pathname === tab.href ? colors.green : colors.muted }}>{tab.mobile}</Label></Pressable></Link>)}</View>}
    </View>
  </SafeAreaView>;
}

const sheet = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  sidebar: { width: 238, backgroundColor: '#fff', borderRightWidth: 1, borderColor: colors.line, paddingHorizontal: 22, paddingTop: 32 },
  brand: { fontFamily: 'Manrope_700Bold', fontSize: 42, color: colors.ink, textDecorationLine: 'none', letterSpacing: 0 },
  brandSub: { fontSize: 11, color: colors.muted, marginTop: 0, marginLeft: 2 },
  menuLabel: { fontSize: 9, fontFamily: 'DMSans_600SemiBold', color: '#979D94', marginTop: 52, marginBottom: 16 },
  nav: { minHeight: 47, paddingHorizontal: 13, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 12 },
  active: { backgroundColor: colors.light },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.green, marginLeft: 'auto' },
  sideNote: { borderTopWidth: 1, borderColor: colors.line, paddingTop: 25, paddingHorizontal: 10, paddingBottom: 29 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20, borderTopWidth: 1, borderColor: colors.line },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EBEDE4', justifyContent: 'center', alignItems: 'center' },
  mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 65, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.line, height: 66 },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
});