#!/usr/bin/env node

/**
 * Test Script for BACnet Point Normalization
 * 
 * This script verifies that:
 * 1. BACnet acronyms are being properly expanded
 * 2. Project Haystack tags are being generated
 * 3. Normalization confidence scores are reasonable
 * 
 * Run with: npx tsx scripts/test-normalization.ts
 */

import { PointNormalizer } from '../lib/normalizers/point-normalizer';
import { HaystackTagger } from '../lib/taggers/haystack-tagger';
import { BACnetPoint, BACnetObjectType, PointCategory, PointDataType } from '../types/point';
import { BACNET_ACRONYMS } from '../lib/dictionaries/bacnet-acronyms';
import chalk from 'chalk';

// Test cases representing actual point names from TRIO files
const testCases = [
  // Temperature points
  { name: 'SA_TS', description: 'Supply air temperature', units: '°F' },
  { name: 'RA_TS', description: 'Return Air Temperature', units: '°F' },
  { name: 'OAT', description: 'Outside Air Temperature', units: '°F' },
  { name: 'ZN-T', description: 'Zone Temperature', units: '°F' },
  { name: 'MAT', description: 'Mixed Air Temperature', units: '°F' },
  { name: 'DX_TS', description: 'DX Cooling Coil Leaving Temperature', units: '°F' },
  
  // Humidity points
  { name: 'RA_HS', description: 'Return Air Humidity', units: '%RH' },
  { name: 'ZN_RH', description: 'Zone Relative Humidity', units: '%' },
  
  // Control points
  { name: 'HGR_SIG', description: 'Hot Gas Reheat Signal', units: '%' },
  { name: 'DMPR_POS', description: 'Damper Position', units: '%' },
  { name: 'VLV_POS', description: 'Valve Position', units: '%' },
  { name: 'SF_SPD_CMD', description: 'Supply Fan Speed Command', units: '%' },
  
  // Setpoints
  { name: 'CLG_SP', description: 'Cooling Setpoint', units: '°F' },
  { name: 'HTG_SP', description: 'Heating Setpoint', units: '°F' },
  { name: 'DPSP', description: 'Duct Pressure Setpoint', units: 'inH2O' },
  
  // Status points
  { name: 'FAN_STS', description: 'Fan Status', units: undefined },
  { name: 'OCC_ST', description: 'Occupancy Status', units: undefined },
  { name: 'ALARM', description: 'Alarm Status', units: undefined },
  
  // Complex names
  { name: 'AVG_RM_TEMP', description: 'Average room temperature', units: '°F' },
  { name: 'EF1_CMD', description: 'Exhaust Fan 1 Command', units: undefined },
  { name: 'CHW_VLV_POS', description: 'Chilled Water Valve Position', units: '%' }
];

// Helper function to create a mock BACnet point
function createMockPoint(name: string, description: string, units?: string): BACnetPoint {
  return {
    objectName: name,
    dis: name,
    description: description,
    objectType: BACnetObjectType.ANALOG_INPUT,
    objectInstance: 1,
    units: units,
    category: PointCategory.SENSOR,
    dataType: PointDataType.Number,
    presentValue: null,
    outOfService: false,
    statusFlags: null,
    isWritable: false,
    isCommand: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Main test function
async function runNormalizationTests() {
  console.log(chalk.bold.cyan('\n🔬 BACnet Point Normalization Test Suite\n'));
  console.log(chalk.gray('=' .repeat(80)));
  
  // Statistics
  let totalTests = 0;
  let successfulExpansions = 0;
  let haystackTagsGenerated = 0;
  let highConfidenceResults = 0;
  
  // Test each case
  for (const testCase of testCases) {
    totalTests++;
    const point = createMockPoint(testCase.name, testCase.description, testCase.units);
    
    console.log(chalk.bold(`\n📍 Testing: ${testCase.name}`));
    console.log(chalk.gray(`   Original description: ${testCase.description}`));
    if (testCase.units) {
      console.log(chalk.gray(`   Units: ${testCase.units}`));
    }
    
    // Run normalization
    const result = PointNormalizer.normalizePointName(point, {
      equipmentType: 'RTU',
      addFunctionSuffix: true,
      useEnhancedConfidence: true
    });
    
    if (result.success && result.normalizedPoint) {
      const normalized = result.normalizedPoint;
      
      // Check if expansion occurred
      const hasExpansion = normalized.normalizedName !== testCase.name;
      if (hasExpansion) {
        successfulExpansions++;
        console.log(chalk.green(`   ✅ Normalized: ${normalized.normalizedName}`));
      } else {
        console.log(chalk.yellow(`   ⚠️  No expansion: ${normalized.normalizedName}`));
      }
      
      // Show expanded acronyms
      if (result.expandedAcronyms && result.expandedAcronyms.length > 0) {
        console.log(chalk.blue('   📖 Expanded acronyms:'));
        result.expandedAcronyms.forEach(acronym => {
          console.log(chalk.blue(`      ${acronym.original} → ${acronym.expanded} (confidence: ${acronym.confidence.toFixed(2)})`));
        });
      }
      
      // Check confidence
      const confidence = normalized.confidenceScore || 0;
      const confidenceColor = confidence >= 0.7 ? chalk.green : confidence >= 0.5 ? chalk.yellow : chalk.red;
      console.log(confidenceColor(`   📊 Confidence: ${confidence.toFixed(2)} (${normalized.confidence})`));
      if (confidence >= 0.7) highConfidenceResults++;
      
      // Check Haystack tags
      if (normalized.haystackTags && normalized.haystackTags.length > 0) {
        haystackTagsGenerated++;
        const tagNames = normalized.haystackTags.map(tag => tag.name).join(', ');
        console.log(chalk.magenta(`   🏷️  Haystack tags: ${tagNames}`));
      }
      
      // Show point function
      if (normalized.pointFunction) {
        console.log(chalk.cyan(`   🎯 Function: ${normalized.pointFunction}`));
      }
      
    } else {
      console.log(chalk.red(`   ❌ Normalization failed: ${result.errors?.join(', ')}`));
    }
  }
  
  // Print summary statistics
  console.log(chalk.gray('\n' + '=' .repeat(80)));
  console.log(chalk.bold.cyan('\n📊 Test Summary:\n'));
  
  const expansionRate = ((successfulExpansions / totalTests) * 100).toFixed(1);
  const haystackRate = ((haystackTagsGenerated / totalTests) * 100).toFixed(1);
  const confidenceRate = ((highConfidenceResults / totalTests) * 100).toFixed(1);
  
  console.log(`   Total test cases: ${totalTests}`);
  console.log(`   Successful expansions: ${successfulExpansions}/${totalTests} (${expansionRate}%)`);
  console.log(`   Haystack tags generated: ${haystackTagsGenerated}/${totalTests} (${haystackRate}%)`);
  console.log(`   High confidence (≥0.7): ${highConfidenceResults}/${totalTests} (${confidenceRate}%)`);
  
  // Check acronym coverage
  console.log(chalk.bold.cyan('\n📚 Acronym Dictionary Coverage:\n'));
  console.log(`   Total acronyms in dictionary: ${BACNET_ACRONYMS.length}`);
  
  // Find which acronyms from test cases are in dictionary
  const testAcronyms = new Set<string>();
  testCases.forEach(tc => {
    const tokens = tc.name.split(/[_\-\s]+/);
    tokens.forEach(token => testAcronyms.add(token.toUpperCase()));
  });
  
  let foundInDictionary = 0;
  let missingFromDictionary: string[] = [];
  
  testAcronyms.forEach(acronym => {
    const found = BACNET_ACRONYMS.find(a => a.acronym.toUpperCase() === acronym);
    if (found) {
      foundInDictionary++;
    } else {
      missingFromDictionary.push(acronym);
    }
  });
  
  console.log(`   Test acronyms found in dictionary: ${foundInDictionary}/${testAcronyms.size}`);
  if (missingFromDictionary.length > 0) {
    console.log(chalk.yellow(`   Missing acronyms: ${missingFromDictionary.join(', ')}`));
  }
  
  // Overall assessment
  console.log(chalk.bold.cyan('\n🎯 Overall Assessment:\n'));
  if (expansionRate === '100.0' && confidenceRate === '100.0') {
    console.log(chalk.green.bold('   ✅ EXCELLENT: All acronyms are being expanded with high confidence!'));
  } else if (parseFloat(expansionRate) >= 80 && parseFloat(confidenceRate) >= 70) {
    console.log(chalk.green('   ✅ GOOD: Most acronyms are being expanded successfully.'));
  } else if (parseFloat(expansionRate) >= 60) {
    console.log(chalk.yellow('   ⚠️  FAIR: Some acronyms are being expanded, but coverage could be improved.'));
  } else {
    console.log(chalk.red('   ❌ NEEDS IMPROVEMENT: Many acronyms are not being expanded.'));
  }
  
  console.log(chalk.gray('\n' + '=' .repeat(80) + '\n'));
}

// Run the tests
runNormalizationTests().catch(console.error);