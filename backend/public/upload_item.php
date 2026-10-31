<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

endpoint('POST', function (): array {
    $userId = authenticate();
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 9 * 1024 * 1024) {
        throw new ApiError(413, 'Das Bild darf maximal 8 MB groß sein.');
    }
    $file = $_FILES['image'] ?? null;
    if (!is_array($file) || is_array($file['error'] ?? null)) {
        throw new ApiError(400, 'Bitte sende genau ein Bild im Feld image.');
    }
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        $tooLarge = in_array($file['error'] ?? null, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);
        throw new ApiError($tooLarge ? 413 : 400, $tooLarge ? 'Das Bild überschreitet das Upload-Limit.' : 'Der Bild-Upload war unvollständig.');
    }
    $temporary = $file['tmp_name'];
    if (!is_uploaded_file($temporary) || filesize($temporary) > 8 * 1024 * 1024) {
        throw new ApiError(413, 'Das Bild darf maximal 8 MB groß sein.');
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($temporary);
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        throw new ApiError(415, 'Bitte verwende ein JPEG-, PNG- oder WebP-Bild. HEIC bitte zuerst konvertieren.');
    }
    $size = @getimagesize($temporary);
    if ($size === false || $size[0] < 32 || $size[1] < 32 || $size[0] > 6000 || $size[1] > 6000 || $size[0] * $size[1] > 20000000) {
        throw new ApiError(422, 'Ungültige Bildgröße. Maximal 6000 Pixel pro Seite und 20 Megapixel.');
    }
    $count = db()->prepare('SELECT COUNT(*) FROM wardrobe_items WHERE user_id = ?');
    $count->execute([$userId]);
    if ((int) $count->fetchColumn() >= 500) {
        throw new ApiError(409, 'Dein Kleiderschrank hat das Limit von 500 Teilen erreicht.');
    }
    $category = $_POST['category'] ?? '';
    $manualColor = $_POST['color'] ?? '';
    if (!is_string($category) || !in_array($category, ['Tops', 'Bottoms', 'Schuhe', 'Accessoires'], true)) {
        throw new ApiError(422, 'Bitte wähle eine Kategorie.');
    }
    if (!is_string($manualColor) || ($manualColor !== '' && !preg_match('/^#[0-9a-f]{6}$/iD', $manualColor))) {
        throw new ApiError(422, 'Bitte verwende einen HEX-Farbcode wie #336699.');
    }
    reserveUploadRequest($userId);
    $storage = config()['storage_path'];
    if (!is_dir($storage) && !mkdir($storage, 0700, true) && !is_dir($storage)) {
        throw new RuntimeException('Storage unavailable');
    }
    $filename = bin2hex(random_bytes(20)) . '.jpg';
    $destination = $storage . '/' . $filename;
    try {
        $source = @imagecreatefromstring(file_get_contents($temporary));
        if ($source === false) {
            throw new ApiError(422, 'Das Bild konnte nicht verarbeitet werden.');
        }
        if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data($temporary);
            $orientation = (int) ($exif['Orientation'] ?? 1);
            if (in_array($orientation, [2, 4, 5, 7], true)) {
                imageflip($source, IMG_FLIP_HORIZONTAL);
            }
            $angle = match ($orientation) { 3, 4 => 180, 5, 6 => -90, 7, 8 => 90, default => 0 };
            if ($angle !== 0) {
                $rotated = imagerotate($source, $angle, 0);
                if ($rotated === false) throw new RuntimeException('Image rotation failed');
                unset($source);
                $source = $rotated;
            }
        }
        $ratio = min(1, 1600 / max(imagesx($source), imagesy($source)));
        $target = imagecreatetruecolor(max(1, (int) (imagesx($source) * $ratio)), max(1, (int) (imagesy($source) * $ratio)));
        imagefill($target, 0, 0, imagecolorallocate($target, 255, 255, 255));
        imagecopyresampled($target, $source, 0, 0, 0, 0, imagesx($target), imagesy($target), imagesx($source), imagesy($source));
        $measurement = pixelColor($target);
        if ($measurement['brightness'] < 0.08 && $manualColor === '') {
            throw new ApiError(422, 'Das Motiv ist sehr dunkel. Bitte bei Tageslicht neu aufnehmen oder die Farbe manuell setzen (auch für schwarze Kleidung).');
        }
        $written = imagejpeg($target, $destination, 85);
        unset($source, $target);
        if (!$written) throw new RuntimeException('Image save failed');
        chmod($destination, 0600);

        $color = strtoupper($manualColor ?: $measurement['hex']);
        $statement = db()->prepare('INSERT INTO wardrobe_items (user_id, image_path, category, color, style, description, color_source, color_coverage, brightness) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([$userId, $filename, $category, $color, 'Farbbasiert', $category . ' · ' . $color, $manualColor === '' ? 'pixel' : 'manual', $measurement['coverage'], $measurement['brightness']]);
        $id = (int) db()->lastInsertId();
    } catch (Throwable $error) {
        if (is_file($destination)) unlink($destination);
        throw $error;
    }
    $statement = db()->prepare('SELECT * FROM wardrobe_items WHERE id = ? AND user_id = ?');
    $statement->execute([$id, $userId]);
    http_response_code(201);
    return ['item' => serializeItem($statement->fetch())];
});