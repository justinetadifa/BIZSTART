<?php
declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

require_once __DIR__ . '/InvestmentSearch.php';
require_once __DIR__ . '/InvestmentAssistantInterpreter.php';

/** Server-owned rules and fixed templates populated with authorized listing facts. */
final class InvestmentAssistant
{
    public const WELCOME = 'Explore published properties through guided search. Choose buy or lease, a property type, a San Fernando barangay, a budget, or a land-area range.';
    public const MISSING = 'This information is not available in the current listing.';
    public const ZERO_RESULTS = 'No published properties match your current filters.';

    public static function initial(): array
    {
        return ['criteria' => InvestmentSearch::EMPTY_CRITERIA, 'version' => 0, 'messages' => [], 'pending' => 'purpose', 'intent' => 'search', 'lastResultIds' => [], 'mode' => 'rules', 'notice' => '', 'message' => self::WELCOME, 'updatedAt' => time()];
    }

    public static function interpret(array $state, array $input): array
    {
        $next = $state;
        $next['notice'] = '';
        $next['intent'] = 'search';
        $next['mode'] = 'rules';
        $next['question'] = null;
        $next['pending'] = null;
        unset($next['message'], $next['compareIds'], $next['detail']);
        if (($input['reset'] ?? false) === true) {
            $next = self::initial();
            $next['version'] = $state['version'];
            return $next;
        }
        if (isset($input['filters'])) {
            if (!is_array($input['filters']) || ($input['filters'] !== [] && array_keys($input['filters']) === range(0, count($input['filters']) - 1))) throw new InvalidArgumentException('Search filters must be an object.');
            $next['criteria'] = InvestmentSearch::normalizeCriteria($input['filters']);
            $next['messages'][] = ['role' => 'user', 'content' => 'Updated my search filters.'];
        } else {
            $message = $input['message'] ?? null;
            if (!is_string($message) || trim($message) === '' || mb_strlen($message) > 2000 || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u', $message)) throw new InvalidArgumentException('Enter a message between 1 and 2,000 characters.');
            $message = trim($message);
            $next['messages'][] = ['role' => 'user', 'content' => $message];
            $parsed = InvestmentAssistantInterpreter::parse($message, $state['criteria'], $state['pending'] ?? null);
            if (array_key_exists('budget', $parsed['patch'])) $next['skipBudget'] = $parsed['patch']['budget'] === null;
            $next['intent'] = $parsed['intent'];
            if ($parsed['intent'] === 'reset') {
                $reset = self::initial();
                $reset['version'] = $state['version'];
                return $reset;
            }
            if ($parsed['intent'] === 'unsupported') {
                $next['pending'] = $state['pending'] ?? null;
                $next['message'] = 'I can search published properties by San Fernando barangay, property type, sale or lease, budget, and land area, and show recorded listing details and assessments. Choose a supported option below. Business keywords do not establish suitability, zoning permission, hazard safety, availability, or investment returns.';
                return $next;
            }
            if ($parsed['intent'] === 'help') {
                $next['pending'] = $state['pending'] ?? null;
                $next['message'] = 'Search examples: Buy a commercial lot in Biday; PHP 5 million total purchase price; Lease under PHP 300 per sqm per month; At least 500 sqm; Between 500 and 1000 sqm; All barangays; No budget limit. For recorded facts, choose Show listing details. Type Reset to clear your search.';
                return $next;
            }
            if ($parsed['intent'] === 'detail') {
                $next['pending'] = 'detailProperty';
                $next['detail'] = $parsed['detail'];
                if (empty($next['detail']['fields']) && !empty($state['detail']['fields'])) $next['detail']['fields'] = $state['detail']['fields'];
                return $next;
            }
            if ($parsed['intent'] === 'compare') {
                $next['pending'] = $state['pending'] ?? null;
                $ids = $state['lastResultIds'] ?? [];
                if (count($ids) === 2 || (count($ids) >= 2 && preg_match('/first\s+(?:two|2)|(?:1|one)\s+(?:and|&)\s+(?:2|two)/iu', $message))) {
                    $next['compareIds'] = array_slice($ids, 0, 2);
                    $next['message'] = 'These two are ready for the existing comparison view. Compare their asking prices, recorded evidence and assessment gaps side by side.';
                } else {
                    $next['question'] = 'Which two would you like to compare? Select Compare on two result cards, or ask for the first two shown.';
                    $next['message'] = $next['question'];
                }
                return $next;
            }
            // A conflicting or unclear request never silently applies only one interpretation.
            if (!$parsed['unclear']) {
                try {
                    $next['criteria'] = InvestmentSearch::normalizeCriteria(array_replace($state['criteria'], $parsed['patch']));
                } catch (InvalidArgumentException) {
                    $parsed['unclear'] = true;
                }
            }
            if ($parsed['unclear']) {
                if (preg_match('/\b(?:lower|reduce|decrease|cheaper)\b.*\bbudget\b/iu', $message)) {
                    $next['pending'] = 'budget';
                    $next['question'] = 'What maximum budget would you like to use instead? Your current limit stays in place until you choose a new amount.';
                } else {
                    $next['question'] = 'Please choose one property type, one San Fernando barangay, a budget with its price basis, or a valid land-area range. Your current filters are unchanged.';
                }
            }
        }
        $c = $next['criteria'];
        if ($next['question'] === null) {
            if ($c['budget'] !== null && $c['budgetBasis'] === null) {
                $next['pending'] = 'budgetBasis';
                $next['question'] = 'Is that a total purchase price or rent? For rent, choose the period and total or per-square-metre basis.';
            } elseif ($c['activity'] !== null && $c['category'] === null) {
                $next['pending'] = 'propertyType';
                $next['question'] = 'Are you looking for a lot to build on, or an existing building or space?';
            } elseif ($c['purpose'] === null) {
                $next['pending'] = 'purpose';
                $next['question'] = 'Would you prefer to buy or lease the property?';
            } elseif ($c['budget'] === null && empty($next['skipBudget'])) {
                $next['pending'] = 'budget';
                $next['question'] = $c['purpose'] === 'sale' ? 'What is your maximum purchase budget in pesos? You can also continue without a budget limit.' : 'What is your maximum rental budget, including its period and total or per-square-metre basis? You can also continue without a budget limit.';
            }
        }
        return $next;
    }

    public static function response(array &$state, array $search, array $savedIds): array
    {
        $cards = $search['results'];
        foreach ($cards as &$card) $card['saved'] = in_array($card['id'], $savedIds, true);
        unset($card);
        $total = (int) $search['total'];
        $message = $state['message'] ?? null;
        if (($state['intent'] ?? '') === 'detail') $message = self::detailResponse($state, $cards);
        if ($message === null) {
            $message = $total === 0 ? self::ZERO_RESULTS . ' Adjust a filter below or clear all filters.'
                : $total . ($total === 1 ? ' published property matches' : ' published properties match') . ' your current filters.';
            if ($state['criteria']['activity'] !== null) $message .= ' Business keywords are search context only; they do not verify permission or suitability.';
            if ($state['criteria']['budget'] !== null && $state['criteria']['budgetBasis'] === null) $message .= ' Your budget has not been applied because its price basis needs confirming.';
            if (!empty($state['question'])) $message .= ' ' . $state['question'];
        } elseif ($total === 0 && !str_contains($message, self::ZERO_RESULTS)) {
            $message .= ' ' . self::ZERO_RESULTS . ' Adjust a filter below or clear all filters.';
        }
        $state['lastResultIds'] = array_column($cards, 'id');
        $compare = array_values(array_intersect($state['compareIds'] ?? [], $state['lastResultIds']));
        $public = ['criteria' => $state['criteria'], 'version' => $state['version'], 'messages' => array_slice($state['messages'], -16)];
        return ['ok' => true, 'mode' => 'rules', 'options' => InvestmentSearch::options(), 'state' => $public,
            'results' => $cards, 'total' => $total, 'publishedTotal' => $search['publishedTotal'] ?? 0, 'message' => $message,
            'question' => $state['question'] ?? null, 'pending' => $state['pending'] ?? null, 'guidance' => self::guidance($state, $cards),
            'suggestions' => $search['suggestions'] ?? [], 'limitations' => $search['limitations'] ?? [],
            'notice' => $state['notice'] ?? '', 'compareIds' => count($compare) === 2 ? $compare : []];
    }

    private static function detailResponse(array &$state, array $cards): string
    {
        $request = $state['detail'] ?? [];
        $selected = [];
        foreach ($cards as $index => $card) {
            if ((isset($request['id']) && (int) $request['id'] === (int) $card['id'])
                || (isset($request['ordinal']) && (int) $request['ordinal'] === $index + 1)
                || (!empty($request['name']) && mb_strtolower(trim((string) $card['name'])) === mb_strtolower(trim($request['name'])))) $selected[] = $card;
        }
        if (!$selected && !isset($request['id']) && !isset($request['ordinal']) && empty($request['name']) && count($cards) === 1) $selected = $cards;
        if (count($selected) !== 1) {
            $state['pending'] = 'detailProperty';
            $state['question'] = 'Which property shown below would you like details for? Choose Show listing details on a card, or type its listing name or property ID.';
            return $state['question'];
        }
        $card = $selected[0];
        $state['pending'] = null;
        $state['question'] = null;
        $fields = ($request['fields'] ?? []) ?: ['price', 'location', 'type', 'purpose', 'area', 'amenities', 'availability', 'assessment', 'verification'];
        $labels = ['price' => 'Price', 'salePrice' => 'Sale price', 'leasePrice' => 'Lease price', 'location' => 'Location', 'type' => 'Property type', 'purpose' => 'Sale or lease', 'area' => 'Land area', 'amenities' => 'Amenities', 'parking' => 'Recorded parking', 'water' => 'Recorded water', 'electricity' => 'Recorded electricity', 'availability' => 'Recorded availability', 'zoning' => 'Recorded zoning', 'hazards' => 'Recorded hazard findings', 'assessment' => 'Recorded assessment', 'verification' => 'Verification'];
        $lines = [(string) $card['name'] . '.'];
        foreach ($fields as $field) $lines[] = ($labels[$field] ?? $field) . ': ' . ($card['details'][$field] ?? self::MISSING);
        foreach (['price', 'location', 'area', 'amenities'] as $field) {
            $value = $card['details'][$field] ?? self::MISSING;
            if (!in_array($field, $fields, true) && $value !== self::MISSING) $lines[] = $labels[$field] . ': ' . $value;
        }
        return implode(' ', $lines);
    }

    private static function guidance(array $state, array $cards): array
    {
        if (($state['pending'] ?? null) === 'detailProperty') return array_map(static fn (array $card): array => ['label' => $card['name'], 'message' => 'Show details for property ' . $card['id']], array_slice($cards, 0, 4));
        $items = match ($state['pending'] ?? null) {
            'purpose' => [['Buy a property', 'Buy a property'], ['Lease a space', 'Lease a space'], ['Sale or lease', 'Sale or lease']],
            'propertyType' => [['Land or lot', 'Find land'], ['Building or space', 'Find an existing building']],
            'budgetBasis' => [['Total purchase price', 'Total purchase price'], ['Purchase price per m²', 'Purchase price per sqm'], ['Total monthly rent', 'Total rent per month'], ['Monthly rent per m²', 'Rent per sqm per month'], ['Total yearly rent', 'Total rent per year'], ['Total daily rent', 'Total rent per day']],
            'budget' => [['Continue without a budget', 'No budget limit'], ['All barangays', 'All barangays'], ['Land-area filter', 'How do I filter land area?']],
            default => [['Buy a property', 'Buy a property'], ['Lease a space', 'Lease a space'], ['Commercial lots', 'Find commercial lots'], ['Search all barangays', 'All barangays']],
        };
        return array_map(static fn (array $item): array => ['label' => $item[0], 'message' => $item[1]], $items);
    }
}
