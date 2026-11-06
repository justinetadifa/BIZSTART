<?php
declare(strict_types=1);

namespace App\Support;

use DomainException;

/** Groups only broker contacts already disclosed by the property repository. */
final class AgentDirectory
{
    public static function fromProperties(array $properties, array $user, string $query = ''): array
    {
        if (($user['role'] ?? '') !== 'investor' || (int) ($user['id'] ?? 0) < 1) {
            throw new DomainException('An investor account is required to find listing agents.');
        }

        $agents = [];
        foreach ($properties as $property) {
            $contact = $property['brokerContact'] ?? null;
            $brokerId = (int) ($property['contactBrokerUserId'] ?? 0);
            $propertyId = (int) ($property['id'] ?? 0);
            // The caller supplies PropertyRepository::all($user), which applies the
            // publication, broker verification, and contact disclosure policies.
            if (($property['contactMode'] ?? '') !== 'broker' || !is_array($contact) || $brokerId < 1 || $propertyId < 1 || trim((string) ($contact['name'] ?? '')) === '') {
                continue;
            }
            if (!isset($agents[$brokerId])) {
                $agents[$brokerId] = [
                    'name' => trim((string) $contact['name']),
                    'phone' => trim((string) ($contact['phone'] ?? '')),
                    'email' => trim((string) ($contact['email'] ?? '')),
                    'properties' => [],
                ];
            }
            $agents[$brokerId]['properties'][$propertyId] = [
                'id' => $propertyId,
                'name' => trim((string) ($property['name'] ?? '')),
                'barangay' => trim((string) ($property['barangay'] ?? '')),
            ];
        }

        $query = mb_strtolower(trim($query));
        $agents = array_values(array_filter($agents, static function (array $agent) use ($query): bool {
            if ($query === '') return true;
            $values = [$agent['name']];
            foreach ($agent['properties'] as $property) {
                $values[] = $property['name'];
                $values[] = $property['barangay'];
            }
            return str_contains(mb_strtolower(implode(' ', $values)), $query);
        }));
        usort($agents, static fn (array $left, array $right): int => strnatcasecmp($left['name'], $right['name']));
        foreach ($agents as &$agent) $agent['properties'] = array_values($agent['properties']);
        unset($agent);
        return $agents;
    }
}
