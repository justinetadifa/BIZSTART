<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';
require_once dirname(__DIR__) . '/app/Support/InvestmentAssistant.php';
require_once dirname(__DIR__) . '/app/Support/RequestRateLimiter.php';
require_once dirname(__DIR__) . '/app/Repositories/InvestmentSearchRepository.php';

use App\Support\InvestmentAssistant;
use App\Support\RequestRateLimiter;
use App\Repositories\InvestmentSearchRepository;

header('Cache-Control: no-store, private');
api_handle(function (array $container): array {
    $user = sfc_current_user();
    if ($user === null) return [401, ['error' => 'Sign in to your investor account to use the Property Assistant.']];
    if (($user['role'] ?? '') !== 'investor') return [403, ['error' => 'The Property Assistant is available in the investor interface.']];
    if (!in_array(request_method(), ['GET', 'POST'], true)) return [405, ['error' => 'Method not allowed.']];
    $config = require dirname(__DIR__) . '/app/config.php';
    $repository = new InvestmentSearchRepository($container['pdo'], $container['properties']);
    $key = 'sfc_investment_assistant_' . (int) $user['id'];
    $state = $_SESSION[$key] ?? InvestmentAssistant::initial();
    if (!is_array($state) || ($state['mode'] ?? null) !== 'rules' || time() - (int) ($state['updatedAt'] ?? 0) > 7200) $state = InvestmentAssistant::initial();
    $post = request_method() === 'POST';
    if ($post) {
        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 16384) return [413, ['error' => 'The message is too large. Please shorten it.']];
        $raw = file_get_contents('php://input', false, null, 0, 16385);
        if ($raw === false || strlen($raw) > 16384) return [413, ['error' => 'The message is too large. Please shorten it.']];
        $input = json_decode($raw, true);
        if (!is_array($input)) throw new InvalidArgumentException('Request body must be a JSON object.');
        if (array_diff(array_keys($input), ['message', 'filters', 'reset', 'version', 'requestId', 'filtersOnly', 'csrf_token', '_csrf'])) throw new InvalidArgumentException('Unsupported assistant request fields.');
        foreach (['reset', 'filtersOnly'] as $flag) if (isset($input[$flag]) && !is_bool($input[$flag])) throw new InvalidArgumentException('Invalid assistant option.');
        $requestId = $input['requestId'] ?? '';
        if (!is_string($requestId) || !preg_match('/^[a-zA-Z0-9_-]{8,80}$/D', $requestId)) throw new InvalidArgumentException('A valid request identifier is required.');
        $hash = hash('sha256', json_encode($input, JSON_THROW_ON_ERROR));
        $retry = ($state['requestId'] ?? null) === $requestId;
        if ($retry && !hash_equals((string) ($state['requestHash'] ?? ''), $hash)) return [409, ['error' => 'This request identifier was already used. Refresh the conversation before sending a new request.']];
        if (!$retry) {
            if (!is_int($input['version'] ?? null) || $input['version'] !== $state['version']) return [409, ['error' => 'The conversation changed in another tab. Loading its latest search will preserve your criteria.']];
            $limiter = new RequestRateLimiter((string) $config['security']['rate_limit_path']);
            if (!$limiter->consume('investment-assistant:user:' . $user['id'], 20, 60)
                || !$limiter->consume('investment-assistant:ip:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 80, 60)) {
                header('Retry-After: 60');
                return [429, ['error' => 'Please wait a minute before sending another search. Your current filters are still available.']];
            }
            $state = InvestmentAssistant::interpret($state, $input);
            $state['version']++;
            $state['updatedAt'] = time();
            $state['requestId'] = $requestId;
            $state['requestHash'] = $hash;
        }
    }
    try {
        $search = $repository->search($state['criteria'], $user);
        $saved = array_map('intval', $container['shortlists']->propertyIdsByInvestor((int) $user['id']));
    } catch (PDOException $exception) {
        error_log('[LOCUS-SF Property Assistant database] ' . $exception->getMessage());
        return [503, ['error' => 'Published properties could not be loaded. Please try again. Your last successful filters are preserved.', 'code' => 'database_unavailable']];
    }
    $response = InvestmentAssistant::response($state, $search, $saved);
    if (!$post) $response['compareIds'] = [];
    if ($post && !$retry) {
        $state['messages'][] = ['role' => 'assistant', 'content' => $response['message']];
        $state['messages'] = array_slice($state['messages'], -16);
        $response['state']['messages'] = $state['messages'];
    }
    $_SESSION[$key] = $state;
    return $response;
});
