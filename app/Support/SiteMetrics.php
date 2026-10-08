<?php
declare(strict_types=1);

namespace App\Support;

use PDO;

final class SiteMetrics
{
    public static function recordVisit(PDO $pdo): void
    {
        \sfc_start_session();
        $lastVisit = (int) ($_SESSION['sfc_site_visit_at'] ?? 0);
        if ($lastVisit > time() - 1800) {
            return;
        }
        $pdo->exec("INSERT INTO site_metrics (metric, value) VALUES ('visits', 1) ON DUPLICATE KEY UPDATE value = value + 1");
        $_SESSION['sfc_site_visit_at'] = time();
    }

    public static function summary(PDO $pdo): array
    {
        $row = $pdo->query("SELECT COUNT(*) AS available_properties, COALESCE(SUM(area), 0) AS available_area FROM properties WHERE deleted_at IS NULL AND approval_state = 'approved' AND LOWER(status) IN ('available', 'active', 'open')")->fetch();
        $visits = $pdo->query("SELECT value FROM site_metrics WHERE metric = 'visits'")->fetchColumn();
        return [
            'availableProperties' => (int) $row['available_properties'],
            'availableAreaHa' => round((float) $row['available_area'], 4),
            'siteVisits' => (int) ($visits ?: 0),
        ];
    }
}
