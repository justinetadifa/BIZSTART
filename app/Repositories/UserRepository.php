<?php
declare(strict_types=1);

namespace App\Repositories;

use InvalidArgumentException;
use PDO;
use PDOException;

final class UserRepository
{
    private const IDENTITY_VERIFICATION_STATUSES = ['unverified', 'pending', 'verified', 'rejected', 'suspended'];

    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findById(int $userId): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT *
             FROM users
             WHERE id = :id
             LIMIT 1'
        );
        $statement->execute(['id' => $userId]);

        $row = $statement->fetch();
        return is_array($row) ? $this->hydrate($row) : null;
    }

    public function findByEmail(string $email): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT *
             FROM users
             WHERE LOWER(email) = LOWER(:email)
             LIMIT 1'
        );
        $statement->execute(['email' => trim($email)]);

        $row = $statement->fetch();
        return is_array($row) ? $this->hydrate($row) : null;
    }

    public function authenticate(string $email, string $password, ?string $role = null): ?array
    {
        $user = $this->findByEmail($email);
        if ($user === null) {
            return null;
        }

        if ($role !== null && $user['role'] !== $role) {
            return null;
        }

        $hash = (string) ($user['passwordHash'] ?? '');
        if ($hash === '' || !password_verify($password, $hash)) {
            return null;
        }

        return $user;
    }

    public function create(string $role, string $name, string $email, string $password, ?string $department = null, array $profile = []): array
    {
        $name = trim($name);
        $email = strtolower(trim($email));
        $department = $department !== null ? trim($department) : null;
        if ($department === '') {
            $department = null;
        }

        if (!in_array($role, ['admin', 'investor', 'seller'], true)) {
            throw new InvalidArgumentException('Invalid account role.');
        }
        if ($name === '' || mb_strlen($name) > 140) {
            throw new InvalidArgumentException('Name is required.');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
            throw new InvalidArgumentException('A valid email address is required.');
        }
        if (strlen($password) < 8) {
            throw new InvalidArgumentException('Password must be at least 8 characters.');
        }

        $statement = $this->pdo->prepare(
            'INSERT INTO users (role, name, department, email, password_hash, identity_verification_status, identity_verified_at,
                phone, address_line, privacy_consent_at, privacy_consent_version, privacy_consent_text)
             VALUES (:role, :name, :department, :email, :password_hash, :identity_verification_status, :identity_verified_at,
                :phone, :address_line, :privacy_consent_at, :privacy_consent_version, :privacy_consent_text)'
        );

        try {
            $identityStatus = match ($role) {
                'admin' => 'verified',
                'seller' => 'pending',
                default => 'unverified',
            };
            $statement->execute([
                'role' => $role,
                'name' => $name,
                'department' => $department,
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'identity_verification_status' => $identityStatus,
                'identity_verified_at' => $identityStatus === 'verified' ? gmdate('Y-m-d H:i:s') : null,
                'phone' => $profile['phone'] ?? null,
                'address_line' => $profile['address'] ?? null,
                'privacy_consent_at' => $profile['privacyConsentAt'] ?? null,
                'privacy_consent_version' => $profile['privacyConsentVersion'] ?? null,
                'privacy_consent_text' => $profile['privacyConsentText'] ?? null,
            ]);
        } catch (PDOException $exception) {
            if ((int) $exception->getCode() === 23000) {
                throw new InvalidArgumentException('That email is already registered.');
            }

            throw $exception;
        }

        $userId = (int) $this->pdo->lastInsertId();
        $user = $this->findById($userId);

        if ($user === null) {
            throw new InvalidArgumentException('Unable to create the account.');
        }

        return $user;
    }

    public function updateIdentityVerificationStatus(int $userId, string $status): array
    {
        $normalized = $this->normalizeIdentityVerificationStatus($status);

        $statement = $this->pdo->prepare(
            'UPDATE users
             SET identity_verification_status = :identity_verification_status,
                 identity_verified_at = :identity_verified_at
             WHERE id = :id'
        );
        $statement->execute([
            'id' => $userId,
            'identity_verification_status' => $normalized,
            'identity_verified_at' => $normalized === 'verified' ? gmdate('Y-m-d H:i:s') : null,
        ]);

        $user = $this->findById($userId);
        if ($user === null) {
            throw new InvalidArgumentException('User not found.');
        }

        return $user;
    }

    public function allByRole(string $role): array
    {
        $statement = $this->pdo->prepare(
            'SELECT *
             FROM users
             WHERE role = :role
             ORDER BY name ASC, email ASC'
        );
        $statement->execute(['role' => $role]);

        return array_map([$this, 'hydrate'], $statement->fetchAll());
    }

    public function firstByRole(string $role): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT *
             FROM users
             WHERE role = :role
             ORDER BY id ASC
             LIMIT 1'
        );
        $statement->execute(['role' => $role]);

        $row = $statement->fetch();
        return is_array($row) ? $this->hydrate($row) : null;
    }

    public function defaultSellerId(): ?int
    {
        return $this->firstByRole('seller')['id'] ?? null;
    }

    public function updateProfile(int $userId, string $name, ?string $phone, ?string $address, ?string $imageUrl): array
    {
        $name = trim($name);
        $phone = $phone !== null && trim($phone) !== '' ? trim($phone) : null;
        $address = $address !== null && trim($address) !== '' ? trim($address) : null;
        if ($name === '' || mb_strlen($name) > 140) {
            throw new InvalidArgumentException('Enter your full name (up to 140 characters).');
        }
        if ($phone !== null && (!preg_match('/^[+()0-9 .-]{7,30}$/', $phone))) {
            throw new InvalidArgumentException('Enter a valid contact number.');
        }
        if ($address !== null && mb_strlen($address) > 255) {
            throw new InvalidArgumentException('Address must be at most 255 characters.');
        }
        if ($imageUrl !== null && !preg_match('#^assets/uploads/profiles/[a-zA-Z0-9.-]+\.(?:jpg|png|webp|gif)$#', $imageUrl)) {
            throw new InvalidArgumentException('Profile photos must be uploaded through your account.');
        }
        $statement = $this->pdo->prepare('UPDATE users SET name = :name, phone = :phone, address_line = :address, profile_image_url = :image WHERE id = :id');
        $statement->execute(['id' => $userId, 'name' => $name, 'phone' => $phone, 'address' => $address, 'image' => $imageUrl]);
        return $this->findById($userId) ?? throw new InvalidArgumentException('Account not found.');
    }

    public function recordPrivacyConsent(int $userId, string $version, string $text): array
    {
        $statement = $this->pdo->prepare('UPDATE users SET privacy_consent_at = :consented_at, privacy_consent_version = :version, privacy_consent_text = :consent_text WHERE id = :id');
        $statement->execute(['id' => $userId, 'consented_at' => gmdate('Y-m-d H:i:s'), 'version' => $version, 'consent_text' => $text]);
        return $this->findById($userId) ?? throw new InvalidArgumentException('Account not found.');
    }

    private function hydrate(array $row): array
    {
        $identityVerifiedAt = $row['identity_verified_at'] ?? null;
        $department = isset($row['department']) && $row['department'] !== null && trim((string) $row['department']) !== ''
            ? (string) $row['department']
            : null;

        return [
            'id' => (int) ($row['id'] ?? 0),
            'role' => (string) ($row['role'] ?? 'guest'),
            'name' => (string) ($row['name'] ?? ''),
            'department' => $department,
            'email' => (string) ($row['email'] ?? ''),
            'phone' => $row['phone'] ?? null,
            'address' => $row['address_line'] ?? null,
            'profileImageUrl' => $row['profile_image_url'] ?? null,
            'privacyConsentAt' => $row['privacy_consent_at'] ?? null,
            'privacyConsentVersion' => $row['privacy_consent_version'] ?? null,
            'passwordHash' => (string) ($row['password_hash'] ?? ''),
            'identityVerificationStatus' => $this->normalizeIdentityVerificationStatus((string) ($row['identity_verification_status'] ?? 'unverified')),
            'identityVerifiedAt' => $identityVerifiedAt !== null ? (string) $identityVerifiedAt : null,
            'createdAt' => (string) ($row['created_at'] ?? ''),
            'updatedAt' => (string) ($row['updated_at'] ?? ''),
        ];
    }

    private function normalizeIdentityVerificationStatus(string $status): string
    {
        $normalized = strtolower(trim($status));
        if (!in_array($normalized, self::IDENTITY_VERIFICATION_STATUSES, true)) {
            return 'unverified';
        }

        return $normalized;
    }
}
