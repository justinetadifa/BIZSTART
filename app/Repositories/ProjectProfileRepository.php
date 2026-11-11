<?php
declare(strict_types=1);

namespace App\Repositories;

use PDO;
use InvalidArgumentException;
use DomainException;

final class ProjectProfileRepository
{
    public function __construct(private PDO $pdo) {}

    public function listByUser(int $userId): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM investor_project_profiles WHERE user_id = :user_id ORDER BY is_default DESC, id DESC');
        $stmt->execute(['user_id' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'hydrate'], $rows);
    }

    public function find(int $id, int $userId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM investor_project_profiles WHERE id = :id AND user_id = :user_id');
        $stmt->execute(['id' => $id, 'user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->hydrate($row) : null;
    }

    public function getDefault(int $userId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM investor_project_profiles WHERE user_id = :user_id AND is_default = 1 LIMIT 1');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return $this->hydrate($row);
        }

        // Fallback to first profile
        $stmt = $this->pdo->prepare('SELECT * FROM investor_project_profiles WHERE user_id = :user_id ORDER BY id ASC LIMIT 1');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? $this->hydrate($row) : null;
    }

    public function create(int $userId, array $input): array
    {
        $data = $this->validateAndNormalize($input);

        // If setting as default, clear existing default
        if ($data['is_default']) {
            $this->pdo->prepare('UPDATE investor_project_profiles SET is_default = 0 WHERE user_id = :user_id')->execute(['user_id' => $userId]);
        } else {
            // If user has no profiles yet, make this one default
            $count = (int) $this->pdo->query("SELECT COUNT(*) FROM investor_project_profiles WHERE user_id = {$userId}")->fetchColumn();
            if ($count === 0) {
                $data['is_default'] = 1;
            }
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO investor_project_profiles
            (user_id, name, intended_business, transaction_type, total_setup_budget, required_usable_area, opening_timeline, essential_operational_requirements, preferred_barangays, notes, is_default)
            VALUES
            (:user_id, :name, :intended_business, :transaction_type, :total_setup_budget, :required_usable_area, :opening_timeline, :essential_reqs, :preferred_barangays, :notes, :is_default)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'name' => $data['name'],
            'intended_business' => $data['intended_business'],
            'transaction_type' => $data['transaction_type'],
            'total_setup_budget' => $data['total_setup_budget'],
            'required_usable_area' => $data['required_usable_area'],
            'opening_timeline' => $data['opening_timeline'],
            'essential_reqs' => json_encode($data['essential_operational_requirements'], JSON_UNESCAPED_UNICODE),
            'preferred_barangays' => json_encode($data['preferred_barangays'], JSON_UNESCAPED_UNICODE),
            'notes' => $data['notes'],
            'is_default' => $data['is_default'] ? 1 : 0,
        ]);

        $newId = (int) $this->pdo->lastInsertId();
        return $this->find($newId, $userId);
    }

    public function update(int $id, int $userId, array $input): array
    {
        $existing = $this->find($id, $userId);
        if (!$existing) {
            throw new DomainException('Project profile not found.');
        }

        $merged = array_merge($existing, $input);
        $data = $this->validateAndNormalize($merged);

        if ($data['is_default'] && !$existing['is_default']) {
            $this->pdo->prepare('UPDATE investor_project_profiles SET is_default = 0 WHERE user_id = :user_id')->execute(['user_id' => $userId]);
        }

        $stmt = $this->pdo->prepare(
            'UPDATE investor_project_profiles
            SET name = :name,
                intended_business = :intended_business,
                transaction_type = :transaction_type,
                total_setup_budget = :total_setup_budget,
                required_usable_area = :required_usable_area,
                opening_timeline = :opening_timeline,
                essential_operational_requirements = :essential_reqs,
                preferred_barangays = :preferred_barangays,
                notes = :notes,
                is_default = :is_default
            WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute([
            'name' => $data['name'],
            'intended_business' => $data['intended_business'],
            'transaction_type' => $data['transaction_type'],
            'total_setup_budget' => $data['total_setup_budget'],
            'required_usable_area' => $data['required_usable_area'],
            'opening_timeline' => $data['opening_timeline'],
            'essential_reqs' => json_encode($data['essential_operational_requirements'], JSON_UNESCAPED_UNICODE),
            'preferred_barangays' => json_encode($data['preferred_barangays'], JSON_UNESCAPED_UNICODE),
            'notes' => $data['notes'],
            'is_default' => $data['is_default'] ? 1 : 0,
            'id' => $id,
            'user_id' => $userId,
        ]);

        return $this->find($id, $userId);
    }

    public function delete(int $id, int $userId): bool
    {
        $existing = $this->find($id, $userId);
        if (!$existing) {
            return false;
        }

        $stmt = $this->pdo->prepare('DELETE FROM investor_project_profiles WHERE id = :id AND user_id = :user_id');
        $stmt->execute(['id' => $id, 'user_id' => $userId]);

        // If deleted profile was default, make another one default
        if ($existing['is_default']) {
            $stmt = $this->pdo->prepare('UPDATE investor_project_profiles SET is_default = 1 WHERE user_id = :user_id ORDER BY id DESC LIMIT 1');
            $stmt->execute(['user_id' => $userId]);
        }

        return true;
    }

    public function setDefault(int $id, int $userId): bool
    {
        $existing = $this->find($id, $userId);
        if (!$existing) {
            return false;
        }

        $this->pdo->prepare('UPDATE investor_project_profiles SET is_default = 0 WHERE user_id = :user_id')->execute(['user_id' => $userId]);
        $stmt = $this->pdo->prepare('UPDATE investor_project_profiles SET is_default = 1 WHERE id = :id AND user_id = :user_id');
        $stmt->execute(['id' => $id, 'user_id' => $userId]);

        return true;
    }

    private function validateAndNormalize(array $input): array
    {
        $name = trim((string) ($input['name'] ?? ''));
        if ($name === '' || mb_strlen($name) > 190) {
            throw new InvalidArgumentException('Project profile name is required (max 190 characters).');
        }

        $business = trim((string) ($input['intended_business'] ?? ''));
        if ($business === '' || mb_strlen($business) > 120) {
            throw new InvalidArgumentException('Intended business activity is required (max 120 characters).');
        }

        $type = strtolower(trim((string) ($input['transaction_type'] ?? 'lease')));
        if (!in_array($type, ['buy', 'lease', 'sale'], true)) {
            $type = 'lease';
        }
        if ($type === 'sale') $type = 'buy';

        $budget = (float) ($input['total_setup_budget'] ?? 0);
        if ($budget < 0 || $budget > 1000000000000) {
            throw new InvalidArgumentException('Total setup budget must be a positive amount.');
        }

        $area = (float) ($input['required_usable_area'] ?? 0);
        if ($area < 0 || $area > 1000000) {
            throw new InvalidArgumentException('Required usable area must be a valid size in square meters.');
        }

        $timeline = (string) ($input['opening_timeline'] ?? '3_to_6_months');
        $allowedTimelines = ['immediate', '3_to_6_months', '6_to_12_months', '12_months_plus'];
        if (!in_array($timeline, $allowedTimelines, true)) {
            $timeline = '3_to_6_months';
        }

        $essential = is_array($input['essential_operational_requirements'] ?? null)
            ? array_values(array_unique(array_filter(array_map('strval', $input['essential_operational_requirements']))))
            : [];

        $preferred = is_array($input['preferred_barangays'] ?? null)
            ? array_values(array_unique(array_filter(array_map('strval', $input['preferred_barangays']))))
            : [];

        $notes = trim((string) ($input['notes'] ?? ''));
        $isDefault = !empty($input['is_default']);

        return [
            'name' => $name,
            'intended_business' => $business,
            'transaction_type' => $type,
            'total_setup_budget' => (int) round($budget),
            'required_usable_area' => round($area, 2),
            'opening_timeline' => $timeline,
            'essential_operational_requirements' => $essential,
            'preferred_barangays' => $preferred,
            'notes' => $notes ?: null,
            'is_default' => $isDefault,
        ];
    }

    private function hydrate(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'user_id' => (int) $row['user_id'],
            'name' => (string) $row['name'],
            'intended_business' => (string) $row['intended_business'],
            'transaction_type' => (string) $row['transaction_type'],
            'total_setup_budget' => (int) ($row['total_setup_budget'] ?? 0),
            'required_usable_area' => (float) ($row['required_usable_area'] ?? 0),
            'opening_timeline' => (string) ($row['opening_timeline'] ?? '3_to_6_months'),
            'essential_operational_requirements' => json_decode((string) ($row['essential_operational_requirements'] ?? '[]'), true) ?: [],
            'preferred_barangays' => json_decode((string) ($row['preferred_barangays'] ?? '[]'), true) ?: [],
            'notes' => $row['notes'] ? (string) $row['notes'] : null,
            'is_default' => !empty($row['is_default']),
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
        ];
    }
}

