<?php
declare(strict_types=1);

function colorHsl(string $hex): array
{
    $rgb = array_map(fn ($offset) => hexdec(substr($hex, $offset, 2)) / 255, [1, 3, 5]);
    [$red, $green, $blue] = $rgb;
    $max = max($rgb);
    $min = min($rgb);
    $delta = $max - $min;
    $light = ($max + $min) / 2;
    $sat = $delta === 0.0 ? 0 : $delta / (1 - abs(2 * $light - 1));
    $hue = $delta === 0.0 ? 0 : match ($max) {
        $red => 60 * fmod(($green - $blue) / $delta + 6, 6),
        $green => 60 * (($blue - $red) / $delta + 2),
        default => 60 * (($red - $green) / $delta + 4),
    };
    return [$hue, $sat, $light];
}

function pixelColor(GdImage $image): array
{
    $sample = imagecreatetruecolor(40, 40);
    imagecopyresampled($sample, $image, 0, 0, (int) (imagesx($image) * 0.25), (int) (imagesy($image) * 0.2), 40, 40, (int) (imagesx($image) * 0.5), (int) (imagesy($image) * 0.6));
    $buckets = [];
    $brightness = 0;
    for ($row = 0; $row < 40; $row++) {
        for ($column = 0; $column < 40; $column++) {
            $pixel = imagecolorat($sample, $column, $row);
            $red = ($pixel >> 16) & 255;
            $green = ($pixel >> 8) & 255;
            $blue = $pixel & 255;
            $brightness += 0.2126 * $red + 0.7152 * $green + 0.0722 * $blue;
            $key = ($red >> 5) . ':' . ($green >> 5) . ':' . ($blue >> 5);
            $bucket = $buckets[$key] ?? [0, 0, 0, 0];
            $buckets[$key] = [$bucket[0] + 1, $bucket[1] + $red, $bucket[2] + $green, $bucket[3] + $blue];
        }
    }
    unset($sample);
    usort($buckets, fn ($first, $second) => $second[0] <=> $first[0]);
    $dominant = $buckets[0];
    return [
        'hex' => sprintf('#%02X%02X%02X', (int) round($dominant[1] / $dominant[0]), (int) round($dominant[2] / $dominant[0]), (int) round($dominant[3] / $dominant[0])),
        'brightness' => round($brightness / 1600 / 255, 3),
        'coverage' => round($dominant[0] / 1600, 3),
    ];
}

function colorDistance(string $first, string $second): float
{
    [$hueFirst, $satFirst, $lightFirst] = colorHsl($first);
    [$hueSecond, $satSecond, $lightSecond] = colorHsl($second);
    $hue = abs($hueFirst - $hueSecond);
    return min($hue, 360 - $hue) / 180 * min($satFirst, $satSecond) + abs($lightFirst - $lightSecond) * 0.5 + abs($satFirst - $satSecond) * 0.25;
}

function outfitScore(array $items, string $mode, string $target): float
{
    if ($mode === 'Einfarbig') {
        return -array_sum(array_map(fn ($item) => colorDistance($item['color'], $target), $items));
    }
    $score = 0.0;
    foreach ($items as $index => $first) {
        foreach (array_slice($items, $index + 1) as $second) {
            [$hueFirst, $satFirst, $lightFirst] = colorHsl($first['color']);
            [$hueSecond, $satSecond, $lightSecond] = colorHsl($second['color']);
            $delta = abs($hueFirst - $hueSecond);
            $delta = min($delta, 360 - $delta);
            $neutral = min($satFirst, $satSecond) < 0.15;
            $score += match ($mode) {
                'Kontrastreich' => $neutral ? abs($lightFirst - $lightSecond) : $delta / 180,
                'Gewagt' => $neutral ? -0.5 : 1 - abs($delta - 90) / 90,
                default => $neutral ? 0.8 : 1 - $delta / 180,
            };
        }
    }
    return $score;
}