import { getThemeData, saveThemeData } from './src/lib/services/themeService';

async function testSimplifiedTheme() {
  try {
    console.log('🎨 Testing Simplified Theme System...\n');
    
    // Read current theme data
    console.log('📖 Reading theme data from theme-data.json...');
    const themeData = await getThemeData();
    console.log('✅ Theme data loaded successfully');
    
    // Check if themeColors exist
    if (themeData.themeColors && themeData.themeColors.length > 0) {
      console.log('✅ Theme colors found:');
      themeData.themeColors.forEach(color => {
        console.log(`  Color ${color.id} (${color.name}):`);
        console.log(`    Light: ${color.light.hex} (HSL: ${color.light.h}, ${color.light.s}, ${color.light.l})`);
        console.log(`    Dark:  ${color.dark.hex} (HSL: ${color.dark.h}, ${color.dark.s}, ${color.dark.l})`);
      });
    } else {
      console.log('❌ No theme colors found in data');
      return;
    }
    
    // Generate CSS with new system
    console.log('\n🔄 Generating CSS with simplified theme system...');
    await saveThemeData(themeData);
    console.log('✅ CSS generated successfully');
    
    console.log('\n🎯 Changes made:');
    console.log('- Removed complex mathematical color scale generation');
    console.log('- Added simple light/dark color pairs for colors 1 and 2');
    console.log('- Updated CSS to use direct color variables');
    console.log('- Simplified dark mode overrides');
    
    console.log('\n📝 Next steps:');
    console.log('1. Check the generated theme.css file');
    console.log('2. Test light/dark mode switching');
    console.log('3. Update ThemeAdmin interface to show 4 color squares');
    
  } catch (error) {
    console.error('❌ Error testing simplified theme:', error);
  }
}

testSimplifiedTheme(); 