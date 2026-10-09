<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use OutOfBoundsException;
use Throwable;

/**
 * Handles private Authority to Sell files uploaded by brokers.
 * Accepted MIME types: PDF, JPG, JPEG, PNG. Max 15 MB.
 * Stored in private data directory: data/property-authority-to-sell.
 */
final class PropertyAuthorityToSellFiles
{
    public const MAX_BYTES = 15 * 1024 * 1024;
    private const EXTENSIONS = [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
    ];

    public static function normalize(mixed $data): ?array
    {
        if ($data === null || !is_array($data)) {
            return null;
        }

        $id = (string) ($data['id'] ?? '');
        if ($id === '' || !preg_match('/^[a-f0-9]{32}$/D', $id)) {
            return null;
        }

        $status = strtolower(trim((string) ($data['status'] ?? 'pending_review')));
        if (!in_array($status, ['pending_review', 'validated', 'rejected', 'requires_resubmission'], true)) {
            $status = 'pending_review';
        }

        return [
            'id' => $id,
            'label' => self::label((string) ($data['label'] ?? 'authority-to-sell.pdf'), (string) ($data['extension'] ?? 'pdf')),
            'mime' => (string) ($data['mime'] ?? 'application/pdf'),
            'size' => (int) ($data['size'] ?? 0),
            'extension' => (string) ($data['extension'] ?? 'pdf'),
            'uploadedAt' => (string) ($data['uploadedAt'] ?? gmdate('c')),
            'status' => $status,
            'reviewerId' => isset($data['reviewerId']) ? (int) $data['reviewerId'] : null,
            'reviewerName' => isset($data['reviewerName']) ? (string) $data['reviewerName'] : null,
            'reviewedAt' => isset($data['reviewedAt']) ? (string) $data['reviewedAt'] : null,
            'reviewNote' => isset($data['reviewNote']) ? (string) $data['reviewNote'] : null,
        ];
    }

    public static function stage(mixed $file): ?array
    {
        if ($file === null || !is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return null;
        }

        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            throw new InvalidArgumentException('Authority to Sell upload failed. Maximum file size is 15 MB.');
        }

        $tmpName = (string) ($file['tmp_name'] ?? '');
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            throw new InvalidArgumentException('Authority to Sell document must be uploaded via the file picker.');
        }

        $metadata = self::fileMetadata($tmpName);
        $name = (string) ($file['name'] ?? 'authority-to-sell.' . $metadata['extension']);
        $label = self::label($name, $metadata['extension']);

        $directory = self::storageDirectory(true);
        do {
            $id = bin2hex(random_bytes(16));
            $path = $directory . DIRECTORY_SEPARATOR . $id . '.' . $metadata['extension'];
        } while (file_exists($path));

        if (!move_uploaded_file($tmpName, $path)) {
            throw new InvalidArgumentException('Unable to save Authority to Sell file.');
        }

        return [
            'id' => $id,
            'label' => $label,
            'mime' => $metadata['mime'],
            'size' => $metadata['size'],
            'extension' => $metadata['extension'],
            'uploadedAt' => gmdate('c'),
            'status' => 'pending_review',
            'reviewerId' => null,
            'reviewerName' => null,
            'reviewedAt' => null,
            'reviewNote' => null,
        ];
    }

    public static function locate(array $record): string
    {
        $id = (string) ($record['id'] ?? '');
        $ext = (string) ($record['extension'] ?? (self::EXTENSIONS[$record['mime'] ?? ''] ?? 'pdf'));
        if (!preg_match('/^[a-f0-9]{32}$/D', $id)) {
            throw new OutOfBoundsException('Invalid document reference.');
        }

        $directory = self::storageDirectory(false);
        $candidate = $directory . DIRECTORY_SEPARATOR . $id . '.' . $ext;
        $path = realpath($candidate);
        if ($path === false || strcasecmp(dirname($path), $directory) !== 0 || !is_file($path)) {
            throw new OutOfBoundsException('The Authority to Sell file is unavailable.');
        }

        return $path;
    }

    public static function fileMetadata(string $path): array
    {
        clearstatcache(true, $path);
        $size = is_file($path) ? filesize($path) : false;
        if ($size === false || $size < 1 || $size > self::MAX_BYTES) {
            throw new InvalidArgumentException('Authority to Sell document must be between 1 byte and 15 MB.');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = (string) $finfo->file($path);
        if (!isset(self::EXTENSIONS[$mime])) {
            throw new InvalidArgumentException('Authority to Sell must be a PDF, JPG, JPEG, or PNG document.');
        }

        $bytes = file_get_contents($path);
        if ($bytes === false || strlen($bytes) !== $size) {
            throw new InvalidArgumentException('The uploaded document could not be read.');
        }

        if ($mime === 'application/pdf') {
            if (!preg_match('/^%PDF-(?:1\.[0-7]|2\.0)/', $bytes)) {
                throw new InvalidArgumentException('The uploaded PDF appears corrupted or incomplete.');
            }
        } else {
            $dimensions = @getimagesize($path);
            if ($dimensions === false || ($dimensions['mime'] ?? '') !== $mime) {
                throw new InvalidArgumentException('The uploaded image appears corrupted.');
            }
        }

        return [
            'mime' => $mime,
            'extension' => self::EXTENSIONS[$mime],
            'size' => $size,
        ];
    }

    private static function storageDirectory(bool $create): string
    {
        $data = realpath(dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'data');
        if ($data === false || is_link($data)) {
            throw new OutOfBoundsException('Data storage is unavailable.');
        }

        $directory = $data . DIRECTORY_SEPARATOR . 'property-authority-to-sell';
        if ($create && !is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new InvalidArgumentException('Unable to create Authority to Sell storage directory.');
        }

        $resolved = realpath($directory);
        if ($resolved === false || is_link($directory) || strcasecmp(dirname($resolved), $data) !== 0) {
            throw new OutOfBoundsException('Authority to Sell storage is unavailable.');
        }

        return $resolved;
    }

    private static function label(string $name, string $extension): string
    {
        $name = trim((string) preg_replace('/[\x00-\x1f\x7f]/u', '', basename(str_replace('\\', '/', $name))));
        $name = mb_strcut($name, 0, 180, 'UTF-8');
        return $name === '' ? 'authority-to-sell.' . $extension : $name;
    }
}
