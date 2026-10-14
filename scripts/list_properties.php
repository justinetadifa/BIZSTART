<?php
require __DIR__ . '/../app/Support/web.php';
$container = sfc_app_container();
$prop = $container['properties']->find(115, null);
$decorated = $container['decisionEngine']->decorateProperty($prop);
$decorated = $container['clup']->decorateProperty($decorated);

echo "NAME: " . $decorated['name'] . "\n";
echo "PURPOSE: " . $decorated['listingPurpose'] . "\n";
echo "PRICE: " . json_encode($decorated['price']) . "\n";
echo "LEASE PRICE: " . json_encode($decorated['leasePrice']) . "\n";
echo "LEASE PERIOD: " . json_encode($decorated['leasePeriod']) . "\n";
echo "LEASE PRICE UNIT: " . json_encode($decorated['leasePriceUnit']) . "\n";
echo "AREA: " . json_encode($decorated['area']) . "\n";
echo "LAND AREA: " . json_encode($decorated['landArea']) . "\n";
echo "PARCEL SURVEY AREA: " . json_encode($decorated['parcel']['surveyAreaSqm'] ?? null) . "\n";
echo "PARCEL OFFERED AREA: " . json_encode($decorated['parcel']['observations']['offered_area_sqm'] ?? null) . "\n";
echo "FLOOR AREA: " . json_encode($decorated['floorArea'] ?? null) . "\n";
echo "BUILDING AREA: " . json_encode($decorated['buildingArea'] ?? null) . "\n";
echo "ZONING: " . json_encode($decorated['clupProfile'] ?? null) . "\n";
echo "AUTOMATIC ASSESSMENT: " . json_encode($decorated['automaticAssessment'] ?? null, JSON_PRETTY_PRINT) . "\n";

