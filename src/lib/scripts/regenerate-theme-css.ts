import { getThemeData, saveThemeData } from '../services/themeService';

async function regenerateThemeCSS() {
  try {
    console.log('Regenerating theme CSS...');
    
    // Load current theme data
    const themeData = await getThemeData();
    
    // Save theme data to regenerate CSS
    await saveThemeData(themeData);
    console.log('Theme CSS regenerated successfully!');
    
  } catch (error) {
    console.error('Error regenerating theme CSS:', error);
  }
}

regenerateThemeCSS(); 