// Simple API test script
const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🚀 Testing CxAlloy Equipment Mapping API Routes...\n');

  // Test 1: Templates API
  try {
    console.log('📋 Testing Templates API...');
    const templatesResponse = await fetch(`${API_BASE}/templates`);
    const templatesData = await templatesResponse.json();
    console.log('✅ Templates API:', templatesResponse.status, templatesData.message);
    console.log(`   Found ${templatesData.templates?.length || 0} templates\n`);
  } catch (error) {
    console.log('❌ Templates API failed:', error.message, '\n');
  }

  // Test 2: Upload API (GET info)
  try {
    console.log('📤 Testing Upload API info...');
    const uploadResponse = await fetch(`${API_BASE}/upload`);
    const uploadData = await uploadResponse.json();
    console.log('✅ Upload API info:', uploadResponse.status, uploadData.message);
    console.log(`   Max file size: ${uploadData.maxFileSize}\n`);
  } catch (error) {
    console.log('❌ Upload API failed:', error.message, '\n');
  }

  // Test 3: Process API (GET status)
  try {
    console.log('⚙️ Testing Process API status...');
    const processResponse = await fetch(`${API_BASE}/process`);
    const processData = await processResponse.json();
    console.log('✅ Process API status:', processResponse.status, processData.message);
    console.log(`   Total jobs: ${processData.total || 0}\n`);
  } catch (error) {
    console.log('❌ Process API failed:', error.message, '\n');
  }

  // Test 4: Export API (GET info)
  try {
    console.log('📊 Testing Export API info...');
    const exportResponse = await fetch(`${API_BASE}/export`);
    const exportData = await exportResponse.json();
    console.log('✅ Export API info:', exportResponse.status, exportData.message);
    console.log(`   Supported formats: ${exportData.supportedFormats?.join(', ')}\n`);
  } catch (error) {
    console.log('❌ Export API failed:', error.message, '\n');
  }

  console.log('🎉 API testing completed!');
}

// Run the test
testAPI().catch(console.error); 