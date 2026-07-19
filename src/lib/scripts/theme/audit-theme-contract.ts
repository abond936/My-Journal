import { buildThemeContractInventory } from '@/lib/theme/themeContractInventory';

const inventory = buildThemeContractInventory();

console.log(JSON.stringify(inventory, null, 2));

if (
  inventory.unresolvedBindings.length > 0
  || inventory.typography.unownedRoles.length > 0
  || inventory.typography.duplicateRoles.length > 0
  || inventory.typography.unknownRoles.length > 0
) {
  process.exitCode = 1;
}
