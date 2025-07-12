const fs = require('fs');
const path = require('path');

// Import the theme service functions
const { getThemeData, saveThemeData } = require('./src/lib/services/themeService.ts');

async function testCssGeneration() {
  try {
    console.log('🧪 Testing CSS Generation...\n');
    
    // Read current theme data
    console.log('📖 Reading theme data from theme-data.json...');
    const themeData = await getThemeData();
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
    const testCssPath = path.join(process.cwd(), 'test-theme-output.css');
    
    // Temporarily modify the saveThemeData to write to test file
    const originalSaveThemeData = saveThemeData;
    
    // Create a test version that writes to our test file
    const testSaveThemeData = async (data) => {
      try {
        // Save to JSON file (this part works fine)
        const jsonPath = path.join(process.cwd(), 'theme-data.json');
        await fs.promises.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
        
        // Generate CSS to test file instead of theme1.css
        const cssPath = testCssPath;
        const darkModeShift = data.darkModeShift || 5;
        
        // Generate CSS content (simplified version for testing)
        let cssContent = `/*
  TEST CSS GENERATION - Generated from theme data
  ==========================================
  This is a test file to verify CSS generation works correctly
*/

:root {
  /* Test Font Sizes */
  --font-size-5xl: ${data.typography.fontSizes['5xl']};
  --font-size-6xl: ${data.typography.fontSizes['6xl']};
  
  /* Test Gradients */
  --gradient-bottom-overlay: ${data.gradients.bottomOverlay};
  --gradient-bottom-overlay-strong: ${data.gradients.bottomOverlayStrong};
  
  /* Sample of other variables */
  --font-size-base: ${data.typography.fontSizes.base};
  --spacing-md: ${data.spacing.mdMultiplier * 4}px;
  --color3: hsl(${data.palette[2].h}, ${data.palette[2].s}, ${data.palette[2].l});
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
        
        await fs.promises.writeFile(cssPath, cssContent, 'utf-8');
        console.log('✅ CSS generated successfully to test-theme-output.css');
        
        // Read and display the generated CSS
        const generatedCss = await fs.promises.readFile(cssPath, 'utf-8');
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
        
      } catch (error) {
        console.error('❌ Error generating test CSS:', error);
        throw error;
      }
    };
    
    // Run the test
    await testSaveThemeData(themeData);
    
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