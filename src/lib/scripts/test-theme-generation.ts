import { getThemeData, buildThemeTokensCss, saveThemeData } from '../services/themeService';

async function testThemeGeneration() {
  try {
    console.log('Testing theme generation...');

    const themeData = await getThemeData();
    console.log('Loaded theme data keys:', Object.keys(themeData).join(', '));

    await saveThemeData(themeData);
    console.log('Theme saved (theme-data.json + Firestore).');

    const css = buildThemeTokensCss(themeData);
    console.log('\n=== Generated token CSS (excerpt) ===');
    const colorScaleMatches = css.match(/--color[12]-[123]00:/g);
    if (colorScaleMatches) {
      colorScaleMatches.forEach((match) => {
        console.log(`  ${match.trim()}`);
      });
    } else {
      console.log('  No color scale variables found!');
    }

    const borderMatches = css.match(/--border[12]-color:.*/g);
    if (borderMatches) {
      console.log('\n=== Border Color References ===');
      borderMatches.forEach((match) => {
        console.log(`  ${match.trim()}`);
      });
    }
  } catch (error) {
    console.error('Error testing theme generation:', error);
  }
}

testThemeGeneration();
