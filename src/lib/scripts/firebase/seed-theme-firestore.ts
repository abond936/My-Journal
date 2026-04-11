/**
 * Writes theme-data.json → Firestore app_settings/theme (same path as Theme admin save).
 *
 * Usage: npm run seed:theme-firestore
 */
import { syncThemeFromJsonToFirestore } from '@/lib/services/themeService';

async function main() {
  await syncThemeFromJsonToFirestore();
  console.log('Theme synced to Firestore (app_settings/theme).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
