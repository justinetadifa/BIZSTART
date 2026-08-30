<?php
declare(strict_types=1);

function read_json_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new InvalidArgumentException('Request body must be valid JSON.');
    }

    return $decoded;
}

function request_method(): string
{
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

    if ($method === 'POST') {
        $override = $_POST['_method'] ?? $_GET['_method'] ?? null;
        if (is_string($override) && trim($override) !== '') {
            return strtoupper(trim($override));
        }
    }

    return $method;
}

function read_request_input(): array
{
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (
        str_contains($contentType, 'multipart/form-data') ||
        str_contains($contentType, 'application/x-www-form-urlencoded')
    ) {
        return $_POST;
    }

    return read_json_input();
}

function respond_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function string_or_null(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }

    $value = trim((string) $value);
    return $value === '' ? null : $value;
}

function int_or_null(mixed $value): ?int
{
    if ($value === null || $value === '') {
        return null;
    }

    $filtered = filter_var($value, FILTER_VALIDATE_INT);
    return $filtered === false ? null : (int) $filtered;
}

function float_or_null(mixed $value): ?float
{
    if ($value === null || $value === '') {
        return null;
    }

    if (!is_numeric($value)) {
        return null;
    }

    return (float) $value;
}

function store_uploaded_public_image(?array $file, string $folder = 'properties'): ?string
{
    if ($file === null || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException('Image upload failed. Please try again.');
    }

    $tmpName = (string) ($file['tmp_name'] ?? '');
    if ($tmpName === '' || !is_uploaded_file($tmpName)) {
        throw new InvalidArgumentException('Uploaded image is invalid.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($tmpName);
    $extension = match ($mime) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        default => null,
    };

    if ($extension === null) {
        throw new InvalidArgumentException('Only JPG, PNG, WEBP, and GIF images are supported.');
    }

    if ($folder === 'properties') {
        try {
            $config = require dirname(__DIR__) . '/config.php';
            $services = new \App\Support\ExternalServices($config);
            $cloudinaryUrl = $services->uploadPropertyImage($file);
            if ($cloudinaryUrl !== null) {
                return $cloudinaryUrl;
            }
        } catch (\Throwable) {
            // Gracefully fall back to local storage if Cloudinary is unavailable.
        }
    }

    $originalName = pathinfo((string) ($file['name'] ?? 'property-image'), PATHINFO_FILENAME);
    $safeName = preg_replace('/[^a-z0-9]+/i', '-', strtolower((string) $originalName));
    $safeName = trim((string) $safeName, '-');
    $safeName = $safeName !== '' ? $safeName : 'property-image';

    $safeFolder = preg_replace('/[^a-z0-9_-]+/i', '-', strtolower(trim($folder))) ?: 'properties';
    $relativeDirectory = 'assets/uploads/' . $safeFolder;
    $absoluteDirectory = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . $safeFolder;
    if (!is_dir($absoluteDirectory) && !mkdir($absoluteDirectory, 0775, true) && !is_dir($absoluteDirectory)) {
        throw new InvalidArgumentException('Unable to create the property upload directory.');
    }

    $fileName = sprintf('%s-%s.%s', date('Ymd-His'), bin2hex(random_bytes(4)), $extension);
    $absolutePath = $absoluteDirectory . DIRECTORY_SEPARATOR . $fileName;

    if (!move_uploaded_file($tmpName, $absolutePath)) {
        throw new InvalidArgumentException('Unable to save the uploaded image.');
    }

    return $relativeDirectory . '/' . $fileName;
}

function store_uploaded_property_image(?array $file): ?string
{
    return store_uploaded_public_image($file, 'properties');
}

function store_uploaded_vote_option_image(?array $file): ?string
{
    return store_uploaded_public_image($file, 'vote-options');
}

function store_uploaded_showcase_image(?array $file): ?string
{
    return store_uploaded_public_image($file, 'showcase');
}
