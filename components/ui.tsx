import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle, type TextProps } from 'react-native';

export const colors = { ink: '#202820', muted: '#7B817A', green: '#3D6145', light: '#EDF2E9', line: '#E9ECE6', paper: '#FFFFFF', background: '#FAFBF8' };
export type IconName = React.ComponentProps<typeof Feather>['name'];
export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}
export function Label({ children, style, ...props }: TextProps) {
  return <Text {...props} style={[styles.label, style]}>{children}</Text>;
}
export function Button({ title, icon, onPress, secondary = false, disabled = false, style }: { title: string; icon?: IconName; onPress: () => void; secondary?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, disabled && { opacity: 0.45 }, pressed && { opacity: 0.75 }, style]}>
    {icon && <Icon name={icon} size={17} color={secondary ? colors.ink : '#fff'} />}
    <Label style={{ color: secondary ? colors.ink : '#fff', fontFamily: 'DMSans_600SemiBold', fontSize: 13 }}>{title}</Label>
  </Pressable>;
}
export function IconButton({ icon, label, onPress, active = false }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={styles.iconButton} {...{ title: label }}><Icon name={icon} color={active ? colors.green : colors.ink} size={18} /></Pressable>;
}
export function Notice({ children }: { children: React.ReactNode }) {
  return <View style={styles.notice}><Icon name="info" size={16} color={colors.green} /><Label style={{ flex: 1, fontSize: 12 }}>{children}</Label></View>;
}
export const styles = StyleSheet.create({
  label: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.ink, lineHeight: 22 },
  button: { minHeight: 44, paddingHorizontal: 18, borderRadius: 6, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  iconButton: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFFEE' },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.light, padding: 14, borderRadius: 6 },
  title: { fontFamily: 'Manrope_600SemiBold', fontSize: 32, lineHeight: 42, color: colors.ink },
  eyebrow: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: colors.muted, letterSpacing: 0 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 14, fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.ink },
});