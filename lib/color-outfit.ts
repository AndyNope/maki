import type { ColorMode, Outfit, WardrobeItem } from './api';

const demoColors: Record<string, string> = { 'Weiß': '#FAFAFA', 'Blau': '#336699', 'Cognac': '#B38A62', 'Creme': '#DFD9C9', 'Hellblau': '#BACCD4', 'Grau': '#888888', 'Schwarz': '#202020', 'Rot': '#E53935' };

function hsl(color: string) {
  const hex = demoColors[color] || color;
  const [red, green, blue] = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const light = (max + min) / 2;
  const sat = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1));
  const hue = delta === 0 ? 0 : max === red ? 60 * (((green - blue) / delta + 6) % 6) : max === green ? 60 * ((blue - red) / delta + 2) : 60 * ((red - green) / delta + 4);
  return [hue, sat, light];
}

function score(items: WardrobeItem[], mode: ColorMode, color: string) {
  let total = 0;
  if (mode === 'Einfarbig') {
    const [targetHue, targetSat, targetLight] = hsl(color);
    for (const item of items) {
      const [hue, sat, light] = hsl(item.color);
      const delta = Math.abs(hue - targetHue);
      total -= Math.min(delta, 360 - delta) / 180 * Math.min(sat, targetSat) + Math.abs(light - targetLight) * 0.5 + Math.abs(sat - targetSat) * 0.25;
    }
    return total;
  }
  items.forEach((first, index) => items.slice(index + 1).forEach(second => {
    const [hueFirst, satFirst, lightFirst] = hsl(first.color);
    const [hueSecond, satSecond, lightSecond] = hsl(second.color);
    const difference = Math.abs(hueFirst - hueSecond);
    const delta = Math.min(difference, 360 - difference);
    const neutral = Math.min(satFirst, satSecond) < 0.15;
    total += mode === 'Kontrastreich' ? neutral ? Math.abs(lightFirst - lightSecond) : delta / 180 : mode === 'Gewagt' ? neutral ? -0.5 : 1 - Math.abs(delta - 90) / 90 : neutral ? 0.8 : 1 - delta / 180;
  }));
  return total;
}

export function demoOutfit(items: WardrobeItem[], mode: ColorMode, color: string): Outfit {
  const groups = ['Tops', 'Bottoms', 'Schuhe', 'Accessoires'].map(category => items.filter(item => item.category === category));
  if (groups.slice(0, 3).some(group => group.length === 0)) throw new Error('Ein Top, ein Bottom und Schuhe sind erforderlich.');
  const candidates: { items: WardrobeItem[]; score: number }[] = [];
  for (let attempt = 0; attempt < 400; attempt++) {
    const chosen = groups.filter(group => group.length).map(group => group[Math.floor(Math.random() * group.length)]);
    candidates.push({ items: chosen, score: score(chosen, mode, color) });
  }
  candidates.sort((first, second) => second.score - first.score);
  const best = candidates[0].score;
  const nearBest = candidates.filter(candidate => candidate.score >= best - 0.08);
  const chosen = nearBest[Math.floor(Math.random() * nearBest.length)];
  return { item_ids: chosen.items.map(item => item.id), explanation: `Demo-Farbvergleich: ${mode}${mode === 'Einfarbig' ? ` rund um ${color.toUpperCase()}` : ''}. Die Auswahl bewertet Farben, nicht Schnitt, Anlass oder Material.` };
}