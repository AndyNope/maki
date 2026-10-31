<?php
declare(strict_types=1);

final class ApiError extends RuntimeException
{
    public function __construct(public readonly int $statusCode, string $message)
    {
        parent::__construct($message);
    }
}

function config(): array
{
    static $config = null;
    if ($config === null) {
        $path = __DIR__ . '/config.local.php';
        if (!is_file($path)) {
            throw new ApiError(503, 'Das Backend ist noch nicht konfiguriert.');
        }
        $config = require $path;
        if (!is_array($config) || strlen($config['media_signing_key'] ?? '') < 32) {
            throw new ApiError(503, 'Die Server-Konfiguration ist unvollständig.');
        }
    }
    return $config;
}

function db(): PDO
{
    static $connection = null;
    if ($connection === null) {
        $config = config();
        $connection = new PDO($config['db_dsn'], $config['db_user'], $config['db_password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $connection->exec("SET time_zone = '+00:00'");
    }
    return $connection;
}

function endpoint(string $method, callable $handler): never
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    try {
        $config = config();
        if ($config['require_https'] && ($_SERVER['HTTPS'] ?? '') !== 'on') {
            throw new ApiError(400, 'Diese API benötigt HTTPS.');
        }
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '') {
            if (!in_array($origin, $config['allowed_origins'], true)) {
                throw new ApiError(403, 'Dieser Ursprung ist nicht zugelassen.');
            }
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: ' . $method . ', OPTIONS');
            header('Access-Control-Allow-Headers: Authorization, Content-Type');
        }
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
            header('Allow: ' . $method . ', OPTIONS');
            throw new ApiError(405, 'HTTP-Methode nicht erlaubt.');
        }
        echo json_encode($handler(), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } catch (ApiError $error) {
        http_response_code($error->statusCode);
        echo json_encode(['error' => $error->getMessage()], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $error) {
        error_log('Maki API failure: ' . get_class($error));
        http_response_code(500);
        echo json_encode(['error' => 'Interner Serverfehler. Bitte versuche es später erneut.']);
    }
    exit;
}

function authenticate(): int
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer ([a-f0-9]{64})$/iD', $authorization, $matches)) {
        throw new ApiError(401, 'Bitte verwende einen gültigen Zugangstoken.');
    }
    $statement = db()->prepare('SELECT id FROM users WHERE api_token_hash = ?');
    $statement->execute([hash('sha256', $matches[1])]);
    $id = $statement->fetchColumn();
    if ($id === false) {
        throw new ApiError(401, 'Der Zugangstoken ist ungültig.');
    }
    return (int) $id;
}

function reserveUploadRequest(int $userId): void
{
    $statement = db()->prepare('UPDATE users SET upload_requests = IF(upload_window_started_at IS NULL OR upload_window_started_at <= UTC_TIMESTAMP() - INTERVAL 1 HOUR, 1, upload_requests + 1), upload_window_started_at = IF(upload_window_started_at IS NULL OR upload_window_started_at <= UTC_TIMESTAMP() - INTERVAL 1 HOUR, UTC_TIMESTAMP(), upload_window_started_at) WHERE id = ? AND (upload_window_started_at IS NULL OR upload_window_started_at <= UTC_TIMESTAMP() - INTERVAL 1 HOUR OR upload_requests < ?)');
    $statement->execute([$userId, max(1, (int) (config()['uploads_per_hour'] ?? 30))]);
    if ($statement->rowCount() !== 1) {
        header('Retry-After: 3600');
        throw new ApiError(429, 'Dein stündliches Upload-Limit ist erreicht. Bitte versuche es später erneut.');
    }
}

function imageUrl(string $filename): string
{
    $expires = time() + 3600;
    $signature = hash_hmac('sha256', $filename . ':' . $expires, config()['media_signing_key']);
    return rtrim(config()['public_api_url'], '/') . '/image.php?' . http_build_query([
        'file' => $filename, 'expires' => $expires, 'signature' => $signature,
    ]);
}

function serializeItem(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'category' => $row['category'],
        'color' => $row['color'],
        'color_source' => $row['color_source'] ?? 'legacy',
        'color_coverage' => isset($row['color_coverage']) ? (float) $row['color_coverage'] : null,
        'brightness' => isset($row['brightness']) ? (float) $row['brightness'] : null,
        'style' => $row['style'],
        'description' => $row['description'],
        'image_url' => imageUrl($row['image_path']),
        'created_at' => str_replace(' ', 'T', $row['created_at']) . 'Z',
    ];
}
