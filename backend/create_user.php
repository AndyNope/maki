<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__ . '/bootstrap.php';

$email = $argv[1] ?? '';
$name = $argv[2] ?? 'Mein Space';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 254 || trim($name) === '' || mb_strlen($name) > 100) {
    fwrite(STDERR, "Aufruf: php backend/create_user.php email@example.com 'Dein Name'\n");
    exit(1);
}
try {
    $token = bin2hex(random_bytes(32));
    $statement = db()->prepare('INSERT INTO users (email, display_name, api_token_hash) VALUES (?, ?, ?)');
    $statement->execute([$email, $name, hash('sha256', $token)]);
    fwrite(STDOUT, "Benutzer erstellt. Token nur im Profil eingeben und sicher verwahren:\n" . $token . "\n");
} catch (Throwable $error) {
    fwrite(STDERR, "Benutzer konnte nicht erstellt werden. Konfiguration und eindeutige E-Mail prüfen.\n");
    exit(1);
}