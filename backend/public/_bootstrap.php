<?php
declare(strict_types=1);
$backendDirectory = is_file(dirname(__DIR__) . '/bootstrap.php')
    ? dirname(__DIR__)
    : dirname(__DIR__, 2) . '/backend';
if (!is_file($backendDirectory . '/bootstrap.php') && is_file(dirname(__DIR__, 2) . '/private/backend/bootstrap.php')) {
    $backendDirectory = dirname(__DIR__, 2) . '/private/backend';
}
if (!is_file($backendDirectory . '/bootstrap.php') || !is_file($backendDirectory . '/colors.php')) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode(['error' => 'Das private Backend ist noch nicht installiert. Bitte die Servereinrichtung abschließen.'], JSON_UNESCAPED_UNICODE);
    exit;
}
require $backendDirectory . '/bootstrap.php';
require $backendDirectory . '/colors.php';