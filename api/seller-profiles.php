<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

function seller_application_summary(array $profiles): array
{
    $summary = [
        'total' => count($profiles),
        'pendingReview' => 0,
        'verified' => 0,
        'correctionsRequested' => 0,
        'rejected' => 0,
        'suspended' => 0,
        'draft' => 0,
        'blocked' => 0,
    ];

    foreach ($profiles as $profile) {
        $status = strtolower((string) ($profile['applicationStatus'] ?? 'draft'));
        if (($profile['accountStatus'] ?? '') === 'blocked') { $summary['blocked']++; }
        if ($status === 'pending_review') {
            $summary['pendingReview']++;
        } elseif ($status === 'verified') {
            $summary['verified']++;
        } elseif ($status === 'corrections_requested') {
            $summary['correctionsRequested']++;
        } elseif ($status === 'rejected') {
            $summary['rejected']++;
        } elseif ($status === 'suspended') {
            $summary['suspended']++;
        } else {
            $summary['draft']++;
        }
    }

    return $summary;
}

function seller_identity_status_from_application(string $applicationStatus): string
{
    return match (strtolower(trim($applicationStatus))) {
        'verified' => 'verified',
        'rejected' => 'rejected',
        'suspended' => 'suspended',
        'pending_review', 'corrections_requested' => 'pending',
        default => 'unverified',
    };
}

api_handle(function (array $container): array {
    $user = sfc_current_user();
    if ($user === null || !isset($user['id'])) {
        return [403, ['error' => 'A logged-in account is required to manage seller profiles.']];
    }

    $method = request_method();
    $role = (string) ($user['role'] ?? 'guest');
    $withMailStatus = static function (array $profile) use ($container): array {
        $profile['mailDelivery'] = $container['brokerEmail']->status((int) $profile['userId']);
        return $profile;
    };

    if ($method === 'GET') {
        if ($role === 'seller') {
            return [
                'profile' => $withMailStatus($container['sellerProfiles']->findOrInitializeByUser($user)),
                'generatedAt' => gmdate(DATE_ATOM),
            ];
        }

        if (!sfc_can_review_brokers($user)) {
            return [403, ['error' => 'Only explicitly authorized CAO or LEBDO reviewers can view broker verification details.']];
        }

        $scope = strtolower(trim((string) ($_GET['scope'] ?? 'queue')));
        if ($scope === 'queue') {
            $status = string_or_null($_GET['status'] ?? null);
            $profiles = array_map($withMailStatus, $container['sellerProfiles']->queue($status));

            return [
                'profiles' => $profiles,
                'summary' => seller_application_summary($profiles),
                'generatedAt' => gmdate(DATE_ATOM),
            ];
        }

        $targetUserId = int_or_null($_GET['userId'] ?? $_GET['sellerUserId'] ?? null);
        if ($targetUserId === null || $targetUserId < 1) {
            throw new InvalidArgumentException('A valid seller user id is required.');
        }

        $profile = $container['sellerProfiles']->findByUserId($targetUserId);
        if ($profile === null) {
            throw new OutOfBoundsException('Seller profile not found.');
        }

        return [
            'profile' => $withMailStatus($profile),
            'generatedAt' => gmdate(DATE_ATOM),
        ];
    }

    if ($method === 'POST') {
        $payload = read_request_input();
        $action = strtolower((string) ($payload['action'] ?? ''));
        if ($action === 'retry_mail') {
            $deliveryId = int_or_null($payload['deliveryId'] ?? $payload['mailId'] ?? null);
            if ($deliveryId === null || $deliveryId < 1) { throw new InvalidArgumentException('A valid email delivery id is required.'); }
            $statement = $container['pdo']->prepare('SELECT user_id FROM broker_mail_outbox WHERE id = :id');
            $statement->execute(['id' => $deliveryId]);
            $ownerId = (int) $statement->fetchColumn();
            if (!sfc_can_review_brokers($user) && !($role === 'seller' && $ownerId === (int) $user['id'])) { return [403, ['error' => 'Only the applicant or an authorized reviewer can retry this email.']]; }
            if ($ownerId < 1) { throw new OutOfBoundsException('Email notification not found.'); }
            return ['emailStatus' => $container['brokerEmail']->retryDelivery($deliveryId), 'generatedAt' => gmdate(DATE_ATOM)];
        }
        if ($role !== 'seller') {
            return [403, ['error' => 'Only seller accounts can submit seller verification details.']];
        }

        $submit = filter_var($payload['submit'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($action === 'submit') {
            $submit = true;
        } elseif ($action === 'draft') {
            $submit = false;
        } elseif ($action !== '') {
            throw new InvalidArgumentException('Choose save draft or submit application.');
        }

        $before = $container['sellerProfiles']->findByUserId((int) $user['id']);
        $profile = $container['brokerApplications']->saveForUser((int) $user['id'], $payload, $_FILES, $submit);
        $updatedUser = $container['users']->findById((int) $user['id']);

        sfc_start_session();
        $_SESSION['sfc_user'] = sfc_user_session_payload($updatedUser);

        if ($profile['applicationRevision'] > (int) ($before['applicationRevision'] ?? 0)) {
            $adminIds = array_values(array_filter(array_map(
                static fn (array $admin): int => (int) ($admin['id'] ?? 0),
                array_filter($container['users']->allByRole('admin'), 'sfc_can_review_brokers')
            )));
            if ($adminIds !== []) {
                $container['notifications']->createForUsers($adminIds, [
                    'category' => 'operational',
                    'kind' => 'seller_application',
                    'priority' => 'high',
                    'tone' => 'info',
                    'icon' => 'seller',
                    'title' => 'Seller application ready for review',
                    'body' => sprintf(
                        '%s submitted seller verification details and is waiting for approval.',
                        $profile['legalName'] ?: $updatedUser['name']
                    ),
                    'actionLabel' => 'Open admin queue',
                    'actionUrl' => 'admin-dashboard.php',
                    'actorUserId' => (int) $updatedUser['id'],
                    'meta' => [
                        'sellerUserId' => (int) $updatedUser['id'],
                        'applicationStatus' => $profile['applicationStatus'] ?? 'pending_review',
                    ],
                ]);
            }
        }

        return [
            'profile' => $withMailStatus($profile),
            'user' => sfc_user_session_payload($updatedUser),
            'generatedAt' => gmdate(DATE_ATOM),
        ];
    }

    if ($method === 'PATCH') {
        if (!sfc_can_review_brokers($user)) {
            return [403, ['error' => 'Only explicitly authorized CAO or LEBDO reviewers can review broker applications.']];
        }

        $payload = read_json_input();
        $targetUserId = int_or_null($payload['userId'] ?? $payload['sellerUserId'] ?? null);
        if ($targetUserId === null || $targetUserId < 1) {
            throw new InvalidArgumentException('A valid seller user id is required.');
        }

        $status = string_or_null($payload['status'] ?? $payload['applicationStatus'] ?? null);
        if ($status === null) {
            throw new InvalidArgumentException('A review status is required.');
        }

        $reviewNotes = string_or_null($payload['reviewNotes'] ?? $payload['review_notes'] ?? null);
        $revision = int_or_null($payload['applicationRevision'] ?? null);
        if ($revision === null || $revision < 0) { throw new InvalidArgumentException('Refresh the broker application before submitting a review.'); }
        $profile = $container['brokerApplications']->review($targetUserId, $status, (int) $user['id'], $reviewNotes ?? '', string_or_null($payload['findings'] ?? null), filter_var($payload['prcChecked'] ?? false, FILTER_VALIDATE_BOOLEAN), $revision);
        $updatedUser = $container['users']->findById($targetUserId);
        $decision = (string) ($profile['reviewHistory'][0]['decision'] ?? $status);

        $notificationTitle = match ($decision) {
            'verified' => 'Broker application approved',
            'corrections_requested' => 'Broker application corrections requested',
            'rejected' => 'Broker application rejected',
            'blocked' => 'Broker account blocked',
            default => 'Broker application updated',
        };
        $notificationBody = match ($decision) {
            'verified' => 'Your LOCUS-SF broker application has been approved. Verified email is required to access broker listing privileges.',
            'corrections_requested' => 'Please update the requested details and submit your broker application again for review.',
            'rejected' => 'Following a review of your credentials, your broker application has been rejected.',
            'blocked' => 'Following a documented review, your broker application has been declined and your account access has been blocked.',
            default => 'Your seller application status was updated by the admin team.',
        };
        if ($reviewNotes !== null) {
            $notificationBody .= ' Note: ' . $reviewNotes;
        }

        if (!$profile['duplicateDecision']) { $container['notifications']->createForUsers([(int) $updatedUser['id']], [
            'category' => 'transactional',
            'kind' => 'seller_review',
            'priority' => $decision === 'verified' ? 'normal' : 'high',
            'tone' => $decision === 'verified' ? 'success' : 'system',
            'icon' => 'seller',
            'title' => $notificationTitle,
            'body' => $notificationBody,
            'actionLabel' => 'Open seller dashboard',
            'actionUrl' => 'seller-dashboard.php',
            'actorUserId' => (int) $user['id'],
            'meta' => [
                'sellerUserId' => (int) $updatedUser['id'],
                'applicationStatus' => $profile['applicationStatus'] ?? $status,
            ],
        ]); }

        $profiles = array_map($withMailStatus, $container['sellerProfiles']->queue());

        return [
            'profile' => $withMailStatus($profile),
            'user' => [
                'id' => (int) $updatedUser['id'],
                'identityVerificationStatus' => $updatedUser['identityVerificationStatus'] ?? 'unverified',
                'identityVerifiedAt' => $updatedUser['identityVerifiedAt'] ?? null,
                'accountStatus' => $updatedUser['accountStatus'] ?? 'active',
                'emailVerifiedAt' => $updatedUser['emailVerifiedAt'] ?? null,
            ],
            'profiles' => $profiles,
            'summary' => seller_application_summary($profiles),
            'generatedAt' => gmdate(DATE_ATOM),
        ];
    }

    return [405, ['error' => 'Method not allowed.']];
});
