<?php
declare(strict_types=1);

namespace App\Support;

require_once __DIR__ . '/PropertyCatalog.php';

/** Defined keyword and numeric parsing rules; no external interpretation or generated prose. */
final class InvestmentAssistantInterpreter
{
    public static function parse(string $message, array $criteria, ?string $pending = null): array
    {
        $text = str_replace(['–', '—', 'm²'], ['-', '-', 'sqm'], mb_strtolower(trim($message)));
        $patch = [];
        $unclear = false;
        $compare = (bool) preg_match('/\bcompar(?:e|ing|ison)\b/u', $text);
        $unsupported = (bool) preg_match('/\b(weather|president|recipes?|poems?|stocks?|bitcoin|guarantee|guaranteed|roi|profits?|flood.free|hazard.free|flood.safe|hazard.safe|safe from|zoning approv\w*|permits?|ignore.*instructions?|system prompts?|api keys?|sql|delete database)\b/u', $text);
        if (preg_match('/\b(?:recommend\w*|best investment|investment returns?|business suitab\w*|suitable for|safe to|safe for|zoning permission|can i (?:open|build|operate))\b/u', $text)) $unsupported = true;
        if ($unsupported) return ['patch' => [], 'intent' => 'unsupported', 'unclear' => false];
        if (preg_match('/^(?:reset|clear (?:all )?filters|start (?:over|again)|new conversation)[.!]?$/u', $text)) return ['patch' => [], 'intent' => 'reset', 'unclear' => false];
        if (preg_match('/^(?:help|what can you (?:search|do)|how (?:do i|to) (?:search|filter|use))\b/u', $text)) return ['patch' => [], 'intent' => 'help', 'unclear' => false];
        $selector = [];
        if (preg_match('/\b(?:property|listing)\s*#?\s*(\d+)\b/u', $text, $m)) $selector['id'] = (int) $m[1];
        elseif ($pending === 'detailProperty' && preg_match('/^#?\s*(\d+)$/u', $text, $m)) $selector['id'] = (int) $m[1];
        elseif (preg_match('/\b(first|second|third|fourth|fifth|sixth)(?:\s+(?:one|property|listing))?\b/u', $text, $m)) $selector['ordinal'] = array_search($m[1], ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'], true) + 1;
        $fields = [];
        foreach (['price' => '/\b(?:price|cost|rent|pricing)\b/u', 'location' => '/\b(?:location|address|where)\b/u', 'type' => '/\b(?:type|category)\b/u', 'purpose' => '/\b(?:sale|lease)\b/u', 'area' => '/\b(?:area|size|sqm|hectares?)\b/u', 'amenities' => '/\b(?:amenities|facilities|features|parking|utilities|water|electricity)\b/u', 'availability' => '/\b(?:availability|available|vacant)\b/u', 'zoning' => '/\b(?:zoning|zoned|clup)\b/u', 'hazards' => '/\b(?:hazard|hazards|flood|landslide)\b/u', 'assessment' => '/\b(?:assessment|assessments|iai|mce|score|scores)\b/u', 'verification' => '/\b(?:verified|verification|validated|evidence)\b/u'] as $field => $pattern) if (preg_match($pattern, $text)) $fields[] = $field;
        foreach (['parking', 'water', 'electricity', 'internet', 'pool', 'elevator', 'bedrooms', 'bathrooms'] as $feature) {
            if (preg_match('/\b' . $feature . '\b/u', $text)) { $fields = array_values(array_diff($fields, ['amenities'])); $fields[] = $feature; }
        }
        if (in_array('price', $fields, true) && preg_match('/\b(?:sale|purchase|lease|rent|rental)\b/u', $text)) {
            $fields = array_values(array_diff($fields, ['price']));
            $fields[] = preg_match('/\b(?:sale|purchase)\b/u', $text) ? 'salePrice' : 'leasePrice';
        }
        $genericDetail = preg_match('/\bdetails\b/u', $text) || preg_match('/^(?:(?:show|view|select|tell me about)\s+)?(?:(?:property|listing)\s*#?\s*\d+|(?:the\s+)?(?:first|second|third|fourth|fifth|sixth)(?:\s+(?:one|property|listing))?|#?\d+)[.!?]?$/u', $text);
        if ($selector && !$fields && !$genericDetail && !$compare) return ['patch' => [], 'intent' => 'unsupported', 'unclear' => false];
        $searchEscape = preg_match('/\b(?:buy|lease|rent|find|search|under|budget|at least|only in|all barangays|any type)\b/u', $text) && !$selector && !preg_match('/\b(?:details|amenities|facilities|availability|zoning|hazards?|iai|mce|assessment|verification)\b/u', $text);
        $detail = !$compare && (preg_match('/\b(?:details|amenities|facilities|availability|zoning|hazards?|iai|mce|assessment|verification)\b/u', $text)
            || $selector || ($fields && (preg_match('/^(?:what|where|does|is|are|how much)\b/u', $text)
                || preg_match('/^(?:(?:show|tell me)\s+)?(?:price|cost|rent|location|area|size|parking|water|electricity|internet|pool|elevator|bedrooms|bathrooms)\b.*\b(?:for|of|about)\b/u', $text)))
            || ($pending === 'detailProperty' && !$searchEscape));
        if ($detail) {
            if (!$selector && preg_match('/\b(?:for|of|about)\s+(?:the\s+)?(.+?)[?.!]?$/u', $text, $m)) $selector['name'] = trim($m[1]);
            elseif (!$selector && $pending === 'detailProperty' && !preg_match('/\b(?:details|price|amenities|area|assessment)\b/u', $text)) $selector['name'] = trim($text, ' .?!');
            return ['patch' => [], 'intent' => 'detail', 'unclear' => false, 'detail' => array_merge($selector, ['fields' => $fields])];
        }
        if ((preg_match('/\b(?:commercial|residential|industrial)\b[^.!?]{0,30}\b(?:or|and)\b[^.!?]{0,30}\b(?:commercial|residential|industrial)\b/u', $text))
            || (preg_match('/\b(?:buy|sale)\b[^.!?]{0,30}\band\b[^.!?]{0,30}\b(?:lease|rent)\b/u', $text))
            || (preg_match('/\bbudget\b[^.!?]{0,20}\bbetween\b|\bbetween\b[^.!?]{0,30}\b(?:php|pesos?|million|budget)\b/u', $text))) return ['patch' => [], 'intent' => 'search', 'unclear' => true];
        // Exclusion filters are not supported. Never turn a negative preference into its opposite.
        if (preg_match('/\b(?:not|don[’\']t|exclude|except|outside|avoid|without)\b[^.!?]{0,45}\b(?:in|near|lands?|lots?|commercial|residential|industrial|buildings?|office|warehouse|sale|lease|buy|rent)\b/u', $text)) {
            return ['patch' => [], 'intent' => $unsupported ? 'unsupported' : 'search', 'unclear' => !$unsupported];
        }
        $typePatterns = [
            '/\bcommercial\s+(?:lots?|land)\b/u' => ['Land', 'Commercial Lot'],
            '/\bresidential\s+(?:lots?|land)\b/u' => ['Land', 'Residential Lot'],
            '/\bindustrial\s+(?:lots?|land)\b/u' => ['Land', 'Industrial Lot'],
            '/\bagricultur(?:al|e)\b/u' => ['Land', 'Agricultural'],
            '/\braw land\b/u' => ['Land', 'Raw Land'],
            '/\b(?:retail|storefront)\s*(?:space|building)?\b/u' => ['Building', 'Retail / Storefront'],
            '/\bshop\s+(?:space|building)\b/u' => ['Building', 'Retail / Storefront'],
            '/\boffice\b/u' => ['Building', 'Office'],
            '/\bwarehouse\b/u' => ['Building', 'Industrial / Warehouse'],
            '/\bcommercial\s+(?:spaces?|buildings?)\b/u' => ['Building', 'Commercial'],
            '/\b(?:residential\s+(?:buildings?|spaces?)|houses?)\b/u' => ['Building', 'Residential'],
            '/\bmixed[ -]use\b/u' => ['Building', 'Mixed-Use'],
            '/\bapartment\s+buildings?\b/u' => ['Building', 'Apartment Building'],
            '/\b(?:hospitality|tourism|hotels?)\b/u' => ['Building', 'Hospitality / Tourism'],
            '/\b(?:existing space|building|built space)\b/u' => ['Building', null],
            '/\b(?:lots?|land)\b/u' => ['Land', null],
        ];
        foreach ($typePatterns as $pattern => [$category, $subcategory]) {
            if (preg_match($pattern, $text)) { $patch['category'] = $category; $patch['subcategory'] = $subcategory; break; }
        }
        if (preg_match('/\b(?:caf[eé]|coffee shop)\b/u', $text)) $patch['activity'] = 'Café';
        elseif (preg_match('/\b(?:open|build|start)\s+(?:a |an |my )?(.{2,65}?)(?:\s+(?:in|under|with|for)\b|[.!?]|$)/u', $text, $m)) $patch['activity'] = trim($m[1]);
        if (preg_match('/\b(?:buy|buying|purchase|purchasing|sale)\b/u', $text)) $patch['purpose'] = 'sale';
        elseif (preg_match('/\b(?:lease|leasing|rent|renting|rental)\b/u', $text)) $patch['purpose'] = 'lease';
        if (isset($patch['purpose']) && ($criteria['purpose'] ?? null) !== $patch['purpose'] && ($criteria['purpose'] ?? null) !== null) $patch['budgetBasis'] = null;
        $locationFound = false;
        $locations = [];
        foreach (array_keys(PropertyCatalog::barangays()) as $barangay) {
            if (preg_match('/(?<![\pL\pN])' . preg_quote(mb_strtolower($barangay), '/') . '(?![\pL\pN])/u', $text)) { $locations[] = $barangay; }
        }
        if (count($locations) === 1) {
            if (preg_match('/\b(?:not|exclude|except|outside|avoid)\b[^.!?]{0,30}' . preg_quote(mb_strtolower($locations[0]), '/') . '/u', $text)) {
                return ['patch' => [], 'intent' => 'search', 'unclear' => true];
            }
            $patch['barangay'] = $locations[0]; $locationFound = true;
        } elseif (count($locations) > 1) { $unclear = true; $locationFound = true; }
        if (preg_match('/\b(?:anywhere|any barangay|all barangays|remove location)\b/u', $text)) { $patch['barangay'] = null; $locationFound = true; }
        if (preg_match('/\b(?:in|near|around|or)\s+(?:manila|baguio|cebu|quezon|makati|san juan|bauang|davao|iloilo|bacolod|pasig|taguig|cavite|laguna)\b/u', $text)) $unsupported = true;
        if (!$locationFound && preg_match('/\b(?:only in|located in|in barangay|in brgy\.?)\s+\S/u', $text)) $unclear = true;
        if (!$locationFound && preg_match('/\b(?:in|near|around)\s+([\pL][\pL .-]{1,55})/u', $text, $location)
            && !preg_match('/^(?:san fernando|la union|the city|anywhere|any barangay|all barangays|mind|land|a lot|lots?|a building|buildings?|office|my budget|the budget|budget)/u', trim($location[1]))) {
            $unclear = true;
        }
        $number = '(\d[\d,]*(?:\.\d+)?)\s*(million|billion|thousand|m|k)?';
        $areaUnit = '(?:square\s*(?:meters?|metres?)|sq\.?\s*m(?:eters?)?|sqm|hectares?|ha)';
        $areaText = $text;
        $areaRanges = '/(?:\bbetween\s+)?' . $number . '\s*(' . $areaUnit . ')?\s*(?:-|to|and)\s*' . $number . '\s*(' . $areaUnit . ')\b/u';
        if (preg_match($areaRanges, $text, $range)) {
            $first = self::amount($range[1], $range[2] ?? '');
            $second = self::amount($range[4], $range[5] ?? '');
            $unitA = $range[3] ?: $range[6];
            if (preg_match('/^(?:hectares?|ha)$/u', $unitA)) $first *= 10000;
            if (preg_match('/^(?:hectares?|ha)$/u', $range[6])) $second *= 10000;
            if ($first > $second) { $unclear = true; }
            else { $patch['minArea'] = $first; $patch['maxArea'] = $second; }
            $areaText = str_replace($range[0], '', $text);
        }
        if (preg_match_all('/' . $number . '\s*(' . $areaUnit . ')\b/u', $areaText, $areas, PREG_OFFSET_CAPTURE)) {
            foreach ($areas[0] as $i => $match) {
                $value = self::amount($areas[1][$i][0], $areas[2][$i][0]);
                if (preg_match('/(?:hectares?|ha)\b/u', $match[0])) $value *= 10000;
                $before = mb_substr(substr($areaText, 0, $match[1]), -25);
                $key = preg_match('/(?:under|below|less than|maximum|max|up to)\s*$/u', $before) ? 'maxArea' : 'minArea';
                $patch[$key] = $value;
            }
            if (count($areas[0]) === 2 && preg_match('/\bbetween\b/u', $text)) { $patch['minArea'] = min($patch['minArea'] ?? INF, self::areaValue($areas, 0), self::areaValue($areas, 1)); $patch['maxArea'] = max(self::areaValue($areas, 0), self::areaValue($areas, 1)); }
        }
        $moneyText = preg_replace('/' . $number . '\s*' . $areaUnit . '\b/u', '', $areaText);
        if (preg_match('/\d[^.!?]*\b(?:or|between|and|to)\b[^.!?]*\d/u', $moneyText)) return ['patch' => [], 'intent' => 'search', 'unclear' => true];
        if (preg_match('/(?:[$€¥]|\b(?:usd|dollars?|eur|euros?|yen)\b)/u', $moneyText)) $unsupported = true;
        if (preg_match('/(?:₱\s*|php\s*|peso[s]?\s*|budget\s*(?:of|is|to|:)?\s*|under\s+|below\s+|up to\s+|maximum\s+|max\s+)' . $number . '/u', $moneyText, $m) || ($pending === 'budget' && preg_match('/^\s*' . $number . '\s*(?:(?:pesos?|total|per\s+(?:month|year|day|sqm|square\s+metres?|square\s+meters?)|monthly|yearly|annually|daily|a month|\/[ ]*(?:month|year|day|sqm))\s*)*$/u', $moneyText, $m))) {
            $patch['budget'] = self::amount($m[1], $m[2] ?? '');
        } elseif (preg_match('/\b' . $number . '\s*(?:pesos|budget)\b/u', $moneyText, $m)) $patch['budget'] = self::amount($m[1], $m[2] ?? '');
        if (preg_match('/\b(?:lower|reduce|decrease|cheaper)\b.*\bbudget\b|\blower my budget\b/u', $text) && !isset($patch['budget'])) {
            // Do not invent a new spending limit or silently lower it by an arbitrary percentage.
            $unclear = true;
        }
        $purpose = $patch['purpose'] ?? $criteria['purpose'] ?? null;
        $oldBasis = $criteria['budgetBasis'] ?? null;
        $purposeChanged = isset($patch['purpose']) && ($criteria['purpose'] ?? null) !== null && $patch['purpose'] !== $criteria['purpose'];
        $period = preg_match('/(?:\/\s*year|per year|yearly|annual)/u', $text) ? 'year' : (preg_match('/(?:\/\s*day|per day|daily)/u', $text) ? 'day' : (preg_match('/(?:\/\s*month|per month|monthly|a month)/u', $text) ? 'month' : null));
        $perSqm = (bool) preg_match('/(?:per\s+(?:sqm|m²|square)|\/\s*(?:sqm|m²)|sq\.?\s*m.*(?:per month|monthly))/u', $text);
        $explicitTotal = (bool) preg_match('/\b(?:total|whole property)\b/u', $text);
        if ($purpose === 'sale' && (isset($patch['budget']) || isset($patch['purpose']) || $perSqm || $explicitTotal)) {
            $patch['budgetBasis'] = $perSqm ? 'sale_sqm' : ($explicitTotal || $purposeChanged || !is_string($oldBasis) || !str_starts_with($oldBasis, 'sale_') ? 'sale_total' : $oldBasis);
        }
        if ($period !== null) {
            $unit = $perSqm ? 'sqm' : ($explicitTotal || $purposeChanged || !is_string($oldBasis) || !str_starts_with($oldBasis, 'lease_') ? 'total' : (str_ends_with($oldBasis, '_sqm') ? 'sqm' : 'total'));
            $patch['purpose'] = 'lease'; $patch['budgetBasis'] = 'lease_' . $period . '_' . $unit;
        } elseif ($purpose === 'lease' && ($perSqm || $explicitTotal) && is_string($oldBasis) && str_starts_with($oldBasis, 'lease_') && !$purposeChanged) {
            $oldParts = explode('_', $oldBasis);
            $patch['budgetBasis'] = 'lease_' . $oldParts[1] . '_' . ($perSqm ? 'sqm' : 'total');
        }
        if (preg_match('/\b(?:no budget limit|remove budget|any budget)\b/u', $text)) { $patch['budget'] = null; $patch['budgetBasis'] = null; }
        if (preg_match('/\b(?:any size|remove size)\b/u', $text)) { $patch['minArea'] = null; $patch['maxArea'] = null; }
        if (preg_match('/\b(?:any type|all property types)\b/u', $text)) { $patch['category'] = null; $patch['subcategory'] = null; }
        if (preg_match('/\b(?:sale or lease|buy or (?:rent|lease)|either)\b/u', $text)) { $patch['purpose'] = null; $patch['budgetBasis'] = null; }
        $browse = (bool) preg_match('/^(?:(?:find|show|search|browse|explore)(?:\s+(?:me|for|all|published|available|the))*\s+(?:properties|listings)|(?:hello|hi|properties|listings)|show properties within my budget)[.!?]?$/u', $text);
        return ['patch' => $unsupported ? [] : $patch, 'intent' => $unsupported ? 'unsupported' : ($compare ? 'compare' : (($patch === [] && !$unclear && !$browse) ? 'unsupported' : 'search')), 'unclear' => $unclear];
    }

    private static function amount(string $number, string $unit): float
    {
        return (float) str_replace(',', '', $number) * match (trim($unit)) { 'm', 'million' => 1000000, 'billion' => 1000000000, 'k', 'thousand' => 1000, default => 1 };
    }

    private static function areaValue(array $matches, int $index): float
    {
        $value = self::amount($matches[1][$index][0], $matches[2][$index][0]);
        return preg_match('/(?:hectares?|ha)\b/u', $matches[0][$index][0]) ? $value * 10000 : $value;
    }
}
