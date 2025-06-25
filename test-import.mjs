import fetch from 'node-fetch';

async function testImport() {
  try {
    // Try to import a file from Camera Roll
    console.log('Testing file import...');
    const importResponse = await fetch('http://localhost:3000/api/images/local/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourcePath: 'Camera Roll/20160121_084754.jpg'
      })
    });
    
    if (!importResponse.ok) {
      const errorText = await importResponse.text();
      console.error('Import failed:', importResponse.status, errorText);
      return;
    }

    const result = await importResponse.json();
    console.log('Import result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testImport(); 