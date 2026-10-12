<?php
declare(strict_types=1);

$container = require dirname(__DIR__) . '/app/bootstrap.php';
$pdo = $container['pdo'];
$propertiesRepo = $container['properties'];

echo "=== Verifying Multi-Photo Property Upload Functionality ===\n\n";

$passCount = 0;
$totalTests = 0;

function assertCondition(bool $condition, string $message): void {
    global $passCount, $totalTests;
    $totalTests++;
    if ($condition) {
        $passCount++;
        echo "✅ PASS: {$message}\n";
    } else {
        echo "❌ FAIL: {$message}\n";
    }
}

// 1. Test normalize_uploaded_files_array helper
$mockGroupedFiles = [
    'name' => ['photo1.jpg', 'photo2.png', 'photo3.webp'],
    'type' => ['image/jpeg', 'image/png', 'image/webp'],
    'tmp_name' => ['/tmp/php1', '/tmp/php2', '/tmp/php3'],
    'error' => [UPLOAD_ERR_OK, UPLOAD_ERR_OK, UPLOAD_ERR_OK],
    'size' => [1000, 2000, 3000],
];
$normalized = normalize_uploaded_files_array($mockGroupedFiles);
assertCondition(count($normalized) === 3, "normalize_uploaded_files_array normalized 3 grouped files");
assertCondition($normalized[0]['name'] === 'photo1.jpg' && $normalized[1]['size'] === 2000, "Normalized files retain name and size attributes");

// Empty or no-file test
$mockEmpty = [
    'name' => [''],
    'type' => [''],
    'tmp_name' => [''],
    'error' => [UPLOAD_ERR_NO_FILE],
    'size' => [0],
];
$emptyNormalized = normalize_uploaded_files_array($mockEmpty);
assertCondition(count($emptyNormalized) === 0, "normalize_uploaded_files_array ignores UPLOAD_ERR_NO_FILE entries");

// 2. Test PropertyRepository creation with multi-photo gallery
$gallery = [
    'assets/uploads/properties/test-cover.jpg',
    'assets/uploads/properties/test-interior.jpg',
    'assets/uploads/properties/test-road.jpg',
];

$testPropertyPayload = [
    'name' => 'Multi-Photo Test Parcel',
    'subname' => 'Gallery Verification Phase',
    'city' => 'San Fernando',
    'barangay' => 'Sevilla',
    'category' => 'Land',
    'subcategory' => 'Commercial Lot',
    'status' => 'Available',
    'listing_purpose' => 'sale',
    'price' => '15000000',
    'area' => 0.25, // 2,500 sqm
    'lat' => 16.6150,
    'lng' => 120.3160,
    'image_path' => $gallery[0],
    'gallery_images' => $gallery,
];

$created = $propertiesRepo->create($testPropertyPayload, ['id' => 1, 'role' => 'admin', 'name' => 'System Admin']);
$createdId = (int) $created['id'];

assertCondition($createdId > 0, "Created property with ID #{$createdId}");
assertCondition($created['imageUrl'] === $gallery[0], "Cover image matches first gallery image");

// Check property_media table directly
$stmt = $pdo->prepare("SELECT * FROM property_media WHERE property_id = :id ORDER BY sort_order ASC");
$stmt->execute(['id' => $createdId]);
$mediaRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

assertCondition(count($mediaRows) === 3, "property_media has exactly 3 rows created");
assertCondition($mediaRows[0]['source'] === $gallery[0] && (int)$mediaRows[0]['sort_order'] === 0, "Row 0 is cover photo with sort_order 0");
assertCondition($mediaRows[1]['source'] === $gallery[1] && (int)$mediaRows[1]['sort_order'] === 1, "Row 1 is interior photo with sort_order 1");
assertCondition($mediaRows[2]['source'] === $gallery[2] && (int)$mediaRows[2]['sort_order'] === 2, "Row 2 is road photo with sort_order 2");

// Check repository find() media hydration
$fetched = $propertiesRepo->find($createdId);
assertCondition(isset($fetched['media']) && count($fetched['media']) === 3, "Property find() hydrates 'media' array with 3 items");

// 3. Test PropertyRepository update retaining specific photos and adding new ones
$retainedId0 = (int) $mediaRows[0]['id'];
$retainedId2 = (int) $mediaRows[2]['id'];
$newPhoto = 'assets/uploads/properties/test-drone.jpg';

$updatePayload = [
    'name' => 'Multi-Photo Test Parcel (Updated)',
    'subname' => 'Gallery Verification Phase',
    'category' => 'Land',
    'subcategory' => 'Commercial Lot',
    'status' => 'Available',
    'listing_purpose' => 'sale',
    'price' => '15500000',
    'area' => 0.25,
    'lat' => 16.6150,
    'lng' => 120.3160,
    'retained_media_ids' => [$retainedId0, $retainedId2], // Removed interior photo (id1)
    'gallery_images' => [$newPhoto], // Added drone photo
];

$updated = $propertiesRepo->update($createdId, $updatePayload, ['id' => 1, 'role' => 'admin', 'name' => 'System Admin']);

$stmt->execute(['id' => $createdId]);
$updatedMediaRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

assertCondition(count($updatedMediaRows) === 3, "Updated property retains 2 photos + 1 newly added photo (total 3)");
$sources = array_column($updatedMediaRows, 'source');
assertCondition(in_array($gallery[0], $sources, true) && in_array($gallery[2], $sources, true), "Retained photos are preserved");
assertCondition(!in_array($gallery[1], $sources, true), "Removed photo (test-interior) was deleted from database");
assertCondition(in_array($newPhoto, $sources, true), "New photo (test-drone) was successfully appended to media");

// Clean up test property
$pdo->prepare("DELETE FROM properties WHERE id = :id")->execute(['id' => $createdId]);
$pdo->prepare("DELETE FROM property_media WHERE property_id = :id")->execute(['id' => $createdId]);

// 4. Test UI template and frontend assets
$wizardHtml = file_get_contents(dirname(__DIR__) . '/app/Support/property-wizard-view.php');
assertCondition(str_contains($wizardHtml, 'name="image_files[]"'), "property-wizard-view.php includes input name='image_files[]'");
assertCondition(str_contains($wizardHtml, 'multiple'), "property-wizard-view.php input has 'multiple' attribute");
assertCondition(str_contains($wizardHtml, 'data-photo-gallery-grid'), "property-wizard-view.php has gallery grid container");
assertCondition(str_contains($wizardHtml, 'data-photo-add-more'), "property-wizard-view.php has 'Add photos' action button");
assertCondition(str_contains($wizardHtml, 'data-photo-remove-all'), "property-wizard-view.php has 'Remove all' action button");

$wizardJs = file_get_contents(dirname(__DIR__) . '/assets/js/property-wizard.js');
assertCondition(str_contains($wizardJs, 'selectedPhotoFiles'), "property-wizard.js tracks selectedPhotoFiles array");
assertCondition(str_contains($wizardJs, 'existingPhotoMedia'), "property-wizard.js tracks existingPhotoMedia array");
assertCondition(str_contains($wizardJs, 'data-gallery-make-cover'), "property-wizard.js supports 'Make Cover' selection");
assertCondition(str_contains($wizardJs, 'retained_media_ids'), "property-wizard.js serializes retained_media_ids on submit");

$detailsJs = file_get_contents(dirname(__DIR__) . '/assets/js/property-details-view.js');
assertCondition(str_contains($detailsJs, 'propertyGalleryMarkup'), "property-details-view.js exports propertyGalleryMarkup");
assertCondition(str_contains($detailsJs, 'setupPropertyGallery'), "property-details-view.js exports setupPropertyGallery");
assertCondition(str_contains($detailsJs, 'data-property-gallery'), "property-details-view.js renders data-property-gallery");

$detailsCss = file_get_contents(dirname(__DIR__) . '/assets/css/property-details.css');
assertCondition(str_contains($detailsCss, '.property-gallery-container'), "property-details.css styles .property-gallery-container");
assertCondition(str_contains($detailsCss, '.property-gallery-thumbnails'), "property-details.css styles .property-gallery-thumbnails");

echo "\nVerification Summary: {$passCount}/{$totalTests} tests passed successfully!\n";
if ($passCount === $totalTests) {
    exit(0);
} else {
    exit(1);
}
