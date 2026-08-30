<?php
declare(strict_types=1);

require __DIR__ . '/app/Support/auth.php';

sfc_logout();
header('Location: ./index.php');
exit;
