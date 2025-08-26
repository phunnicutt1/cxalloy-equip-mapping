#!/usr/bin/env node

/**
 * Test Equipment Classification for VVR_2.1 and L_5
 */

// Mock the modules for testing
const mockConnectorService = {
  getEquipmentMetadata: (name) => {
    const mockData = {
      'VVR_2.1': { vendor: 'Johnson Controls', model: 'VMA1400' },
      'L_5': { vendor: 'Belimo', model: 'LMV-D3' }
    };
    return mockData[name] || { vendor: null, model: null };
  }
};

// Test classification patterns
const EQUIPMENT_PATTERNS = [
  { pattern: /^VVR[-_]?\d*\.?\d*$/i, type: 'VAV_CONTROLLER', confidence: 0.95 },
  { pattern: /^L[-_]?\d+$/i, type: 'LAB_AIR_VALVE', confidence: 0.95 }
];

function testClassification(filename) {
  const baseName = filename.replace(/\.(trio|csv|json)$/i, '');
  console.log(`\n🔍 Testing classification for: ${filename}`);
  console.log(`   Base name: ${baseName}`);
  
  // Get metadata
  const metadata = mockConnectorService.getEquipmentMetadata(baseName);
  console.log(`   Metadata: Vendor="${metadata.vendor}", Model="${metadata.model}"`);
  
  // Test pattern matching
  for (const { pattern, type, confidence } of EQUIPMENT_PATTERNS) {
    if (pattern.test(baseName)) {
      console.log(`   ✅ Pattern match: ${pattern} → ${type} (confidence: ${confidence})`);
      return { type, confidence, baseName, pattern: pattern.toString() };
    }
  }
  
  console.log(`   ❌ No pattern match found`);
  return null;
}

console.log('🧪 Equipment Classification Test');
console.log('=' .repeat(50));

// Test cases
const testFiles = ['VVR_2.1.trio', 'L_5.trio', 'AHU_1.trio', 'unknown.trio'];

const results = testFiles.map(testClassification);

console.log('\n📊 Summary Results:');
console.log('-'.repeat(30));
results.forEach((result, index) => {
  const filename = testFiles[index];
  if (result) {
    console.log(`${filename}: ${result.type} (${result.confidence * 100}% confidence)`);
  } else {
    console.log(`${filename}: Unknown equipment type`);
  }
});

console.log('\n✅ Expected Results for Screenshot:');
console.log('VVR_2.1.trio: VAV_CONTROLLER → "Variable Air Volume Controller Room 2.1"');
console.log('L_5.trio: LAB_AIR_VALVE → "Laboratory Exhaust Air Valve Controller"');
