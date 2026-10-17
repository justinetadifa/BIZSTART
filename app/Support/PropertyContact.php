<?php
declare(strict_types=1);
namespace App\Support;

use InvalidArgumentException;

/** Optional listing contact channels stored in the existing private contact JSON. */
final class PropertyContact
{
    public static function channels(array $payload, array $contact, array $existing): array
    {
        $phones = self::listValue($payload['owner_additional_phones'] ?? $contact['additionalPhones'] ?? $existing['additionalPhones'] ?? [], 'additional phone numbers');
        $links = self::listValue($payload['owner_social_links'] ?? $contact['socialLinks'] ?? $existing['socialLinks'] ?? [], 'social links');
        if (count($phones) > 4 || count($links) > 4) { throw new InvalidArgumentException('Add up to four additional phone numbers and four social links.'); }
        $resultPhones = []; $seen = [];
        $primary = $contact['phone'] ?? $payload['owner_phone'] ?? $existing['phone'] ?? '';
        if (is_string($primary)) { $seen[preg_replace('/\D/', '', $primary)] = true; }
        foreach ($phones as $phone) {
            if (!is_string($phone)) { throw new InvalidArgumentException('Additional phone numbers must be text.'); }
            $phone = trim($phone);
            if ($phone === '') { continue; }
            $digits = preg_replace('/\D/', '', $phone);
            if (strlen($phone) > 40 || !preg_match('/^\+?[0-9() .\-]+$/D', $phone) || strlen($digits) < 7 || strlen($digits) > 15) {
                throw new InvalidArgumentException('Enter an additional phone number with 7 to 15 digits, including its country or area code.');
            }
            if (!isset($seen[$digits])) { $resultPhones[] = $phone; $seen[$digits] = true; }
        }
        $resultLinks = []; $seen = [];
        foreach ($links as $link) {
            if (!is_array($link) || !is_string($link['url'] ?? null) || !is_string($link['label'] ?? '')) { throw new InvalidArgumentException('Enter a valid social account link.'); }
            $url = trim($link['url']); $label = trim($link['label'] ?? '');
            if ($url === '' && $label === '') { continue; }
            $parts = parse_url($url);
            if (strlen($url) > 500 || strlen($label) > 60 || !filter_var($url, FILTER_VALIDATE_URL) || !$parts
                || !in_array(strtolower($parts['scheme'] ?? ''), ['https', 'http'], true) || empty($parts['host'])
                || isset($parts['user']) || isset($parts['pass'])) {
                throw new InvalidArgumentException('Enter a full http or https social account URL without embedded credentials.');
            }
            if (!isset($seen[$url])) { $resultLinks[] = ['label' => $label ?: $parts['host'], 'url' => $url]; $seen[$url] = true; }
        }
        return ['additionalPhones' => $resultPhones, 'socialLinks' => $resultLinks];
    }

    private static function listValue(mixed $value, string $label): array
    {
        if (is_string($value)) {
            try { $value = json_decode($value, true, 16, JSON_THROW_ON_ERROR); }
            catch (\JsonException $error) { throw new InvalidArgumentException('Choose valid ' . $label . '.'); }
        }
        if (!is_array($value) || array_values($value) !== $value) { throw new InvalidArgumentException('Choose valid ' . $label . '.'); }
        return $value;
    }
}
