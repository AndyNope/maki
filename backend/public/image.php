<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

endpoint('GET', function (): array {
    $filename = $_GET['file'] ?? '';
    $expires = $_GET['expires'] ?? '';
    $signature = $_GET['signature'] ?? '';
    if (!is_string($filename) || !preg_match('/^[a-f0-9]{40}\.jpg$/D', $filename) || !is_string($expires) || !ctype_digit($expires) || !is_string($signature)) {
        throw new ApiError(400, 'Ungültiger Bild-Link.');
    }
    $expected = hash_hmac('sha256', $filename . ':' . $expires, config()['media_signing_key']);
    if ((int) $expires < time() || !hash_equals($expected, $signature)) {
        throw new ApiError(403, 'Dieser Bild-Link ist abgelaufen oder ungültig. Bitte lade den Kleiderschrank neu.');
    }
    $path = config()['storage_path'] . '/' . $filename;
    if (!is_file($path)) throw new ApiError(404, 'Bild nicht gefunden.');
    header('Content-Type: image/jpeg');
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: inline; filename="wardrobe.jpg"');
    header('Cross-Origin-Resource-Policy: cross-origin');
    readfile($path);
    exit;
});