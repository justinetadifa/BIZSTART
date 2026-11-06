<?php
declare(strict_types=1);

require_once __DIR__ . '/AgentDirectory.php';

function sfc_render_agent_directory(array $context): void
{
    $e = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    $query = is_string($_GET['agentSearch'] ?? null) ? mb_substr(trim($_GET['agentSearch']), 0, 120) : '';
    $agents = [];
    $failed = false;
    try {
        $properties = sfc_app_container()['properties']->all($context['user']);
        $agents = \App\Support\AgentDirectory::fromProperties($properties, $context['user'], $query);
    } catch (Throwable $error) {
        $failed = true;
        error_log('Find Agent directory: ' . $error->getMessage());
    }
    ?>
<link rel="stylesheet" href="<?= $e($context['assetBase']) ?>/css/agent-directory.css<?= sfc_asset_version('css/agent-directory.css') ?>">
<main class="agent-directory city-container" aria-labelledby="agentDirectoryTitle">
  <div class="agent-directory-heading">
    <div><span class="agent-directory-kicker">LOCUS-SF / Investor workspace</span><h1 id="agentDirectoryTitle">Find Agent</h1><p>Connect with verified brokers designated on published properties.</p></div>
    <a class="agent-directory-back" href="<?= $e(sfc_path('/investor-dashboard.php')) ?>">Explore properties <span aria-hidden="true">&rarr;</span></a>
  </div>
  <form class="agent-directory-search" method="get" action="<?= $e(sfc_path('/investor-dashboard.php')) ?>" role="search" aria-label="Find a listing agent">
    <input type="hidden" name="view" value="agents">
    <label for="agentDirectorySearch">Agent, property, or barangay</label>
    <div><input type="search" id="agentDirectorySearch" name="agentSearch" value="<?= $e($query) ?>" maxlength="120" placeholder="Search listing agents" autocomplete="off"><button type="submit">Search</button><?php if ($query !== ''): ?><a href="<?= $e(sfc_path('/investor-dashboard.php?view=agents')) ?>">Clear</a><?php endif; ?></div>
  </form>
  <?php if ($failed): ?>
    <div class="agent-directory-empty" role="alert"><h2>Unable to load listing agents</h2><p>The listing database could not be loaded. Please try again.</p><a href="<?= $e(sfc_path('/investor-dashboard.php?view=agents')) ?>">Try again</a></div>
  <?php elseif ($agents === []): ?>
    <div class="agent-directory-empty"><h2><?= $query !== '' ? 'No listing agents match your search.' : 'No agents are currently listed on published properties.' ?></h2><p><?= $query !== '' ? 'Try another agent name, property, or barangay, or clear your search.' : 'Explore a published property to view its available listing contact options.' ?></p><a href="<?= $e(sfc_path($query !== '' ? '/investor-dashboard.php?view=agents' : '/investor-dashboard.php')) ?>"><?= $query !== '' ? 'Clear search' : 'Explore properties' ?></a></div>
  <?php else: ?>
    <p class="agent-directory-count"><?= count($agents) ?> <?= count($agents) === 1 ? 'listing agent' : 'listing agents' ?></p>
    <div class="agent-directory-grid">
    <?php foreach ($agents as $agent): ?>
      <article class="agent-directory-card">
        <div class="agent-directory-identity"><span class="agent-directory-avatar" aria-hidden="true"><?= $e(mb_strtoupper(mb_substr($agent['name'], 0, 1))) ?></span><div><span class="agent-directory-status">Verified listing broker</span><h2><?= $e($agent['name']) ?></h2></div></div>
        <div class="agent-directory-contacts">
          <?php $phone = preg_replace('/[^0-9+]/', '', $agent['phone']); $hasPhone = $phone !== '' && preg_match('/\d{3}/', $phone); if ($hasPhone): ?><a href="tel:<?= $e($phone) ?>"><?= $e($agent['phone']) ?></a><?php endif; ?>
          <?php if (filter_var($agent['email'], FILTER_VALIDATE_EMAIL)): ?><a href="mailto:<?= $e($agent['email']) ?>"><?= $e($agent['email']) ?></a><?php endif; ?>
          <?php if (!$hasPhone && !filter_var($agent['email'], FILTER_VALIDATE_EMAIL)): ?><p>This information is not available in the current listing.</p><?php endif; ?>
        </div>
        <h3>Published listings <span><?= count($agent['properties']) ?></span></h3>
        <ul><?php foreach ($agent['properties'] as $property): ?><li><a href="<?= $e(sfc_path('/property-details.php?id=' . $property['id'])) ?>"><span><?= $e($property['name'] ?: 'View property') ?><?php if ($property['barangay'] !== ''): ?><small><?= $e($property['barangay']) ?></small><?php endif; ?></span><span aria-hidden="true">&rarr;</span></a></li><?php endforeach; ?></ul>
      </article>
    <?php endforeach; ?>
    </div>
  <?php endif; ?>
  <p class="agent-directory-note">Contacts are shown as recorded on the published listings you can access. Open a listing for its details and inquiry options.</p>
</main>
<?php
}
