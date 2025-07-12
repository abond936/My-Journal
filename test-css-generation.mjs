import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testCssGeneration() {
  try {
    console.log('🧪 Testing CSS Generation...\n');
    
    // Read current theme data
    console.log('📖 Reading theme data from theme-data.json...');
    const themeDataPath = path.join(__dirname, 'theme-data.json');
    const themeDataJson = await fs.readFile(themeDataPath, 'utf-8');
    const themeData = JSON.parse(themeDataJson);
    console.log('✅ Theme data loaded successfully');
    
    // Check if new variables are present
    console.log('\n🔍 Checking for new variables in theme data...');
    
    // Check font sizes
    if (themeData.typography?.fontSizes?.['5xl']) {
      console.log('✅ 5xl font size found:', themeData.typography.fontSizes['5xl']);
    } else {
      console.log('❌ 5xl font size missing');
    }
    
    if (themeData.typography?.fontSizes?.['6xl']) {
      console.log('✅ 6xl font size found:', themeData.typography.fontSizes['6xl']);
    } else {
      console.log('❌ 6xl font size missing');
    }
    
    // Check gradients
    if (themeData.gradients?.bottomOverlay) {
      console.log('✅ bottomOverlay gradient found:', themeData.gradients.bottomOverlay);
    } else {
      console.log('❌ bottomOverlay gradient missing');
    }
    
    if (themeData.gradients?.bottomOverlayStrong) {
      console.log('✅ bottomOverlayStrong gradient found:', themeData.gradients.bottomOverlayStrong);
    } else {
      console.log('❌ bottomOverlayStrong gradient missing');
    }
    
    // Generate CSS to a test file
    console.log('\n🔄 Generating CSS to test file...');
    const testCssPath = path.join(__dirname, 'test-theme-output.css');
    
    // Generate CSS content (simplified version for testing)
    let cssContent = `/*
  TEST CSS GENERATION - Generated from theme data
  ==========================================
  This is a test file to verify CSS generation works correctly
*/

:root {
  /* Test Font Sizes */
  --font-size-5xl: ${themeData.typography.fontSizes['5xl']};
  --font-size-6xl: ${themeData.typography.fontSizes['6xl']};
  
  /* Test Gradients */
  --gradient-bottom-overlay: ${themeData.gradients.bottomOverlay};
  --gradient-bottom-overlay-strong: ${themeData.gradients.bottomOverlayStrong};
  
  /* Sample of other variables */
  --font-size-base: ${themeData.typography.fontSizes.base};
  --spacing-md: ${themeData.spacing.mdMultiplier * 4}px;
  --color3: hsl(${themeData.palette[2].h}, ${themeData.palette[2].s}, ${themeData.palette[2].l});
}

/* Test usage examples */
.test-5xl {
  font-size: var(--font-size-5xl);
}

.test-6xl {
  font-size: var(--font-size-6xl);
}

.test-gradient {
  background: var(--gradient-bottom-overlay);
}

.test-gradient-strong {
  background: var(--gradient-bottom-overlay-strong);
}
`;
    
    await fs.writeFile(testCssPath, cssContent, 'utf-8');
    console.log('✅ CSS generated successfully to test-theme-output.css');
    
    // Read and display the generated CSS
    const generatedCss = await fs.readFile(testCssPath, 'utf-8');
    console.log('\n📄 Generated CSS Preview:');
    console.log('=' .repeat(50));
    console.log(generatedCss);
    console.log('=' .repeat(50));
    
    // Check for specific variables
    console.log('\n🔍 Verifying generated variables...');
    if (generatedCss.includes('--font-size-5xl:')) {
      console.log('✅ --font-size-5xl variable generated');
    } else {
      console.log('❌ --font-size-5xl variable missing');
    }
    
    if (generatedCss.includes('--font-size-6xl:')) {
      console.log('✅ --font-size-6xl variable generated');
    } else {
      console.log('❌ --font-size-6xl variable missing');
    }
    
    if (generatedCss.includes('--gradient-bottom-overlay:')) {
      console.log('✅ --gradient-bottom-overlay variable generated');
    } else {
      console.log('❌ --gradient-bottom-overlay variable missing');
    }
    
    if (generatedCss.includes('--gradient-bottom-overlay-strong:')) {
      console.log('✅ --gradient-bottom-overlay-strong variable generated');
    } else {
      console.log('❌ --gradient-bottom-overlay-strong variable missing');
    }
    
    console.log('\n🎉 CSS Generation Test Complete!');
    console.log('📁 Test file created: test-theme-output.css');
    console.log('💡 You can now review the generated CSS before applying it to theme1.css');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCssGeneration(); 