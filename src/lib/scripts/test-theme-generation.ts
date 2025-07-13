import { getThemeData, saveThemeData } from '../services/themeService';

async function testThemeGeneration() {
  try {
    console.log('Testing theme generation...');
    
    // Load current theme data
    const themeData = await getThemeData();
    console.log('Loaded theme data:', JSON.stringify(themeData, null, 2));
    
    // Save theme data to regenerate CSS
    await saveThemeData(themeData);
    console.log('Theme CSS generated successfully!');
    
    // Read the generated CSS to verify 3-shade scales
    const fs = require('fs');
    const cssPath = require('path').join(process.cwd(), 'src', 'app', 'theme.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    
    console.log('\n=== Generated CSS Preview ===');
    console.log('Color scales found:');
    
    // Check for color scale variables
    const colorScaleMatches = cssContent.match(/--color[12]-[123]00:/g);
    if (colorScaleMatches) {
      colorScaleMatches.forEach(match => {
        console.log(`  ${match.trim()}`);
      });
    } else {
      console.log('  No color scale variables found!');
    }
    
    console.log('\n=== Border Color References ===');
    const borderMatches = cssContent.match(/--border[12]-color:.*/g);
    if (borderMatches) {
      borderMatches.forEach(match => {
        console.log(`  ${match.trim()}`);
      });
    }
    
    console.log('\n=== Layout Background References ===');
    const layoutMatches = cssContent.match(/--layout-background[12]-color:.*/g);
    if (layoutMatches) {
      layoutMatches.forEach(match => {
        console.log(`  ${match.trim()}`);
      });
    }
    
  } catch (error) {
    console.error('Error testing theme generation:', error);
  }
}

testThemeGeneration(); 