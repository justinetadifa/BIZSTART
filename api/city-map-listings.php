<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    if (!in_array(request_method(), ['GET', 'HEAD'], true)) {
        header('Allow: GET, HEAD, OPTIONS');
        return [405, ['error' => 'Method not allowed.']];
    }

    header('Cache-Control: no-store');
    $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/api/city-map-listings.php'));
    $base = rtrim(dirname($scriptName, 2), '/.');
    $feed = $container['properties']->publicMapListings();
    foreach ($feed['listings'] as &$listing) {
        $listing['listing_url'] = $base . '/property-details.php?id=' . $listing['id'];
        $image = ltrim($listing['image_url'], '/');
        $listing['image_url'] = preg_match('~^assets/(?:uploads/properties|images)/[a-z0-9_.() -]+\.(?:jpe?g|png|webp|gif|avif)$~iD', $image)
            ? $base . '/' . $image
            : null;
    }
    unset($listing);

    return $feed;
});
