import fetch from 'node-fetch';

async function testAPI() {
  try {
    // Test folder tree
    console.log('Testing folder tree endpoint...');
    const treeResponse = await fetch('http://localhost:3000/api/images/local/folder-tree');
    const tree = await treeResponse.json();
    console.log('Folder tree:', JSON.stringify(tree, null, 2));

    // Test folder contents
    console.log('\nTesting folder contents endpoint...');
    const contentsResponse = await fetch('http://localhost:3000/api/images/local/folder-contents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath: 'Camera Roll' })
    });
    const contents = await contentsResponse.json();
    console.log('Folder contents:', JSON.stringify(contents, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI(); 