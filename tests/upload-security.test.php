<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/Support/helpers.php';

$temporaryPaths = [];
$checks = 0;

function upload_fixture(string $content): string
{
    $path = tempnam(sys_get_temp_dir(), 'locus-img-');
    if ($path === false) {
        throw new RuntimeException('Unable to create a temporary image fixture.');
    }
    $GLOBALS['temporaryPaths'][] = $path;
    if (file_put_contents($path, $content) === false) {
        throw new RuntimeException('Unable to write an image fixture.');
    }
    return $path;
}

function upload_check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $GLOBALS['checks']++;
}

function upload_rejected(string $path, string $message): void
{
    try {
        public_image_file_metadata($path);
    } catch (InvalidArgumentException) {
        $GLOBALS['checks']++;
        return;
    }
    throw new RuntimeException($message);
}

function png_chunk(string $type, string $body): string
{
    return pack('N', strlen($body)) . $type . $body . pack('N', crc32($type . $body));
}

function png_dimensions_fixture(int $width, int $height): string
{
    return "\x89PNG\r\n\x1a\n"
        . png_chunk('IHDR', pack('NNCCCCC', $width, $height, 8, 6, 0, 0, 0))
        . png_chunk('IDAT', gzcompress("\x00\x00\x00\x00\xff"))
        . png_chunk('IEND', '');
}

try {
    $png = upload_fixture((string) base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr4sAAAAASUVORK5CYII=', true));
    $metadata = public_image_file_metadata($png);
    upload_check($metadata['mime'] === 'image/png' && $metadata['extension'] === 'png', 'Valid PNG MIME was not detected.');
    upload_check($metadata['width'] === 1 && $metadata['height'] === 1 && $metadata['size'] === filesize($png), 'Image metadata does not reflect actual file contents.');

    $gif = upload_fixture((string) base64_decode('R0lGODlhAQABAIAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', true));
    $metadata = public_image_file_metadata($gif);
    upload_check($metadata['mime'] === 'image/gif' && $metadata['width'] === 1 && $metadata['height'] === 1, 'Existing GIF upload support was lost.');

    upload_rejected(upload_fixture('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>'), 'Active SVG content was accepted.');
    upload_rejected(upload_fixture('<?php echo "unsafe"; ?>'), 'Executable PHP content was accepted as an image.');
    upload_rejected(upload_fixture(''), 'Empty image was accepted.');
    upload_rejected(upload_fixture("\x89PNG\r\n\x1a\n"), 'Truncated image was accepted.');
    upload_rejected(upload_fixture(png_dimensions_fixture(12001, 1)), 'Oversized image width was accepted.');
    upload_rejected(upload_fixture(png_dimensions_fixture(1, 12001)), 'Oversized image height was accepted.');
    upload_rejected(upload_fixture(png_dimensions_fixture(8000, 8000)), 'Excessive image pixel count was accepted.');
    upload_rejected(upload_fixture(png_dimensions_fixture(0, 1)), 'Zero image dimension was accepted.');

    $oversized = upload_fixture('');
    $stream = fopen($oversized, 'wb');
    if ($stream === false) {
        throw new RuntimeException('Unable to open the byte limit fixture.');
    }
    try {
        if (!ftruncate($stream, 10 * 1024 * 1024 + 1)) {
            throw new RuntimeException('Unable to create the byte limit fixture.');
        }
    } finally {
        fclose($stream);
    }
    clearstatcache(true, $oversized);
    upload_rejected($oversized, 'Image exceeding the actual byte limit was accepted.');
    upload_check(store_uploaded_public_image(null) === null, 'Optional image upload changed behavior.');
    upload_check(store_uploaded_public_image(['error' => UPLOAD_ERR_NO_FILE]) === null, 'Missing optional image upload changed behavior.');

    try {
        store_uploaded_public_image(['error' => UPLOAD_ERR_OK, 'tmp_name' => $png, 'type' => 'image/jpeg', 'name' => 'fake.php', 'size' => 1]);
        throw new RuntimeException('A local file bypassed the HTTP upload boundary.');
    } catch (InvalidArgumentException) {
        $checks++;
    }
} finally {
    foreach ($temporaryPaths as $path) {
        if (is_file($path)) {
            unlink($path);
        }
    }
}

echo sprintf("Upload security checks passed (%d checks; no database connection or writes).\n", $checks);
