<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    $method = request_method();
    $user = sfc_current_user();
    $pdo = $container['pdo'];

    if ($method === 'GET') {
        $stmt = $pdo->query('SELECT * FROM v2_scoring_configurations WHERE is_active = 1 ORDER BY id ASC');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $scenarios = array_map(static function (array $row): array {
            return [
                'id' => (int) $row['id'],
                'scenario_key' => (string) $row['scenario_key'],
                'scenario_name' => (string) $row['scenario_name'],
                'business_type' => (string) $row['business_type'],
                'description' => $row['description'] ? (string) $row['description'] : null,
                'weights' => json_decode((string) $row['weights_json'], true) ?: [],
                'rules' => json_decode((string) $row['rules_json'], true) ?: [],
                'mandatory_requirements' => json_decode((string) $row['mandatory_requirements_json'], true) ?: [],
                'validation_status' => (string) ($row['validation_status'] ?? 'draft'),
                'validation_reference' => $row['validation_reference'] ? (string) $row['validation_reference'] : null,
                'is_authoritative' => ($row['validation_status'] ?? '') === 'validated',
                'created_at' => (string) $row['created_at'],
                'updated_at' => (string) $row['updated_at'],
            ];
        }, $rows);

        return [
            'scenarios' => $scenarios,
            'default_weights' => \App\Support\V2ScoringEngine::DEFAULT_WEIGHTS,
        ];
    }

    if ($method === 'POST' || $method === 'PUT') {
        if ($user === null || !sfc_can_manage_properties($user)) {
            return [403, ['error' => 'City department credentials required to manage scoring configurations.']];
        }

        $input = read_request_input();
        $scenarioKey = trim((string) ($input['scenario_key'] ?? ''));
        if ($scenarioKey === '') {
            throw new InvalidArgumentException('Scenario key is required.');
        }

        $weights = $input['weights'] ?? [];
        if (!is_array($weights) || empty($weights)) {
            throw new InvalidArgumentException('Valid criteria weights are required.');
        }

        $sum = array_sum(array_map('floatval', $weights));
        if (abs($sum - 100.0) > 0.1) {
            throw new InvalidArgumentException("Criteria weights must total exactly 100% (current sum: {$sum}%).");
        }

        $validationStatus = (string) ($input['validation_status'] ?? 'draft');
        if (!in_array($validationStatus, ['draft', 'provisional', 'validated'], true)) {
            $validationStatus = 'draft';
        }
        $validationRef = trim((string) ($input['validation_reference'] ?? ''));
        if ($validationStatus === 'validated' && empty($validationRef)) {
            throw new InvalidArgumentException('Authoritative validation requires an authenticated research or official ordinance reference.');
        }

        $stmt = $pdo->prepare('SELECT id FROM v2_scoring_configurations WHERE scenario_key = :k');
        $stmt->execute(['k' => $scenarioKey]);
        $existingId = $stmt->fetchColumn();

        if ($existingId) {
            $update = $pdo->prepare(
                'UPDATE v2_scoring_configurations
                SET weights_json = :weights,
                    rules_json = :rules,
                    mandatory_requirements_json = :reqs,
                    validation_status = :status,
                    validation_reference = :ref
                WHERE scenario_key = :k'
            );
            $update->execute([
                'weights' => json_encode($weights, JSON_UNESCAPED_UNICODE),
                'rules' => json_encode($input['rules'] ?? [], JSON_UNESCAPED_UNICODE),
                'reqs' => json_encode($input['mandatory_requirements'] ?? [], JSON_UNESCAPED_UNICODE),
                'status' => $validationStatus,
                'ref' => $validationRef ?: null,
                'k' => $scenarioKey,
            ]);
        } else {
            $insert = $pdo->prepare(
                'INSERT INTO v2_scoring_configurations
                (scenario_key, scenario_name, business_type, description, weights_json, rules_json, mandatory_requirements_json, validation_status, validation_reference, is_active, created_by_user_id)
                VALUES
                (:k, :name, :type, :desc, :weights, :rules, :reqs, :status, :ref, 1, :uid)'
            );
            $insert->execute([
                'k' => $scenarioKey,
                'name' => trim((string) ($input['scenario_name'] ?? ucfirst($scenarioKey))),
                'type' => trim((string) ($input['business_type'] ?? 'Commercial')),
                'desc' => trim((string) ($input['description'] ?? '')),
                'weights' => json_encode($weights, JSON_UNESCAPED_UNICODE),
                'rules' => json_encode($input['rules'] ?? [], JSON_UNESCAPED_UNICODE),
                'reqs' => json_encode($input['mandatory_requirements'] ?? [], JSON_UNESCAPED_UNICODE),
                'status' => $validationStatus,
                'ref' => $validationRef ?: null,
                'uid' => (int) $user['id'],
            ]);
        }

        // Audit log
        $auditStmt = $pdo->prepare(
            'INSERT INTO audit_logs (actor_id, action_type, entity_type, entity_id, metadata)
            VALUES (:actor_id, :action_type, :entity_type, :entity_id, :metadata)'
        );
        $auditStmt->execute([
            'actor_id' => (int) $user['id'],
            'action_type' => 'UPDATE_SCORING_CONFIG',
            'entity_type' => 'CONFIG',
            'entity_id' => (int) ($existingId ?: $pdo->lastInsertId()),
            'metadata' => json_encode([
                'scenario_key' => $scenarioKey,
                'validation_status' => $validationStatus,
                'weights' => $weights,
            ], JSON_UNESCAPED_UNICODE),
        ]);

        return ['success' => true, 'message' => 'Scoring configuration saved.'];
    }

    return [405, ['error' => 'Method not allowed.']];
});

