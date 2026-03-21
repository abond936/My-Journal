#!/usr/bin/env node

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

console.log('IPTC/XMP Debug Script');
console.log('=====================');
console.log('');

// Check if Sharp is available
let sharp;
try {
    sharp = require('sharp');
    console.log('✅ Sharp library loaded successfully');
} catch (error) {
    console.log('❌ ERROR: Sharp library is not available');
    console.log('Error:', error.message);
    process.exit(1);
}

async function debugIptcXmp() {
    // Get directory from command line or use current directory
    const targetDir = process.argv[2] || process.cwd();
    console.log(`Target directory: ${targetDir}`);
    console.log('');

    // Check if directory exists
    if (!fsSync.existsSync(targetDir)) {
        console.log('❌ ERROR: Directory does not exist');
        process.exit(1);
    }

    // Get image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp'];
    
    try {
        const files = await fs.readdir(targetDir);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return imageExtensions.includes(ext);
        });

        console.log(`Found ${imageFiles.length} image file(s)`);
        console.log('');

        if (imageFiles.length === 0) {
            console.log('No image files found');
            process.exit(1);
        }

        // Test with first image
        const testFile = imageFiles[0];
        console.log(`Testing with: ${testFile}`);
        console.log('');

        const imagePath = path.join(targetDir, testFile);
        
        try {
            const image = sharp(imagePath);
            const metadata = await image.metadata();
            
            console.log('=== IPTC DATA ANALYSIS ===');
            if (metadata.iptc) {
                console.log('IPTC data exists, length:', metadata.iptc.length, 'bytes');
                console.log('');
                
                // Save IPTC data to file for analysis
                const iptcPath = path.join(targetDir, 'iptc_debug.bin');
                await fs.writeFile(iptcPath, metadata.iptc);
                console.log('Saved IPTC data to: iptc_debug.bin');
                
                // Try different encodings
                console.log('');
                console.log('IPTC as UTF-8:');
                console.log(metadata.iptc.toString('utf8'));
                console.log('');
                
                console.log('IPTC as hex (first 200 bytes):');
                console.log(metadata.iptc.toString('hex').substring(0, 200));
                console.log('');
                
                // Look for specific patterns
                const iptcString = metadata.iptc.toString('utf8');
                console.log('Searching for metadata patterns...');
                
                // Look for common IPTC markers
                const patterns = [
                    'Title', 'Subject', 'Keywords', 'Description', 'Caption',
                    'ObjectName', 'By-line', 'Credit', 'Source', 'Copyright'
                ];
                
                patterns.forEach(pattern => {
                    const matches = iptcString.match(new RegExp(pattern, 'gi'));
                    if (matches) {
                        console.log(`Found "${pattern}": ${matches.length} occurrences`);
                    }
                });
                
            } else {
                console.log('No IPTC data found');
            }
            console.log('');

            console.log('=== XMP DATA ANALYSIS ===');
            if (metadata.xmp) {
                console.log('XMP data exists, length:', metadata.xmp.length, 'bytes');
                console.log('');
                
                // Save XMP data to file for analysis
                const xmpPath = path.join(targetDir, 'xmp_debug.xml');
                await fs.writeFile(xmpPath, metadata.xmp);
                console.log('Saved XMP data to: xmp_debug.xml');
                
                const xmpString = metadata.xmp.toString('utf8');
                console.log('XMP content:');
                console.log(xmpString);
                console.log('');
                
                // Look for specific XMP patterns
                console.log('Searching for XMP patterns...');
                const xmpPatterns = [
                    'dc:title', 'dc:subject', 'dc:description', 'dc:creator',
                    'rdf:li', 'rdf:Description', 'xmp:CreatorTool'
                ];
                
                xmpPatterns.forEach(pattern => {
                    const matches = xmpString.match(new RegExp(pattern, 'gi'));
                    if (matches) {
                        console.log(`Found "${pattern}": ${matches.length} occurrences`);
                    }
                });
                
            } else {
                console.log('No XMP data found');
            }
            console.log('');

        } catch (error) {
            console.log('❌ Error reading image:', error.message);
        }

    } catch (error) {
        console.log('❌ Error reading directory:', error.message);
    }

    console.log('Press any key to exit...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
}

debugIptcXmp().catch(error => {
    console.log('❌ FATAL ERROR:', error.message);
    process.exit(1);
}); 