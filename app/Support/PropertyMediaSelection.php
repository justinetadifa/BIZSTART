<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

/** Resolve cover choices against server-staged uploads; never accept a client image path. */
final class PropertyMediaSelection
{
    public static function withUploads(array $payload, array $input, array $uploadedImages): array
    {
        unset($payload['cover_image_path'], $payload['cover_media_id']);
        $hasMedia = array_key_exists('cover_media_id', $input) && $input['cover_media_id'] !== '';
        $hasUpload = array_key_exists('cover_upload_index', $input) && $input['cover_upload_index'] !== '';
        if ($hasMedia && $hasUpload) {
            throw new InvalidArgumentException('Choose one cover photo from this listing.');
        }
        if ($hasMedia) {
            $payload['cover_media_id'] = self::integer($input['cover_media_id'], false);
        }
        if ($hasUpload) {
            $index = self::integer($input['cover_upload_index'], true);
            if (!array_key_exists($index, $uploadedImages) || !is_string($uploadedImages[$index]) || trim($uploadedImages[$index]) === '') {
                throw new InvalidArgumentException('Choose a cover photo from the uploaded property photos.');
            }
            $payload['cover_image_path'] = $uploadedImages[$index];
        }
        if (array_key_exists('retained_media_ids', $input)) {
            $retained = $input['retained_media_ids'];
            if (is_string($retained)) {
                $serialized = trim($retained);
                if ($serialized === '' || $serialized[0] !== '[') {
                    throw new InvalidArgumentException('Choose valid retained property photos.');
                }
                $retained = json_decode($serialized, true);
            }
            if (!is_array($retained) || array_keys($retained) !== ($retained === [] ? [] : range(0, count($retained) - 1))) {
                throw new InvalidArgumentException('Choose valid retained property photos.');
            }
            $payload['retained_media_ids'] = array_values(array_unique(array_map(static fn ($id): int => self::integer($id, false), $retained)));
        }
        return $payload;
    }

    private static function integer(mixed $value, bool $allowZero): int
    {
        if ((!is_int($value) && !is_string($value)) || !preg_match('/^(?:0|[1-9][0-9]*)$/D', (string) $value)) {
            throw new InvalidArgumentException('Choose a valid property photo.');
        }
        $integer = filter_var($value, FILTER_VALIDATE_INT);
        if ($integer === false || $integer < ($allowZero ? 0 : 1)) {
            throw new InvalidArgumentException('Choose a valid property photo.');
        }
        return $integer;
    }
}
