<?php
declare(strict_types=1);

$defaults = [
    'app' => [
        'name' => 'SFCelerate BizStart',
    ],
    'db' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => (int) (getenv('DB_PORT') ?: 3306),
        'name' => getenv('DB_NAME') ?: 'sfceleratee',
        'user' => getenv('DB_USER') ?: 'root',
        'pass' => getenv('DB_PASS') ?: '',
        'charset' => 'utf8mb4',
    ],
    'services' => [
        'cache' => [
            'path' => dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'cache' . DIRECTORY_SEPARATOR . 'external',
        ],
        'maps' => [
            'tile_url' => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'tile_attribution' => '&copy; OpenStreetMap contributors',
            'locationiq_key' => getenv('LOCATIONIQ_KEY') ?: '',
        ],
        'location' => [
            'locationiq_key' => getenv('LOCATIONIQ_KEY') ?: '',
        ],
        'market' => [
            'alpha_vantage_key' => getenv('ALPHA_VANTAGE_KEY') ?: '',
        ],
        'news' => [
            'newsapi_key' => getenv('NEWSAPI_KEY') ?: '',
            'query' => getenv('NEWSAPI_QUERY') ?: '("San Fernando" OR "La Union" OR Philippines) AND (business OR investment OR property OR infrastructure)',
        ],
        'ai' => [
            'provider' => getenv('AI_PROVIDER') ?: '',
            'gemini_key' => getenv('GEMINI_API_KEY') ?: '',
            'gemini_model' => getenv('GEMINI_MODEL') ?: 'gemini-2.5-flash',
            'openrouter_key' => getenv('OPENROUTER_API_KEY') ?: '',
            'openrouter_model' => getenv('OPENROUTER_MODEL') ?: '',
        ],
        'media' => [
            'cloudinary' => [
                'cloud_name' => getenv('CLOUDINARY_CLOUD_NAME') ?: '',
                'api_key' => getenv('CLOUDINARY_API_KEY') ?: '',
                'api_secret' => getenv('CLOUDINARY_API_SECRET') ?: '',
                'folder' => getenv('CLOUDINARY_FOLDER') ?: 'sfcelerate-bizstart/properties',
            ],
        ],
        'weather' => [
            'openweather_key' => getenv('OPENWEATHER_API_KEY') ?: '',
            'units' => getenv('OPENWEATHER_UNITS') ?: 'metric',
        ],
    ],
];

$localConfigPath = __DIR__ . '/config.local.php';
if (is_file($localConfigPath)) {
    $local = require $localConfigPath;
    if (is_array($local)) {
        $defaults = array_replace_recursive($defaults, $local);
    }
}

return $defaults;
