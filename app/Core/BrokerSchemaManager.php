<?php
declare(strict_types=1);

namespace App\Core;

use PDO;

require_once __DIR__ . '/SchemaManager.php';

final class BrokerSchemaManager
{
    /** Add Batch B fields without inferring verification, reviewer authority or changing approvals. */
    public static function ensure(PDO $pdo): void
    {
        foreach ([
            'users' => [
                'email_verified_at' => 'TIMESTAMP NULL DEFAULT NULL',
                'broker_review_authorized' => 'TINYINT(1) NOT NULL DEFAULT 0',
                'session_version' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            ],
            'seller_profiles' => [
                'prc_front_json' => 'JSON NULL',
                'prc_back_json' => 'JSON NULL',
                'application_revision' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            ],
        ] as $table => $columns) {
            if (!SchemaManager::tableExists($pdo, $table)) { continue; }
            foreach ($columns as $column => $definition) {
                if (!SchemaManager::columnExists($pdo, $table, $column)) {
                    $pdo->exec('ALTER TABLE ' . $table . ' ADD COLUMN ' . $column . ' ' . $definition);
                }
            }
        }
        foreach (self::statements() as $sql) { $pdo->exec($sql); }
        if (!SchemaManager::columnExists($pdo, 'email_verification_tokens', 'email')) {
            $pdo->exec("ALTER TABLE email_verification_tokens ADD COLUMN email VARCHAR(190) NOT NULL DEFAULT ''");
        }
    }

    public static function statements(): array
    {
        return [
            <<<'SQL'
CREATE TABLE IF NOT EXISTS broker_application_reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reviewer_user_id INT NOT NULL,
  application_revision INT UNSIGNED NOT NULL,
  decision VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,
  findings TEXT NULL,
  snapshot_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_broker_reviews_user (user_id, id),
  CONSTRAINT fk_broker_reviews_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_broker_reviews_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES users(id)
)
SQL,
            <<<'SQL'
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  email VARCHAR(190) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_email_verification_hash (token_hash),
  KEY idx_email_verification_user (user_id, created_at),
  CONSTRAINT fk_email_verification_user FOREIGN KEY (user_id) REFERENCES users(id)
)
SQL,
            <<<'SQL'
CREATE TABLE IF NOT EXISTS broker_mail_outbox (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  kind VARCHAR(40) NOT NULL,
  dedupe_key VARCHAR(190) NOT NULL,
  recipient_email VARCHAR(190) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  last_error VARCHAR(500) NULL,
  next_attempt_at DATETIME NULL,
  locked_at DATETIME NULL,
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_broker_mail_dedupe (dedupe_key),
  KEY idx_broker_mail_delivery (status, next_attempt_at),
  KEY idx_broker_mail_user (user_id, created_at),
  CONSTRAINT fk_broker_mail_user FOREIGN KEY (user_id) REFERENCES users(id)
)
SQL,
        ];
    }
}
