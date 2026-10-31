<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

endpoint('GET', function (): array {
    $userId = authenticate();
    $statement = db()->prepare('SELECT * FROM wardrobe_items WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 500');
    $statement->execute([$userId]);
    return ['items' => array_map('serializeItem', $statement->fetchAll())];
});