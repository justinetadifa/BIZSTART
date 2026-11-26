<?php
declare(strict_types=1);
require __DIR__ . '/app/Support/web.php';
$context = sfc_web_context();
$e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
$mode = isset($_GET['mode']) && is_string($_GET['mode']) ? preg_replace('/[^a-z0-9_-]/i', '', $_GET['mode']) : '';
$cityMapDocumentOnly = true;
header('Content-Type: text/html; charset=UTF-8');
require __DIR__ . '/app/Views/city-map.php';
