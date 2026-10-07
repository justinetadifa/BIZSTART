<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

api_handle(function (array $container): array {
    $user = sfc_current_user();
    if ($user === null || ($user['role'] ?? '') !== 'admin') {
        return [403, ['error' => 'City department authorization required.']];
    }

    $method = request_method();

    if ($method === 'GET') {
        $investors = $container['users']->allInvestorsWithActivity((int) ($user['id'] ?? 0));
        $total = count($investors);
        $onlineNow = count(array_filter($investors, static fn (array $i): bool => !empty($i['isOnline'])));
        $activeToday = count(array_filter($investors, static fn (array $i): bool => in_array($i['presenceState'] ?? '', ['online', 'recent'], true)));
        $verified = count(array_filter($investors, static fn (array $i): bool => ($i['identityVerificationStatus'] ?? '') === 'verified'));
        $totalShortlists = array_sum(array_column($investors, 'shortlistsCount'));
        $totalVisits = array_sum(array_column($investors, 'visitsCount'));
        $totalDocRequests = array_sum(array_column($investors, 'documentRequestsCount'));

        return [200, [
            'ok' => true,
            'investors' => $investors,
            'summary' => [
                'total' => $total,
                'onlineNow' => $onlineNow,
                'activeToday' => $activeToday,
                'verified' => $verified,
                'totalShortlists' => $totalShortlists,
                'totalVisits' => $totalVisits,
                'totalDocRequests' => $totalDocRequests,
            ],
            'generatedAt' => gmdate(DATE_ATOM),
        ]];
    }

    if ($method === 'PATCH') {
        $input = read_request_input();
        $investorId = (int) ($input['investorId'] ?? 0);
        $status = strtolower(trim((string) ($input['status'] ?? '')));

        if ($investorId <= 0) {
            return [400, ['error' => 'Valid investor ID required.']];
        }

        $target = $container['users']->findById($investorId);
        if ($target === null || ($target['role'] ?? '') !== 'investor') {
            return [404, ['error' => 'Investor record not found.']];
        }

        if (!in_array($status, ['unverified', 'pending', 'verified', 'suspended'], true)) {
            return [400, ['error' => 'Status must be verified, pending, unverified, or suspended.']];
        }

        $updated = $container['users']->updateIdentityVerificationStatus($investorId, $status);

        return [200, [
            'ok' => true,
            'investor' => $updated,
            'message' => 'Investor verification status updated.',
        ]];
    }

    return [405, ['error' => 'Method not allowed.']];
});
