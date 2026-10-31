<?php
declare(strict_types=1);

return [
    'db_dsn' => 'mysql:host=localhost;dbname=maki_style;charset=utf8mb4',
    'db_user' => 'maki_user',
    'db_password' => '',
    'media_signing_key' => getenv('MEDIA_SIGNING_KEY') ?: '',
    'public_api_url' => 'https://example.com/api',
    'allowed_origins' => ['http://localhost:8081', 'https://app.example.com'],
    'require_https' => true,
    'uploads_per_hour' => 30,
    'storage_path' => __DIR__ . '/storage/uploads',
];