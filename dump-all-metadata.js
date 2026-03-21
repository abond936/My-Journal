#!/usr/bin/env node

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

console.log('DUMP ALL METADATA - SEE EXACTLY WHAT IS THERE');
console.log('==============================================');
console.log('');

// Check if Sharp is available
let sharp;
try {
    sharp = require('sharp');
    console.log('✅ Sharp library loaded successfully');
} catch (error) {
    console.log('❌ ERROR: Sharp library is not available');
    process.exit(1);
}

async function dumpMetadata() {
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

        // Process first image only for detailed dump
        const testFile = imageFiles[0];
        console.log(`=== DUMPING METADATA FOR: ${testFile} ===`);
        console.log('');

        const imagePath = path.join(targetDir, testFile);
        const image = sharp(imagePath);
        const metadata = await image.metadata();
        
        console.log('=== BASIC METADATA ===');
        console.log(`Width: ${metadata.width}`);
        console.log(`Height: ${metadata.height}`);
        console.log(`Format: ${metadata.format}`);
        console.log(`Size: ${metadata.size || 'unknown'} bytes`);
        console.log(`Channels: ${metadata.channels}`);
        console.log(`Space: ${metadata.space}`);
        console.log(`Depth: ${metadata.depth}`);
        console.log(`Density: ${metadata.density}`);
        console.log(`Orientation: ${metadata.orientation}`);
        console.log('');

        // Dump EXIF data
        if (metadata.exif) {
            console.log('=== EXIF DATA (RAW) ===');
            console.log(`Length: ${metadata.exif.length} bytes`);
            console.log('Raw hex (first 200 bytes):');
            console.log(metadata.exif.toString('hex').substring(0, 200));
            console.log('');
            
            console.log('Raw as UTF-8:');
            console.log(metadata.exif.toString('utf8'));
            console.log('');
            
            try {
                const ExifReader = require('exif-reader');
                const exif = ExifReader(metadata.exif);
                console.log('=== EXIF DATA (PARSED) ===');
                console.log(JSON.stringify(exif, null, 2));
                console.log('');
            } catch (e) {
                console.log('EXIF parsing failed:', e.message);
                console.log('');
            }
        } else {
            console.log('=== EXIF DATA ===');
            console.log('No EXIF data found');
            console.log('');
        }

        // Dump IPTC data
        if (metadata.iptc) {
            console.log('=== IPTC DATA ===');
            console.log(`Length: ${metadata.iptc.length} bytes`);
            console.log('');
            
            console.log('As UTF-8:');
            console.log(metadata.iptc.toString('utf8'));
            console.log('');
            
            console.log('As Latin1:');
            console.log(metadata.iptc.toString('latin1'));
            console.log('');
            
            console.log('As hex (first 200 bytes):');
            console.log(metadata.iptc.toString('hex').substring(0, 200));
            console.log('');
            
            // Save IPTC to file for manual inspection
            const iptcFile = path.join(targetDir, 'iptc_dump.txt');
            await fs.writeFile(iptcFile, metadata.iptc.toString('utf8'));
            console.log(`IPTC data saved to: ${iptcFile}`);
            console.log('');
        } else {
            console.log('=== IPTC DATA ===');
            console.log('No IPTC data found');
            console.log('');
        }

        // Dump XMP data
        if (metadata.xmp) {
            console.log('=== XMP DATA ===');
            console.log(`Length: ${metadata.xmp.length} bytes`);
            console.log('');
            
            console.log('As UTF-8:');
            console.log(metadata.xmp.toString('utf8'));
            console.log('');
            
            // Save XMP to file for manual inspection
            const xmpFile = path.join(targetDir, 'xmp_dump.xml');
            await fs.writeFile(xmpFile, metadata.xmp.toString('utf8'));
            console.log(`XMP data saved to: ${xmpFile}`);
            console.log('');
        } else {
            console.log('=== XMP DATA ===');
            console.log('No XMP data found');
            console.log('');
        }

        // Dump XMP as string if available
        if (metadata.xmpAsString) {
            console.log('=== XMP AS STRING ===');
            console.log(metadata.xmpAsString);
            console.log('');
        }

        // Show all available metadata keys
        console.log('=== ALL METADATA KEYS ===');
        console.log(Object.keys(metadata));
        console.log('');

        console.log('=== FILES CREATED ===');
        console.log('Check these files in your photo folder:');
        if (metadata.iptc) console.log('- iptc_dump.txt (IPTC data)');
        if (metadata.xmp) console.log('- xmp_dump.xml (XMP data)');
        console.log('');

        console.log('Press any key to exit...');
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', process.exit.bind(process, 0));

    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        process.exit(1);
    }
}

dumpMetadata().catch(error => {
    console.log(`❌ FATAL ERROR: ${error.message}`);
    process.exit(1);
}); 