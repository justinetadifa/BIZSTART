<?php
declare(strict_types=1);

function app_container(): array
{
    global $container;
    return $container;
}

function api_handle(callable $callback): void
{
    try {
        $rawMethod = request_raw_method();
        if ($rawMethod === 'OPTIONS') {
            respond_json(['ok' => true]);
            return;
        }
        // Validate the transport method before applying any form method override.
        // Some endpoints dispatch on REQUEST_METHOD and must never see an unchecked POST.
        if (!in_array($rawMethod, ['GET', 'HEAD'], true) && !sfc_verify_csrf_request()) {
            respond_json(['error' => 'Invalid or expired security token. Refresh the page and try again.'], 419);
            return;
        }
        request_method();
        $result = $callback(app_container());

        if (
            is_array($result) &&
            isset($result[0], $result[1]) &&
            count($result) === 2 &&
            is_int($result[0]) &&
            is_array($result[1])
        ) {
            respond_json($result[1], $result[0]);
            return;
        }

        if (is_array($result)) {
            respond_json($result);
            return;
        }

        respond_json(['error' => 'Invalid API response.'], 500);
    } catch (InvalidArgumentException $exception) {
        respond_json(['error' => $exception->getMessage()], 400);
    } catch (OutOfBoundsException $exception) {
        respond_json(['error' => $exception->getMessage()], 404);
    } catch (Throwable $exception) {
        error_log(sprintf(
            '[LOCUS-SF API exception] %s: %s in %s:%d',
            get_class($exception),
            $exception->getMessage(),
            $exception->getFile(),
            $exception->getLine()
        ));

        $payload = ['error' => 'Internal server error.'];
        if ($GLOBALS['apiDebug'] ?? false) {
            $payload = [
                'error' => $exception->getMessage(),
                'type' => get_class($exception),
            ];
        }
        respond_json($payload, 500);
    }
}
