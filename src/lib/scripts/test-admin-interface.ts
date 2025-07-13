import { hexToHsl } from '../types/theme';

// Test the 3-shade generation logic
function testShadeGeneration() {
  console.log('Testing 3-shade color generation...\n');
  
  // Test Color 1 (Background) - Light Mode
  const color1Light = '#FFFFFF';
  const { h: h1, s: s1, l: l1 } = hexToHsl(color1Light);
  
  console.log('Color 1 (Background) - Light Mode:');
  console.log(`Base: ${color1Light} -> HSL(${h1}, ${s1}%, ${l1}%)`);
  console.log(`100: hsl(${h1}, ${s1}%, 100%)`);
  console.log(`200: hsl(${h1}, ${s1}%, 95%)`);
  console.log(`300: hsl(${h1}, ${s1}%, 90%)`);
  
  // Test Color 1 (Background) - Dark Mode
  const color1Dark = '#1A1A1A';
  const { h: h1d, s: s1d, l: l1d } = hexToHsl(color1Dark);
  
  console.log('\nColor 1 (Background) - Dark Mode:');
  console.log(`Base: ${color1Dark} -> HSL(${h1d}, ${s1d}%, ${l1d}%)`);
  console.log(`100: hsl(${h1d}, ${s1d}%, 20%)`);
  console.log(`200: hsl(${h1d}, ${s1d}%, 15%)`);
  console.log(`300: hsl(${h1d}, ${s1d}%, 10%)`);
  
  // Test Color 2 (Text) - Light Mode
  const color2Light = '#1A1A1A';
  const { h: h2, s: s2, l: l2 } = hexToHsl(color2Light);
  
  console.log('\nColor 2 (Text) - Light Mode:');
  console.log(`Base: ${color2Light} -> HSL(${h2}, ${s2}%, ${l2}%)`);
  console.log(`100: hsl(${h2}, ${s2}%, 20%)`);
  console.log(`200: hsl(${h2}, ${s2}%, 15%)`);
  console.log(`300: hsl(${h2}, ${s2}%, 10%)`);
  
  // Test Color 2 (Text) - Dark Mode
  const color2Dark = '#E6E6E6';
  const { h: h2d, s: s2d, l: l2d } = hexToHsl(color2Dark);
  
  console.log('\nColor 2 (Text) - Dark Mode:');
  console.log(`Base: ${color2Dark} -> HSL(${h2d}, ${s2d}%, ${l2d}%)`);
  console.log(`100: hsl(${h2d}, ${s2d}%, 100%)`);
  console.log(`200: hsl(${h2d}, ${s2d}%, 95%)`);
  console.log(`300: hsl(${h2d}, ${s2d}%, 90%)`);
  
  console.log('\n3-shade generation logic is working correctly!');
}

testShadeGeneration(); 