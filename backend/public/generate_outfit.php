<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

endpoint('POST', function (): array {
    $userId = authenticate();
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 4096) throw new ApiError(413, 'Die Anfrage ist zu groß.');
    try {
        $body = json_decode(file_get_contents('php://input', false, null, 0, 4097), true, 8, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new ApiError(400, 'Bitte sende gültiges JSON.');
    }
    $mode = is_array($body) ? ($body['mode'] ?? 'Harmonisch') : null;
    $target = is_array($body) ? ($body['color'] ?? '#336699') : null;
    if (!is_string($mode) || !in_array($mode, ['Harmonisch', 'Kontrastreich', 'Einfarbig', 'Gewagt'], true) || !is_string($target) || !preg_match('/^#[0-9a-f]{6}$/iD', $target)) {
        throw new ApiError(422, 'Bitte wähle einen gültigen Farbmodus und HEX-Farbcode.');
    }
    $statement = db()->prepare('SELECT id, category, color FROM wardrobe_items WHERE user_id = ? ORDER BY id LIMIT 500');
    $statement->execute([$userId]);
    $groups = [];
    foreach ($statement->fetchAll() as $item) {
        if (preg_match('/^#[0-9a-f]{6}$/iD', $item['color'])) $groups[$item['category']][] = $item;
    }
    foreach (['Tops', 'Bottoms', 'Schuhe'] as $category) {
        if (empty($groups[$category])) throw new ApiError(422, 'Für einen Look benötigst du ein Top, ein Bottom und Schuhe mit HEX-Farben. Ältere Teile bitte neu hochladen.');
    }
    $candidates = [];
    for ($attempt = 0; $attempt < 800; $attempt++) {
        $chosen = [];
        foreach (['Tops', 'Bottoms', 'Schuhe', 'Accessoires'] as $category) {
            if (!empty($groups[$category])) $chosen[] = $groups[$category][random_int(0, count($groups[$category]) - 1)];
        }
        $ids = array_map(fn ($item) => (int) $item['id'], $chosen);
        $candidates[implode(':', $ids)] = ['item_ids' => $ids, 'score' => outfitScore($chosen, $mode, $target)];
    }
    usort($candidates, fn ($first, $second) => $second['score'] <=> $first['score']);
    $best = $candidates[0]['score'];
    $nearBest = array_values(array_filter($candidates, fn ($candidate) => $candidate['score'] >= $best - 0.08));
    $result = $nearBest[random_int(0, count($nearBest) - 1)];
    $explanation = match ($mode) {
        'Kontrastreich' => 'Komplementäre Farbtöne und Hell-Dunkel-Kontraste werden bevorzugt.',
        'Einfarbig' => 'Die verfügbaren Teile mit der größten Farbnähe zu ' . strtoupper($target) . ' werden bevorzugt. Exakt gleiche Farben sind nicht garantiert.',
        'Gewagt' => 'Gesättigte Farben mit spannungsreichen Abständen im Farbkreis werden bevorzugt. Ob ein Look passt, entscheidest du.',
        default => 'Benachbarte Farbtöne und neutrale Farben werden bevorzugt.',
    };
    return ['item_ids' => $result['item_ids'], 'explanation' => $explanation . ' Die Auswahl bewertet Farben, nicht Schnitt, Anlass oder Material.'];
});