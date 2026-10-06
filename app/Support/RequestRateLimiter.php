<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;
use RuntimeException;

/** Shared, locked counters survive new sessions and simultaneous PHP workers. */
final class RequestRateLimiter
{
    public function __construct(private string $directory)
    {
    }

    /** Consume one attempt in a fixed window; false means the budget is exhausted. */
    public function consume(string $key, int $limit, int $windowSeconds, ?int $now = null): bool
    {
        if ($limit < 0 || $windowSeconds < 1) {
            throw new InvalidArgumentException('Invalid rate limit configuration.');
        }
        if ($limit === 0) {
            return false;
        }

        return $this->withLockedCounter($key, function ($handle) use ($limit, $windowSeconds, $now): bool {
            $raw = stream_get_contents($handle, 2048);
            if ($raw === false) {
                throw new RuntimeException('Rate limit storage could not be read.');
            }
            $state = $raw === '' ? [] : json_decode($raw, true);
            if (!is_array($state)) {
                throw new RuntimeException('Rate limit storage is invalid.');
            }

            $window = intdiv($now ?? time(), $windowSeconds) * $windowSeconds;
            $count = ($state['window'] ?? null) === $window ? (int) ($state['count'] ?? 0) : 0;
            if ($count < 0) {
                throw new RuntimeException('Rate limit counter is invalid.');
            }
            if ($count >= $limit) {
                return false;
            }
            $this->writeCounter($handle, ['window' => $window, 'count' => $count + 1]);
            return true;
        });
    }

    /** Reset after successful authentication; preserve the inode for worker locks. */
    public function reset(string $key): void
    {
        $this->withLockedCounter($key, function ($handle): bool {
            $this->writeCounter($handle, []);
            return true;
        });
    }

    private function withLockedCounter(string $key, callable $callback): bool
    {
        if (!is_dir($this->directory) && !@mkdir($this->directory, 0700, true) && !is_dir($this->directory)) {
            throw new RuntimeException('Rate limit storage is unavailable.');
        }
        $handle = @fopen($this->directory . DIRECTORY_SEPARATOR . hash('sha256', $key) . '.json', 'c+');
        if ($handle === false) {
            throw new RuntimeException('Rate limit storage is unavailable.');
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                throw new RuntimeException('Rate limit storage could not be locked.');
            }
            return $callback($handle);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    private function writeCounter($handle, array $state): void
    {
        $json = json_encode($state, JSON_THROW_ON_ERROR);
        if (!rewind($handle) || !ftruncate($handle, 0) || fwrite($handle, $json) !== strlen($json) || !fflush($handle)) {
            throw new RuntimeException('Rate limit storage could not be written.');
        }
    }
}
