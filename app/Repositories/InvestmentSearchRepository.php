<?php
declare(strict_types=1);

namespace App\Repositories;

use App\Support\InvestmentSearch;
use DomainException;
use PDO;

require_once dirname(__DIR__) . '/Support/InvestmentSearch.php';

/** SQL publication gate plus validated exact matching against the normal property presentation. */
final class InvestmentSearchRepository
{
    public function __construct(private PDO $pdo, private PropertyRepository $properties) {}

    public function search(array $criteria, array $user, int $limit = 6): array
    {
        if (($user['role'] ?? '') !== 'investor' || (int) ($user['id'] ?? 0) < 1) {
            throw new DomainException('An investor account is required to search with the investment assistant.');
        }
        $criteria = InvestmentSearch::normalizeCriteria($criteria);
        [$sql, $params] = self::candidateQuery($criteria);
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        $ids = array_map('intval', $statement->fetchAll(PDO::FETCH_COLUMN));
        // Hydrate once through the existing assessment/media/evidence logic. Never use seed JSON,
        // legacy scores, private records, or a model-generated ranking as a search fallback.
        $published = $this->properties->all($user);
        return InvestmentSearch::summarize($published, $criteria, $limit, $ids);
    }

    /** SQL is fixed code; every user-controlled predicate is a bound scalar. No LIMIT before exact matching. */
    public static function candidateQuery(array $criteria): array
    {
        $criteria = InvestmentSearch::normalizeCriteria($criteria);
        // Identical investor publication policy to PropertyRepository::visibilityCondition.
        $sql = "SELECT p.id FROM properties p LEFT JOIN users seller ON seller.id = p.seller_user_id
            WHERE p.deleted_at IS NULL AND p.archived_at IS NULL AND p.approval_state = 'approved'
            AND LOWER(p.status) IN ('available', 'active', 'open')
            AND (p.seller_user_id IS NULL OR (seller.identity_verification_status = 'verified'
                AND JSON_UNQUOTE(JSON_EXTRACT(p.documents_json, '$.authority_to_sell.status')) = 'validated'))";
        $params = [];
        if ($criteria['category'] !== null) {
            // Older rows may have aliases or no category. The canonical repository presentation
            // resolves these; excluding them in SQL would silently lose legitimate listings.
            $sql .= " AND (TRIM(p.category) = :category OR p.category IS NULL OR TRIM(p.category) NOT IN ('Land', 'Building'))";
            $params['category'] = $criteria['category'];
        }
        if ($criteria['purpose'] !== null) {
            $sql .= " AND p.listing_purpose IN (:purpose, 'sale_or_lease')";
            $params['purpose'] = $criteria['purpose'];
        }
        if ($criteria['barangay'] !== null) {
            $sql .= ' AND LOWER(TRIM(p.barangay)) = LOWER(:barangay)';
            $params['barangay'] = $criteria['barangay'];
        }
        if ($criteria['budget'] !== null && $criteria['budgetBasis'] === 'sale_total') {
            $sql .= ' AND p.price IS NOT NULL AND p.price > 0 AND p.price <= :budget';
            $params['budget'] = $criteria['budget'];
        }
        // Composite subtypes, survey-area precedence and compatible rent normalization are
        // evaluated exactly by InvestmentSearch against hydrated facts, not approximated here.
        return [$sql . ' ORDER BY p.created_at DESC, p.id DESC', $params];
    }
}
