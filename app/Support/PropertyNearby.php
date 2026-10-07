<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

/** Observed surroundings are evidence, never automatically assigned assessment scores. */
final class PropertyNearby
{
    public static function normalize(mixed $items): array
    {
        if (is_string($items)) {
            $items = json_decode($items, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new InvalidArgumentException('Nearby property information is invalid.');
            }
        }
        if ($items === null) {
            return [];
        }
        if (!is_array($items) || ($items !== [] && array_keys($items) !== range(0, count($items) - 1)) || count($items) > 6) {
            throw new InvalidArgumentException('Add up to six nearby properties or businesses.');
        }
        $result = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                throw new InvalidArgumentException('Nearby property information is invalid.');
            }
            foreach (['name', 'type', 'imageUrl'] as $field) {
                if (isset($item[$field]) && !is_string($item[$field])) {
                    throw new InvalidArgumentException('Nearby property information is invalid.');
                }
            }
            $name = trim($item['name'] ?? '');
            $type = trim($item['type'] ?? '');
            $image = trim($item['imageUrl'] ?? '');
            if ($name === '' || strlen($name) > 180 || strlen($type) > 100) {
                throw new InvalidArgumentException('Each nearby property needs a short name.');
            }
            $distance = $item['distanceKm'] ?? null;
            if ($distance === '') {
                $distance = null;
            }
            if ($distance !== null && (!is_numeric($distance) || !is_finite((float) $distance) || (float) $distance < 0 || (float) $distance > 100)) {
                throw new InvalidArgumentException('Nearby distance must be between 0 and 100 km.');
            }
            if ($image !== '' && !preg_match('~^assets/uploads/[a-z0-9_-]+/[a-z0-9_.-]+$~i', $image)) {
                $parts = parse_url($image);
                if (strlen($image) > 2000 || !is_array($parts) || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])) {
                    throw new InvalidArgumentException('Nearby photo URL is invalid.');
                }
            }
            $result[] = ['name' => $name, 'type' => $type, 'distanceKm' => $distance === null ? null : round((float) $distance, 2), 'imageUrl' => $image];
        }
        return $result;
    }

    public static function withUploads(array $payload, array $files): array
    {
        if (!array_key_exists('nearbyProperties', $payload)) {
            return $payload;
        }
        $items = self::normalize($payload['nearbyProperties']);
        foreach ($items as $index => &$item) {
            $image = \store_uploaded_public_image($files['nearby_photo_' . $index] ?? null, 'nearby');
            if ($image !== null) {
                $item['imageUrl'] = $image;
            }
        }
        unset($item);
        $payload['nearbyProperties'] = $items;
        return $payload;
    }
}
