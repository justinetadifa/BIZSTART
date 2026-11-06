<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/Support/AgentDirectory.php';

use App\Support\AgentDirectory;

$checks = 0;
function agent_check(bool $condition, string $message): void
{
    global $checks;
    if (!$condition) throw new RuntimeException($message);
    $checks++;
}

$investor = ['id' => 9, 'role' => 'investor'];
// These represent rows after PropertyRepository's visibility and disclosure policy.
$properties = [
    ['id' => 20, 'name' => 'Poro commercial lot', 'barangay' => 'Poro', 'contactMode' => 'broker', 'contactBrokerUserId' => 4, 'brokerContact' => ['name' => 'Zoe Broker', 'phone' => '+63 912 345 6789', 'email' => 'zoe@example.test']],
    ['id' => 21, 'name' => 'City office', 'barangay' => 'Catbangen', 'contactMode' => 'broker', 'contactBrokerUserId' => 4, 'brokerContact' => ['name' => 'Zoe Broker', 'phone' => '+63 912 345 6789', 'email' => 'zoe@example.test']],
    ['id' => 22, 'name' => 'Warehouse', 'barangay' => 'Poro', 'contactMode' => 'broker', 'contactBrokerUserId' => 5, 'brokerContact' => ['name' => 'Ana Broker', 'phone' => '', 'email' => '']],
    ['id' => 23, 'name' => 'Open listing', 'contactMode' => 'open_listing', 'contactBrokerUserId' => 4, 'brokerContact' => ['name' => 'Hidden stale contact']],
    ['id' => 24, 'name' => 'Broker verification no longer valid', 'contactMode' => 'broker', 'contactBrokerUserId' => 6, 'brokerContact' => null],
    ['id' => 25, 'name' => 'Private owner contact', 'contactMode' => 'open_listing', 'ownerContact' => ['name' => 'Private Owner', 'phone' => '09999999999']],
];
$agents = AgentDirectory::fromProperties($properties, $investor);
agent_check(count($agents) === 2, 'Only designated broker contacts disclosed by the listing repository appear.');
agent_check(array_column($agents, 'name') === ['Ana Broker', 'Zoe Broker'], 'Agents are sorted by actual recorded name.');
agent_check(count($agents[1]['properties']) === 2, 'Multiple published listings for one agent share a card.');
agent_check(!str_contains(json_encode($agents), 'Private Owner'), 'Owner contacts are not repurposed as agent profiles.');
agent_check(!str_contains(json_encode($agents), 'Hidden stale contact'), 'Open listing mode does not reveal stale broker assignments.');
agent_check(count(AgentDirectory::fromProperties($properties, $investor, 'zOe')) === 1, 'Agent name search ignores case.');
agent_check(count(AgentDirectory::fromProperties($properties, $investor, 'poro')) === 2, 'Search supports associated barangays.');
agent_check(count(AgentDirectory::fromProperties($properties, $investor, 'City office')) === 1, 'Search supports associated property names.');
agent_check(AgentDirectory::fromProperties($properties, $investor, 'no such agent') === [], 'Zero matches remain an empty directory.');
agent_check(AgentDirectory::fromProperties([], $investor) === [], 'No published broker contacts remain an empty directory.');
agent_check($agents[0]['email'] === '' && $agents[0]['phone'] === '', 'Missing contact channels remain empty.');
foreach ([[], ['id' => 1, 'role' => 'admin'], ['id' => 2, 'role' => 'seller'], ['id' => 0, 'role' => 'investor']] as $user) {
    try {
        AgentDirectory::fromProperties($properties, $user);
        agent_check(false, 'A valid investor account is required.');
    } catch (DomainException) {
        agent_check(true, 'A valid investor account is required.');
    }
}
$page = file_get_contents(dirname(__DIR__) . '/investor-dashboard.php');
$view = file_get_contents(dirname(__DIR__) . '/app/Support/AgentDirectoryView.php');
$shell = file_get_contents(dirname(__DIR__) . '/app/Support/CityShell.php');
agent_check(str_contains($page, "sfc_require_role('investor'"), 'Directory page uses the existing investor authentication gate.');
agent_check(str_contains($view, "['properties']->all(\$context['user'])"), 'Directory reuses the current user publication and contact policy.');
agent_check(str_contains($view, '/property-details.php?id='), 'Agent cards link to the corresponding listing.');
agent_check(str_contains($view, 'Unable to load listing agents') && str_contains($view, 'No agents are currently listed'), 'Database failures and empty data have distinct states.');
agent_check(str_contains($shell, "['Find Agent', '/investor-dashboard.php?view=agents', 'agents']"), 'Investor navigation includes Find Agent.');

echo "Find Agent: {$checks} checks passed." . PHP_EOL;
