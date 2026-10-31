import { Pressable, Switch, TextInput, View } from 'react-native';
import { Label, styles } from './ui';

export const swatches = ['#FAFAFA', '#202020', '#888888', '#E53935', '#E8B431', '#33845B', '#336699', '#864CB0', '#E78DAA', '#B38A62'];

export function ColorPicker({ value, onChange, automatic = false }: { value: string; onChange: (value: string) => void; automatic?: boolean }) {
  return <View style={{ gap: 12 }}>
    {automatic && <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Switch accessibilityLabel="Automatische Pixel-Farbe" value={value === ''} onValueChange={enabled => onChange(enabled ? '' : '#336699')} /><Label>Automatische Pixel-Farbe</Label></View>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{swatches.map(color => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Farbe ${color}`} accessibilityState={{ selected: value.toUpperCase() === color.toUpperCase() }} onPress={() => onChange(color)} {...{ title: color }} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, borderWidth: value.toUpperCase() === color.toUpperCase() ? 3 : 1, borderColor: value.toUpperCase() === color.toUpperCase() ? '#3D6145' : '#BCC2BA' }} />)}</View>
    <TextInput accessibilityLabel="HEX-Farbcode" placeholder={automatic ? 'Automatisch' : '#336699'} value={value} onChangeText={onChange} autoCapitalize="characters" autoCorrect={false} maxLength={7} style={styles.input} />
  </View>;
}