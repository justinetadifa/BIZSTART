<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use RuntimeException;

require_once __DIR__ . '/auth-validation.php';

/** PRC credentials never enter the public upload/CDN pipeline. */
final class BrokerDocuments
{
    public const MAX_BYTES = 5 * 1024 * 1024;
    private string $directory;

    public function __construct(?string $directory = null)
    {
        $this->directory = $directory ?? dirname(__DIR__, 2) . '/data/broker-documents';
    }

    public function stage(array $files): array
    {
        $staged = [];
        try {
            foreach (['front', 'back'] as $side) {
                $file = $files['prc_' . $side] ?? $files['prc_' . $side . '_image'] ?? null;
                if ($file === null || (is_array($file) && ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE)) {
                    continue;
                }
                if (!is_array($file) || !is_int($file['error'] ?? null) || ($file['error'] ?? null) !== UPLOAD_ERR_OK) {
                    throw new \SfcAuthValidationException(['prc_' . $side => 'PRC ID ' . $side . ' upload failed. Choose a JPG, PNG, or WebP up to 5 MB.']);
                }
                $temporary = $file['tmp_name'] ?? null;
                if (!is_string($temporary) || !is_uploaded_file($temporary)) {
                    throw new \SfcAuthValidationException(['prc_' . $side => 'Choose a valid PRC ID ' . $side . ' image.']);
                }
                try {
                    $metadata = $this->validateImage($temporary);
                } catch (\Throwable $exception) {
                    throw new \SfcAuthValidationException(['prc_' . $side => $exception->getMessage()]);
                }
                $this->ensureDirectory();
                $id = bin2hex(random_bytes(32));
                $destination = $this->pathForId($id);
                if (!move_uploaded_file($temporary, $destination)) {
                    throw new RuntimeException('Unable to save the private PRC document. Please try again.');
                }
                @chmod($destination, 0600);
                $staged[$side] = ['id' => $id, 'mime' => $metadata['mime'], 'size' => $metadata['size'], 'sha256' => hash_file('sha256', $destination), 'label' => 'PRC ID — ' . ucfirst($side)];
            }
            return $staged;
        } catch (\Throwable $exception) {
            $this->discard($staged);
            throw $exception;
        }
    }

    /** Validate actual bytes before decoding; browser MIME/name/size are ignored. */
    public function validateImage(string $path): array
    {
        clearstatcache(true, $path);
        $size = is_file($path) ? filesize($path) : false;
        if ($size === false || $size < 1 || $size > self::MAX_BYTES) {
            throw new InvalidArgumentException('Choose a JPG, PNG, or WebP image up to 5 MB per side.');
        }
        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($path);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            throw new InvalidArgumentException('PRC documents must be JPG, PNG, or WebP images.');
        }
        $dimensions = @getimagesize($path);
        $width = (int) ($dimensions[0] ?? 0);
        $height = (int) ($dimensions[1] ?? 0);
        if ($dimensions === false || ($dimensions['mime'] ?? '') !== $mime || $width < 1 || $height < 1 || $width > 10000 || $height > 10000 || $width * $height > 16000000) {
            throw new InvalidArgumentException('Choose a readable image up to 10,000 pixels per side and 16 megapixels.');
        }
        if (function_exists('imagecreatefromstring')) {
            $bytes = file_get_contents($path);
            $image = $bytes !== false ? @imagecreatefromstring($bytes) : false;
            if ($image === false) {
                throw new InvalidArgumentException('This image is damaged or unreadable. Choose another JPG, PNG, or WebP.');
            }
            imagedestroy($image);
        }
        return ['mime' => $mime, 'size' => (int) $size];
    }

    public function assertStored(array $metadata): void
    {
        $path = $this->pathForId((string) ($metadata['id'] ?? ''));
        if (!is_file($path) || !in_array($metadata['mime'] ?? '', ['image/jpeg', 'image/png', 'image/webp'], true) || filesize($path) !== (int) ($metadata['size'] ?? 0)) {
            throw new InvalidArgumentException('A PRC document is missing or unreadable. Replace both PRC ID images before submitting.');
        }
        if (!is_string($metadata['sha256'] ?? null) || !hash_equals($metadata['sha256'], (string) hash_file('sha256', $path))) {
            throw new InvalidArgumentException('A stored PRC document failed its integrity check. Please upload it again.');
        }
    }

    public function publicMetadata(?array $metadata): ?array
    {
        if ($metadata === null) { return null; }
        return ['id' => (string) ($metadata['id'] ?? ''), 'mime' => (string) ($metadata['mime'] ?? ''), 'size' => (int) ($metadata['size'] ?? 0), 'label' => (string) ($metadata['label'] ?? 'PRC ID')];
    }

    /** Call only with documents staged in the failing request, never old metadata. */
    public function discard(array $staged): void
    {
        foreach ($staged as $metadata) {
            $id = (string) ($metadata['id'] ?? '');
            if (preg_match('/^[a-f0-9]{64}$/D', $id) === 1) {
                $path = $this->pathForId($id);
                if (is_file($path)) { unlink($path); }
            }
        }
    }

    public function pathForId(string $id): string
    {
        if (preg_match('/^[a-f0-9]{64}$/D', $id) !== 1) {
            throw new InvalidArgumentException('Invalid PRC document identifier.');
        }
        return $this->directory . DIRECTORY_SEPARATOR . $id . '.bin';
    }

    private function ensureDirectory(): void
    {
        if (!is_dir($this->directory) && !mkdir($this->directory, 0700, true) && !is_dir($this->directory)) {
            throw new RuntimeException('Private document storage is unavailable. Contact support.');
        }
        $denyFile = $this->directory . DIRECTORY_SEPARATOR . '.htaccess';
        if (!is_file($denyFile) && file_put_contents($denyFile, "Require all denied\n") === false) {
            throw new RuntimeException('Unable to protect private document storage. Contact support.');
        }
    }
}
