<?php
declare(strict_types=1);

namespace App\Core;

use PDO;

require_once __DIR__ . '/SchemaManager.php';

final class V2SchemaManager
{
    public static function ensure(PDO $pdo): void
    {
        // 1. Properties columns
        if (SchemaManager::tableExists($pdo, 'properties')) {
            $cols = [
                'structured_facts_json' => 'LONGTEXT NULL',
                'v2_assessment_json' => 'LONGTEXT NULL',
                'v2_eligibility_status' => "VARCHAR(50) NULL DEFAULT NULL",
                'v2_iai_score' => 'DECIMAL(5,2) NULL DEFAULT NULL',
            ];
            foreach ($cols as $col => $def) {
                if (!SchemaManager::columnExists($pdo, 'properties', $col)) {
                    $pdo->exec("ALTER TABLE properties ADD COLUMN {$col} {$def}");
                }
            }
        }

        // 2. Tables
        foreach (self::tableStatements() as $sql) {
            $pdo->exec($sql);
        }

        // 3. Seed default V2 scoring configurations (marked as draft / unvalidated)
        self::ensureDefaultConfigurations($pdo);
    }

    public static function tableStatements(): array
    {
        return [
            <<<'SQL'
CREATE TABLE IF NOT EXISTS investor_project_profiles (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(190) NOT NULL,
  intended_business VARCHAR(120) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL DEFAULT 'lease',
  total_setup_budget BIGINT NOT NULL DEFAULT 0,
  required_usable_area DECIMAL(12, 4) NOT NULL DEFAULT 0,
  opening_timeline VARCHAR(40) NOT NULL DEFAULT '3_to_6_months',
  essential_operational_requirements JSON NULL,
  preferred_barangays JSON NULL,
  notes TEXT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_project_profiles_user (user_id),
  CONSTRAINT fk_project_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
            <<<'SQL'
CREATE TABLE IF NOT EXISTS v2_scoring_configurations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scenario_key VARCHAR(80) NOT NULL UNIQUE,
  scenario_name VARCHAR(140) NOT NULL,
  business_type VARCHAR(120) NOT NULL,
  description TEXT NULL,
  weights_json JSON NOT NULL,
  rules_json JSON NOT NULL,
  mandatory_requirements_json JSON NOT NULL,
  validation_status VARCHAR(30) NOT NULL DEFAULT 'draft',
  validation_reference VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by_user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_v2_scoring_scenario (scenario_key),
  KEY idx_v2_scoring_status (validation_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL,
            <<<'SQL'
CREATE TABLE IF NOT EXISTS property_assessment_versions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  assessment_version VARCHAR(20) NOT NULL,
  scenario_key VARCHAR(80) NOT NULL DEFAULT 'default',
  project_profile_id INT NULL,
  eligibility_status VARCHAR(50) NOT NULL,
  non_negotiable_results_json JSON NULL,
  mce_score DECIMAL(5,2) NULL,
  iai_score DECIMAL(5,2) NULL,
  evidence_coverage_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  strengths_json JSON NULL,
  tradeoffs_json JSON NULL,
  unresolved_checks_json JSON NULL,
  next_actions_json JSON NULL,
  score_breakdown_json JSON NULL,
  validation_status VARCHAR(30) NOT NULL DEFAULT 'draft',
  is_authoritative TINYINT(1) NOT NULL DEFAULT 0,
  assessed_by_user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pav_prop_ver (property_id, assessment_version),
  KEY idx_pav_profile (project_profile_id),
  CONSTRAINT fk_pav_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_pav_profile FOREIGN KEY (project_profile_id) REFERENCES investor_project_profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL
        ];
    }

    private static function ensureDefaultConfigurations(PDO $pdo): void
    {
        if (!SchemaManager::tableExists($pdo, 'v2_scoring_configurations')) {
            return;
        }

        $check = (int) $pdo->query('SELECT COUNT(*) FROM v2_scoring_configurations')->fetchColumn();
        if ($check > 0) {
            return;
        }

        $defaults = [
            [
                'scenario_key' => 'cafe_restaurant',
                'scenario_name' => 'Café & Restaurant',
                'business_type' => 'Food & Beverage',
                'description' => 'Commercial food service and specialty dining requiring strong pedestrian access, water reliability, grease trap/drainage capacity, and complementary anchors.',
                'weights_json' => json_encode([
                    'access' => 20,
                    'utilities' => 25,
                    'market_context' => 25,
                    'physical_suitability' => 15,
                    'hazards' => 10,
                    'setup_costs' => 5,
                ]),
                'rules_json' => json_encode([
                    'min_frontage_m' => 6.0,
                    'min_water_pressure_psi' => 20.0,
                    'preferred_traffic' => ['high_corridor', 'moderate_commercial'],
                ]),
                'mandatory_requirements_json' => json_encode([
                    'water_connection',
                    'permitted_zoning',
                    'outside_high_flood',
                    'fault_setback_safe',
                ]),
                'validation_status' => 'draft',
                'validation_reference' => 'Unvalidated operational draft — pending CPDO / LEBDO empirical validation',
            ],
            [
                'scenario_key' => 'retail_convenience',
                'scenario_name' => 'Retail & Convenience Store',
                'business_type' => 'Retail',
                'description' => 'Everyday consumer retail with high foot traffic requirement, roadside visibility, quick customer turnover, and moderate utility needs.',
                'weights_json' => json_encode([
                    'access' => 25,
                    'utilities' => 15,
                    'market_context' => 30,
                    'physical_suitability' => 15,
                    'hazards' => 10,
                    'setup_costs' => 5,
                ]),
                'rules_json' => json_encode([
                    'min_frontage_m' => 8.0,
                    'preferred_traffic' => ['high_corridor', 'moderate_commercial'],
                ]),
                'mandatory_requirements_json' => json_encode([
                    'permitted_zoning',
                    'outside_high_flood',
                    'fault_setback_safe',
                ]),
                'validation_status' => 'draft',
                'validation_reference' => 'Unvalidated operational draft — pending commercial census calibration',
            ],
            [
                'scenario_key' => 'office_bpo',
                'scenario_name' => 'Office & BPO / IT Services',
                'business_type' => 'Office / IT',
                'description' => 'Professional knowledge work and technology operations requiring dual-path fiber internet, 3-phase reliable power, transit proximity, and sound building condition.',
                'weights_json' => json_encode([
                    'access' => 20,
                    'utilities' => 30,
                    'market_context' => 15,
                    'physical_suitability' => 20,
                    'hazards' => 10,
                    'setup_costs' => 5,
                ]),
                'rules_json' => json_encode([
                    'power_phase' => 'three_phase',
                    'telecom_fiber' => true,
                ]),
                'mandatory_requirements_json' => json_encode([
                    'telecom_fiber',
                    'permitted_zoning',
                    'outside_high_flood',
                    'fault_setback_safe',
                ]),
                'validation_status' => 'draft',
                'validation_reference' => 'Unvalidated operational draft — pending CICTO / ICT council verification',
            ],
            [
                'scenario_key' => 'logistics_warehouse',
                'scenario_name' => 'Warehousing & Logistics Distribution',
                'business_type' => 'Industrial / Logistics',
                'description' => 'Storage and freight logistics hub requiring heavy vehicle access (40ft trucks), wide right-of-way, large usable footprint, minimal slope, and 3-phase power.',
                'weights_json' => json_encode([
                    'access' => 35,
                    'utilities' => 20,
                    'market_context' => 10,
                    'physical_suitability' => 20,
                    'hazards' => 10,
                    'setup_costs' => 5,
                ]),
                'rules_json' => json_encode([
                    'heavy_vehicle_access' => true,
                    'min_row_width_m' => 10.0,
                    'max_slope_pct' => 8.0,
                ]),
                'mandatory_requirements_json' => json_encode([
                    'heavy_vehicle_access',
                    'permitted_zoning',
                    'outside_high_flood',
                    'fault_setback_safe',
                ]),
                'validation_status' => 'draft',
                'validation_reference' => 'Unvalidated operational draft — pending DPWH / City Engineering traffic study',
            ],
            [
                'scenario_key' => 'hospitality_tourism',
                'scenario_name' => 'Hotel, Resort & Hospitality',
                'business_type' => 'Hospitality',
                'description' => 'Accommodations and tourism establishments requiring scenic context or city center accessibility, high utility capacity, clean title, and natural hazard resilience.',
                'weights_json' => json_encode([
                    'access' => 20,
                    'utilities' => 20,
                    'market_context' => 20,
                    'physical_suitability' => 20,
                    'hazards' => 15,
                    'setup_costs' => 5,
                ]),
                'rules_json' => json_encode([
                    'water_connection' => true,
                    'power_connection' => true,
                ]),
                'mandatory_requirements_json' => json_encode([
                    'water_connection',
                    'permitted_zoning',
                    'outside_high_flood',
                    'fault_setback_safe',
                    'clean_title',
                ]),
                'validation_status' => 'draft',
                'validation_reference' => 'Unvalidated operational draft — pending City Tourism Office review',
            ],
            [
                'scenario_key' => 'general_commercial',
                'scenario_name' => 'General Commercial Use',
                'business_type' => 'Commercial',
                'description' => 'Baseline balanced commercial property evaluation for diverse business ventures.',
                'weights_json' => json_encode([
                    'access' => 20,
                    'utilities' => 20,
                    'market_context' => 20,
                    'physical_suitability' => 15,
                    'hazards' => 15,
                    'setup_costs' => 10,
                ]),
                'rules_json' => json_encode([]),
                'mandatory_requirements_json' => json_encode([
                    'permitted_zoning',
                    'outside_high_flood',
                    'fault_setback_safe',
                ]),
                'validation_status' => 'draft',
                'validation_reference' => 'Unvalidated operational draft — baseline scenario awaiting municipal panel adoption',
            ],
        ];

        $stmt = $pdo->prepare(
            'INSERT INTO v2_scoring_configurations
            (scenario_key, scenario_name, business_type, description, weights_json, rules_json, mandatory_requirements_json, validation_status, validation_reference, is_active)
            VALUES (:scenario_key, :scenario_name, :business_type, :description, :weights_json, :rules_json, :mandatory_requirements_json, :validation_status, :validation_reference, 1)'
        );

        foreach ($defaults as $row) {
            $stmt->execute($row);
        }
    }
}

