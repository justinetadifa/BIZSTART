<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use OutOfBoundsException;
use Throwable;

/** Private evidence files: upload paths and browser MIME claims never enter parcel metadata. */
final class PropertyEvidenceFiles
{
    public const MAX_FILES = 4;
    public const MAX_BYTES = 5 * 1024 * 1024;
    private const EXTENSIONS = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'application/pdf' => 'pdf'];

    public static function normalizeAttachments(mixed $items): array
    {
        if ($items === null) { return []; }
        if (!is_array($items) || !self::isList($items) || count($items) > self::MAX_FILES) { throw new InvalidArgumentException('Keep up to four evidence attachments.'); }
        $normalized = []; $ids = [];
        foreach ($items as $item) {
            if (!is_array($item) || !is_string($item['id'] ?? null) || !preg_match('/^[a-f0-9]{32}$/D', $item['id'])
                || isset($ids[$item['id']]) || !is_string($item['label'] ?? null) || $item['label'] === '' || strlen($item['label']) > 200
                || preg_match('/[\x00-\x1f\x7f]/', $item['label']) || !is_string($item['mime'] ?? null) || !isset(self::EXTENSIONS[$item['mime']])
                || !is_int($item['size'] ?? null) || $item['size'] < 1 || $item['size'] > self::MAX_BYTES
                || !is_string($item['uploadedAt'] ?? null) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/D', $item['uploadedAt'])) {
                throw new InvalidArgumentException('Saved evidence attachment metadata is invalid.');
            }
            $timestamp = \DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:sP', $item['uploadedAt']);
            if ($timestamp === false || $timestamp->format('Y-m-d\TH:i:sP') !== $item['uploadedAt']) {
                throw new InvalidArgumentException('Saved evidence attachment date is invalid.');
            }
            $ids[$item['id']] = true;
            $normalized[] = array_intersect_key($item, array_flip(['id', 'label', 'mime', 'size', 'uploadedAt']));
        }
        return $normalized;
    }

    /** Validate PHP's multiple-upload shape without trusting size, type, or submitted path. */
    public static function uploadEntries(mixed $file): array
    {
        if ($file === null) { return []; }
        if (!is_array($file)) { throw new InvalidArgumentException('Evidence uploads are invalid.'); }
        foreach (['name', 'tmp_name', 'error', 'size', 'type'] as $key) {
            if (!is_array($file[$key] ?? null) || !self::isList($file[$key]) || count($file[$key]) !== count($file['name'] ?? []) || count($file[$key]) > self::MAX_FILES) {
                throw new InvalidArgumentException('Select up to four evidence files.');
            }
        }
        $entries = [];
        foreach ($file['name'] as $index => $name) {
            $error = $file['error'][$index];
            if (!is_int($error) || !is_string($name) || strlen($name) > 1000 || !is_string($file['tmp_name'][$index])
                || !is_int($file['size'][$index]) || $file['size'][$index] < 0 || !is_string($file['type'][$index])) {
                throw new InvalidArgumentException('Evidence uploads are invalid.');
            }
            if ($error === UPLOAD_ERR_NO_FILE) { continue; }
            if ($error !== UPLOAD_ERR_OK) { throw new InvalidArgumentException('Evidence upload failed. Each file must be at most 5 MB.'); }
            $entries[] = ['name' => $name, 'tmp_name' => $file['tmp_name'][$index]];
        }
        return $entries;
    }

    /** Validate all files first; return newly staged attachments for rollback on repository failure. */
    public static function stage(mixed $file, array $existing = []): array
    {
        $attachments = self::normalizeAttachments($existing);
        $entries = self::uploadEntries($file);
        if (count($attachments) + count($entries) > self::MAX_FILES) { throw new InvalidArgumentException('A property can have up to four evidence attachments.'); }
        foreach ($entries as &$entry) {
            if ($entry['tmp_name'] === '' || !is_uploaded_file($entry['tmp_name'])) { throw new InvalidArgumentException('Evidence must be uploaded through the file picker.'); }
            $entry['metadata'] = self::fileMetadata($entry['tmp_name']);
            $entry['label'] = self::label($entry['name'], $entry['metadata']['extension']);
        }
        unset($entry);
        $created = [];
        try {
            if ($entries !== []) {
                $directory = self::storageDirectory(true);
                foreach ($entries as $entry) {
                    do { $id = bin2hex(random_bytes(16)); $path = $directory . DIRECTORY_SEPARATOR . $id . '.' . $entry['metadata']['extension']; } while (file_exists($path));
                    if (!move_uploaded_file($entry['tmp_name'], $path)) { throw new InvalidArgumentException('Unable to save the evidence file. Please try again.'); }
                    $attachment = ['id' => $id, 'label' => $entry['label'], 'mime' => $entry['metadata']['mime'], 'size' => $entry['metadata']['size'], 'uploadedAt' => gmdate('c')];
                    $created[] = $attachment; $attachments[] = $attachment;
                }
            }
            return ['attachments' => $attachments, 'created' => $created];
        } catch (Throwable $error) {
            self::discard($created);
            throw $error;
        }
    }

    public static function discard(array $created): void
    {
        foreach (self::normalizeAttachments($created) as $attachment) {
            try { $path = self::locate($attachment); if (!unlink($path)) { error_log('Unable to remove a staged property evidence file.'); } }
            catch (OutOfBoundsException) { /* Already absent. */ }
        }
    }

    public static function locate(array $attachment): string
    {
        $attachment = self::normalizeAttachments([$attachment])[0];
        $directory = self::storageDirectory(false);
        $candidate = $directory . DIRECTORY_SEPARATOR . $attachment['id'] . '.' . self::EXTENSIONS[$attachment['mime']];
        $path = realpath($candidate);
        if ($path === false || strcasecmp(dirname($path), $directory) !== 0 || is_link($candidate) || !is_file($path) || filesize($path) !== $attachment['size']) {
            throw new OutOfBoundsException('The evidence file is unavailable.');
        }
        return $path;
    }

    public static function extension(string $mime): string
    {
        if (!isset(self::EXTENSIONS[$mime])) { throw new InvalidArgumentException('Unsupported evidence content type.'); }
        return self::EXTENSIONS[$mime];
    }

    public static function fileMetadata(string $path): array
    {
        clearstatcache(true, $path);
        $size = is_file($path) ? filesize($path) : false;
        if ($size === false || $size < 1 || $size > self::MAX_BYTES) { throw new InvalidArgumentException('Each evidence file must be between 1 byte and 5 MB.'); }
        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($path);
        if (!isset(self::EXTENSIONS[$mime])) { throw new InvalidArgumentException('Evidence files must be JPG, PNG, WEBP, or PDF.'); }
        $bytes = file_get_contents($path);
        if ($bytes === false || strlen($bytes) !== $size) { throw new InvalidArgumentException('The evidence file could not be read.'); }
        if ($mime === 'application/pdf') {
            if (!preg_match('/^%PDF-(?:1\.[0-7]|2\.0)(?:\r|\n|\s)/', $bytes)
                || !preg_match('/startxref\s+(\d+)\s+%%EOF\s*$/D', substr($bytes, -2048), $trailer)
                || (int) $trailer[1] < 8 || (int) $trailer[1] >= strlen($bytes)
                || !preg_match('/^(?:xref\s|\d+\s+\d+\s+obj\b)/', substr($bytes, (int) $trailer[1], 100))
                || !preg_match('/\d+\s+\d+\s+obj\b[\s\S]+?endobj\b/', $bytes)) {
                throw new InvalidArgumentException('The evidence PDF is incomplete or invalid.');
            }
        } else {
            $dimensions = @getimagesize($path);
            $width = (int) ($dimensions[0] ?? 0); $height = (int) ($dimensions[1] ?? 0);
            if ($dimensions === false || ($dimensions['mime'] ?? '') !== $mime || $width < 1 || $height < 1 || $width > 12000 || $height > 12000 || $width * $height > 40000000) {
                throw new InvalidArgumentException('The evidence image is invalid or exceeds 40 megapixels.');
            }
            $valid = match ($mime) {
                'image/png' => self::validPng($bytes, $width, $height),
                'image/jpeg' => self::validJpeg($bytes),
                'image/webp' => self::validWebp($bytes),
            };
            if (!$valid) { throw new InvalidArgumentException('The evidence image is incomplete or invalid.'); }
            // Decode pixels as an additional integrity check where GD is installed.
            if (function_exists('imagecreatefromstring') && $width * $height <= 12000000) {
                $image = @imagecreatefromstring($bytes);
                if ($image === false) { throw new InvalidArgumentException('The evidence image cannot be decoded.'); }
                imagedestroy($image);
            }
        }
        return ['mime' => $mime, 'extension' => self::EXTENSIONS[$mime], 'size' => $size];
    }

    private static function validPng(string $bytes, int $width, int $height): bool
    {
        if (substr($bytes, 0, 8) !== "\x89PNG\r\n\x1a\n") { return false; }
        $offset = 8; $compressed = ''; $header = null; $palette = false; $ended = false;
        while ($offset + 12 <= strlen($bytes)) {
            $length = unpack('N', substr($bytes, $offset, 4))[1];
            if ($length > self::MAX_BYTES || $offset + 12 + $length > strlen($bytes)) { return false; }
            $type = substr($bytes, $offset + 4, 4); $data = substr($bytes, $offset + 8, $length);
            if (hash('crc32b', $type . $data) !== bin2hex(substr($bytes, $offset + 8 + $length, 4))) { return false; }
            if ($header === null && ($type !== 'IHDR' || $length !== 13)) { return false; }
            if ($type === 'IHDR') {
                if ($header !== null) { return false; }
                $header = unpack('Nwidth/Nheight/Cdepth/Ccolor/Ccompression/Cfilter/Cinterlace', $data);
                if ($header['width'] !== $width || $header['height'] !== $height || $header['compression'] !== 0 || $header['filter'] !== 0 || $header['interlace'] > 1) { return false; }
            } elseif ($type === 'PLTE') { $palette = $length > 0 && $length <= 768 && $length % 3 === 0; }
            elseif ($type === 'IDAT') { $compressed .= $data; }
            elseif ($type === 'IEND') { if ($length !== 0) { return false; } $ended = true; $offset += 12; break; }
            $offset += 12 + $length;
        }
        if (!$ended || $offset !== strlen($bytes) || $compressed === '') { return false; }
        $samples = [0 => 1, 2 => 3, 3 => 1, 4 => 2, 6 => 4][$header['color']] ?? null;
        $depths = [0 => [1, 2, 4, 8, 16], 2 => [8, 16], 3 => [1, 2, 4, 8], 4 => [8, 16], 6 => [8, 16]][$header['color']] ?? [];
        if ($samples === null || !in_array($header['depth'], $depths, true) || ($header['color'] === 3 && !$palette)) { return false; }
        $passes = $header['interlace'] === 0 ? [[0, 0, 1, 1]] : [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
        $rows = []; $expected = 0;
        foreach ($passes as [$x, $y, $dx, $dy]) {
            if ($width <= $x || $height <= $y) { continue; }
            $passWidth = (int) ceil(($width - $x) / $dx); $passHeight = (int) ceil(($height - $y) / $dy);
            $rowBytes = (int) ceil($passWidth * $samples * $header['depth'] / 8) + 1;
            $rows[] = [$passHeight, $rowBytes]; $expected += $passHeight * $rowBytes;
        }
        if ($expected > 64 * 1024 * 1024) { return false; }
        $raw = @gzuncompress($compressed, $expected + 1);
        if ($raw === false || strlen($raw) !== $expected) { return false; }
        $position = 0;
        foreach ($rows as [$count, $length]) { for ($row = 0; $row < $count; $row++) { if (ord($raw[$position]) > 4) { return false; } $position += $length; } }
        return true;
    }

    private static function validJpeg(string $bytes): bool
    {
        if (substr($bytes, 0, 2) !== "\xff\xd8") { return false; }
        $offset = 2; $frame = false; $scan = false; $length = strlen($bytes);
        while ($offset < $length) {
            if (ord($bytes[$offset]) !== 255) { return false; }
            while ($offset < $length && ord($bytes[$offset]) === 255) { $offset++; }
            if ($offset >= $length) { return false; }
            $marker = ord($bytes[$offset++]);
            if ($marker === 217) { return $frame && $scan && $offset === $length; }
            if ($marker === 0 || $marker === 216 || $marker === 1 || ($marker >= 208 && $marker <= 215) || $offset + 2 > $length) { return false; }
            $segment = unpack('n', substr($bytes, $offset, 2))[1];
            if ($segment < 2 || $offset + $segment > $length) { return false; }
            if (in_array($marker, [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207], true)) { $frame = true; }
            $offset += $segment;
            if ($marker === 218) {
                $scan = true;
                $scanStart = $offset;
                while ($offset < $length) {
                    if (ord($bytes[$offset]) !== 255) { $offset++; continue; }
                    $next = $offset + 1;
                    while ($next < $length && ord($bytes[$next]) === 255) { $next++; }
                    if ($next >= $length) { return false; }
                    $value = ord($bytes[$next]);
                    if ($value === 0 || ($value >= 208 && $value <= 215)) { $offset = $next + 1; continue; }
                    break;
                }
                if ($offset === $scanStart) { return false; }
            }
        }
        return false;
    }

    private static function validWebp(string $bytes): bool
    {
        if (substr($bytes, 0, 4) !== 'RIFF' || substr($bytes, 8, 4) !== 'WEBP' || strlen($bytes) < 20 || unpack('V', substr($bytes, 4, 4))[1] + 8 !== strlen($bytes)) { return false; }
        $offset = 12; $image = false;
        while ($offset + 8 <= strlen($bytes)) {
            $type = substr($bytes, $offset, 4); $length = unpack('V', substr($bytes, $offset + 4, 4))[1];
            if ($length < 1 || $offset + 8 + $length + ($length % 2) > strlen($bytes)) { return false; }
            if (in_array($type, ['VP8 ', 'VP8L', 'ANMF'], true)) { $image = true; }
            $offset += 8 + $length + ($length % 2);
        }
        return $image && $offset === strlen($bytes);
    }

    private static function storageDirectory(bool $create): string
    {
        $data = realpath(dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'data');
        if ($data === false || is_link($data)) { throw new OutOfBoundsException('Private evidence storage is unavailable.'); }
        $directory = $data . DIRECTORY_SEPARATOR . 'property-evidence';
        if ($create && !is_dir($directory) && !mkdir($directory, 0700) && !is_dir($directory)) { throw new InvalidArgumentException('Unable to create private evidence storage.'); }
        $resolved = realpath($directory);
        if ($resolved === false || is_link($directory) || strcasecmp(dirname($resolved), $data) !== 0) { throw new OutOfBoundsException('Private evidence storage is unavailable.'); }
        return $resolved;
    }

    private static function label(string $name, string $extension): string
    {
        $name = trim((string) preg_replace('/[\x00-\x1f\x7f]/u', '', basename(str_replace('\\', '/', $name))));
        $name = mb_strcut($name, 0, 180, 'UTF-8');
        return $name === '' ? 'Evidence file.' . $extension : $name;
    }

    private static function isList(array $value): bool
    {
        return array_keys($value) === ($value === [] ? [] : range(0, count($value) - 1));
    }
}
