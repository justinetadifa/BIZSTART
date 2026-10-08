<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    $actor = sfc_current_user();
    if (!sfc_can_administer_city($actor)) {
        return [403, ['error' => 'Only ICT administrators can manage department accounts and reviewer permissions.']];
    }
    $input = read_request_input();
    if (request_method() === 'PATCH') {
        $target = int_or_null($input['userId'] ?? null);
        $authorized = filter_var($input['brokerReviewAuthorized'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if (!$target || $authorized === null || !array_key_exists('brokerReviewAuthorized', $input)) { throw new InvalidArgumentException('Supply an account and reviewer permission.'); }
        $user = $container['users']->setBrokerReviewAuthorization($target, $authorized, $actor);
        return ['user' => sfc_user_session_payload($user)];
    }
    if (request_method() !== 'POST') {
        return [405, ['error' => 'Method not allowed.']];
    }
    $grant = filter_var($input['brokerReviewAuthorized'] ?? $input['broker_review_authorized'] ?? false, FILTER_VALIDATE_BOOLEAN);
    if ($grant && !in_array(sfc_admin_department(['role' => 'admin', 'department' => (string) ($input['department'] ?? '')]), ['ASSESSOR', 'LEBDO'], true)) {
        throw new InvalidArgumentException('Only CAO/Assessor and LEBDO personnel may be authorized as broker reviewers.');
    }
    $container['pdo']->beginTransaction();
    try {
        $user = sfc_register_admin(
            (string) ($input['name'] ?? ''),
            (string) ($input['email'] ?? ''),
            (string) ($input['password'] ?? ''),
            (string) ($input['confirm_password'] ?? ''),
            (string) ($input['department'] ?? '')
        );
        if ($grant) {
            $user = $container['users']->setBrokerReviewAuthorization((int) $user['id'], true, $actor);
        }
        $container['pdo']->commit();
    } catch (Throwable $error) {
        if ($container['pdo']->inTransaction()) { $container['pdo']->rollBack(); }
        throw $error;
    }
    return [201, ['user' => sfc_user_session_payload($user)]];
});
