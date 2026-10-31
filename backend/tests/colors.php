<?php
declare(strict_types=1);
require dirname(__DIR__) . '/colors.php';

function check(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}

$image = imagecreatetruecolor(100, 100);
imagefill($image, 0, 0, imagecolorallocate($image, 255, 0, 0));
check(pixelColor($image)['hex'] === '#FF0000', 'Red detection');
imagefill($image, 0, 0, imagecolorallocate($image, 5, 5, 5));
check(pixelColor($image)['brightness'] < 0.08, 'Dark image threshold');
unset($image);
check(colorDistance('#FF0000', '#FF0000') === 0.0, 'Identical colors');
check(outfitScore([['color' => '#FF0000'], ['color' => '#00FFFF']], 'Kontrastreich', '#FF0000') > outfitScore([['color' => '#FF0000'], ['color' => '#FF2200']], 'Kontrastreich', '#FF0000'), 'Complementary contrast');
check(outfitScore([['color' => '#FF0000']], 'Einfarbig', '#FF0000') > outfitScore([['color' => '#00FFFF']], 'Einfarbig', '#FF0000'), 'Monochrome target');
echo "Color checks passed\n";