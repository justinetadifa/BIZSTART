/* Opt-in local integration: submits two temporary properties through the real UI/API.
   Every fixture is deleted by exact ID + unique name in finally, together with its audit.
   Set PLAYWRIGHT_MODULE when Playwright is installed outside this repository. */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

if (!process.argv.includes('--integration')) {
  console.log('SKIP: add --integration to verify real desktop/mobile property submissions against local demo data.');
  process.exit(0);
}

const base = process.env.LOCUS_TEST_URL || 'http://localhost/sfcelerate-bizstart';
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'This write/cleanup test only accepts a local application.');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const php = process.env.PHP_BIN || (process.platform === 'win32' ? 'C:/xampp/php/php.exe' : 'php');
const root = path.resolve(__dirname, '..');
const reports = [];

// PDO runs in a CLI child process; no temporary PHP file or web-accessible helper is created.
const databaseHelper = `
$root = $argv[1]; $action = $argv[2]; $fixture = json_decode($argv[3], true, 512, JSON_THROW_ON_ERROR);
if (!preg_match('/^Interaction live (desktop|mobile) [a-f0-9-]{36}$/D', $fixture['name'])) throw new RuntimeException('Invalid test fixture name.');
$config = require $root . '/app/config.php';
require_once $root . '/app/Core/Database.php';
$pdo = (new App\\Core\\Database($config['db']))->pdo();
$pdo->beginTransaction();
try {
    $sql = 'SELECT id, name, approval_state, status, area FROM properties WHERE name = :name';
    $parameters = ['name' => $fixture['name']];
    if (!empty($fixture['id'])) { $sql .= ' AND id = :id'; $parameters['id'] = (int) $fixture['id']; }
    $statement = $pdo->prepare($sql . ' FOR UPDATE'); $statement->execute($parameters); $rows = $statement->fetchAll();
    if (count($rows) > 1) throw new RuntimeException('Ambiguous fixture; refusing cleanup.');
    $row = $rows[0] ?? null;
    if ($action === 'cleanup' && $row !== null) {
        $statement = $pdo->prepare('DELETE FROM audit_logs WHERE entity_type = :entity AND entity_id = :id');
        $statement->execute(['entity' => 'PROPERTY', 'id' => (int) $row['id']]);
        $statement = $pdo->prepare('DELETE FROM properties WHERE id = :id AND name = :name');
        $statement->execute(['id' => (int) $row['id'], 'name' => $fixture['name']]);
        if ($statement->rowCount() !== 1) throw new RuntimeException('Exact fixture cleanup failed.');
    }
    $pdo->commit(); echo json_encode($row, JSON_THROW_ON_ERROR);
} catch (Throwable $error) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $error; }
`;

function database(action, fixture) {
  const result = spawnSync(php, ['-r', databaseHelper, root, action, JSON.stringify(fixture)], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, `CLI ${action} failed: ${result.stderr || result.error || result.stdout}`);
  return JSON.parse(result.stdout.trim());
}

async function submit(context, mobile) {
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const fixture = { id: null, name: `Interaction live ${mobile ? 'mobile' : 'desktop'} ${randomUUID()}` };
  let posts = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/api/properties.php')) posts++;
  });
  try {
    await page.goto(`${base}/admin-properties.php`);
    await page.locator('[data-add-listing]').click();
    const dialog = page.locator('#cityPropertyEditor');
    const form = dialog.locator('[data-property-form]');
    await form.locator('[name=property_name]').fill(fixture.name);
    await form.locator('[name=category]').selectOption('Land');
    await form.locator('[name=subcategory]').selectOption('Commercial Lot');
    await form.locator('[name=sale_price_mode]').selectOption('request');
    await form.locator('[name=declared_area_sqm]').fill('100');
    await form.locator('[data-editor-step="3"]').click();
    const responsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/api/properties.php'));
    await form.locator('[type=submit]').click();
    const response = await responsePromise;
    const payload = await response.json();
    fixture.id = payload.property?.id || null;
    assert.equal(response.status(), 201, `Real API rejected ${mobile ? 'mobile' : 'desktop'} submission: ${JSON.stringify(payload)}`);
    assert(fixture.id, 'The successful response returns the created property ID.');
    const saved = database('read', fixture);
    assert(saved, 'Created property is persisted in MySQL.');
    assert.equal(saved.name, fixture.name);
    assert.equal(saved.approval_state, payload.property.approvalState, 'Response approval status matches persisted status.');
    assert.equal(saved.status, payload.property.status, 'Response availability matches persisted status.');
    assert.equal(Number(saved.area), .01, 'Declared 100 sqm survives the UI/API/database flow.');
    await dialog.waitFor({ state: 'hidden' });
    const humanStatus = payload.property.approvalState.replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase());
    await page.waitForFunction(expected => document.querySelector('[data-workspace-status]').textContent.includes(expected), `Status: ${humanStatus}.`);
    assert.equal(posts, 1, 'A successful UI submission sends exactly one create request.');
    reports.push(`${mobile ? 'Mobile 390px' : 'Desktop 1440px'}: real HTTP 201, MySQL persistence, actual ${payload.property.approvalState}/${payload.property.status} feedback, one request.`);
  } finally {
    await page.close();
    const deleted = database('cleanup', fixture);
    assert.equal(database('read', fixture), null, 'Fixture and cascaded children are removed.');
    if (fixture.id) assert(deleted, 'Created fixture was found for exact ID/name cleanup.');
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const loginContext = await browser.newContext();
    const page = await loginContext.newPage();
    await page.goto(`${base}/admin-login.php`);
    await page.locator('#login-email').fill(process.env.LOCUS_ADMIN_EMAIL || 'admin@sfcelerate.local');
    await page.locator('#login-password').fill(process.env.LOCUS_ADMIN_PASSWORD || 'Admin123!');
    await Promise.all([page.waitForURL(/account-welcome|dashboard/), page.locator('.account-submit').first().click()]);
    const storageState = await loginContext.storageState();
    await loginContext.close();
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ storageState, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
      try { await submit(context, mobile); } finally { await context.close(); }
    }
    console.log(reports.join('\n'));
    console.log('Both temporary properties and their audit rows were cleaned. One shared admin login was used.');
  } finally { await browser.close(); }
})().catch(error => { console.error(reports.join('\n')); console.error(error); process.exitCode = 1; });
