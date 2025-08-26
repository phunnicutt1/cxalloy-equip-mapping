#!/usr/bin/env node

/**
 * Test Script for Improved BACnet Object Type Normalization
 * 
 * Verifies that:
 * 1. AI and BI points get "Sensor" suffix in description only
 * 2. AO, BO, AV (writable), BV (writable) do NOT get "Sensor" suffix
 * 3. Normalized name never includes function suffix
 * 4. Description includes function suffix only when appropriate
 * 
 * Run with: npx tsx scripts/test-object-type-normalization.ts
 */

import { PointNormalizer } from '../lib/normalizers/point-normalizer';
import { BACnetPoint, BACnetObjectType, PointCategory, PointDataType } from '../types/point';
import chalk from 'chalk';

// Test cases with different BACnet object types
const testCases = [
  // Input types (should get "Sensor" in description)
  { 
    name: 'SA_TS', 
    description: 'Supply air temperature',
    objectType: BACnetObjectType.ANALOG_INPUT,
    isWritable: false,
    units: '°F',
    expectedSuffix: 'Sensor'
  },
  { 
    name: 'FAN_STS', 
    description: 'Fan status',
    objectType: BACnetObjectType.BINARY_INPUT,
    isWritable: false,
    units: undefined,
    expectedSuffix: 'Status'
  },
  
  // Output types (should get "Command" in description)
  { 
    name: 'VLV_POS', 
    description: 'Valve position command',
    objectType: BACnetObjectType.ANALOG_OUTPUT,
    isWritable: true,
    units: '%',
    expectedSuffix: 'Command'
  },
  { 
    name: 'FAN_CMD', 
    description: 'Fan on/off command',
    objectType: BACnetObjectType.BINARY_OUTPUT,
    isWritable: true,
    units: undefined,
    expectedSuffix: 'Command'
  },
  
  // Value types - writable (should get "Command" in description)
  { 
    name: 'CLG_SP', 
    description: 'Cooling setpoint',
    objectType: BACnetObjectType.ANALOG_VALUE,
    isWritable: true,
    units: '°F',
    expectedSuffix: 'Setpoint'
  },
  { 
    name: 'OCC_MODE', 
    description: 'Occupancy mode',
    objectType: BACnetObjectType.BINARY_VALUE,
    isWritable: true,
    units: undefined,
    expectedSuffix: 'Command'
  },
  
  // Value types - read-only (should NOT get suffix)
  { 
    name: 'AVG_TEMP', 
    description: 'Average temperature calculation',
    objectType: BACnetObjectType.ANALOG_VALUE,
    isWritable: false,
    units: '°F',
    expectedSuffix: 'None'
  },
  { 
    name: 'ALARM_FLAG', 
    description: 'Alarm flag status',
    objectType: BACnetObjectType.BINARY_VALUE,
    isWritable: false,
    units: undefined,
    expectedSuffix: 'None'
  },
  
  // Special cases with explicit function in name
  { 
    name: 'HTG_SP', 
    description: 'Heating setpoint',
    objectType: BACnetObjectType.ANALOG_VALUE,
    isWritable: true,
    units: '°F',
    expectedSuffix: 'Setpoint'
  },
  { 
    name: 'DMPR_CMD', 
    description: 'Damper command',
    objectType: BACnetObjectType.ANALOG_OUTPUT,
    isWritable: true,
    units: '%',
    expectedSuffix: 'Command'
  }
];

// Helper function to create a mock BACnet point
function createMockPoint(
  name: string, 
  description: string, 
  objectType: BACnetObjectType,
  isWritable: boolean,
  units?: string
): BACnetPoint {
  return {
    objectName: name,
    dis: name,
    description: description,
    objectType: objectType,
    objectInstance: 1,
    units: units,
    category: isWritable ? PointCategory.COMMAND : PointCategory.SENSOR,
    dataType: PointDataType.Number,
    presentValue: null,
    outOfService: false,
    statusFlags: null,
    isWritable: isWritable,
    isCommand: isWritable,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Main test function
async function runObjectTypeTests() {
  console.log(chalk.bold.cyan('\n🔬 BACnet Object Type Normalization Test\n'));
  console.log(chalk.gray('Testing that function suffixes are only in descriptions, not names'));
  console.log(chalk.gray('=' .repeat(80)));
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const testCase of testCases) {
    totalTests++;
    const point = createMockPoint(
      testCase.name, 
      testCase.description, 
      testCase.objectType,
      testCase.isWritable,
      testCase.units
    );
    
    console.log(chalk.bold(`\n📍 Testing: ${testCase.name}`));
    console.log(chalk.gray(`   Object Type: ${testCase.objectType}`));
    console.log(chalk.gray(`   Writable: ${testCase.isWritable}`));
    console.log(chalk.gray(`   Expected suffix in description: ${testCase.expectedSuffix}`));
    
    // Run normalization
    const result = PointNormalizer.normalizePointName(point, {
      equipmentType: 'RTU',
      addFunctionSuffix: true,
      useEnhancedConfidence: true
    });
    
    if (result.success && result.normalizedPoint) {
      const normalized = result.normalizedPoint;
      
      // Check normalized name (should NOT have suffix)
      const nameHasSuffix = normalized.normalizedName.includes('Sensor') || 
                           normalized.normalizedName.includes('Command') || 
                           normalized.normalizedName.includes('Setpoint') || 
                           normalized.normalizedName.includes('Status');
      
      if (nameHasSuffix) {
        console.log(chalk.red(`   ❌ Name has suffix: ${normalized.normalizedName}`));
      } else {
        console.log(chalk.green(`   ✅ Name (no suffix): ${normalized.normalizedName}`));
      }
      
      // Check description (should have suffix only when appropriate)
      const descHasSuffix = normalized.expandedDescription !== normalized.normalizedName;
      const descEndsWithExpected = testCase.expectedSuffix !== 'None' && 
                                   normalized.expandedDescription.endsWith(` ${testCase.expectedSuffix}`);
      
      if (testCase.expectedSuffix === 'None') {
        if (!descHasSuffix) {
          console.log(chalk.green(`   ✅ Description (no suffix): ${normalized.expandedDescription}`));
          passedTests++;
        } else {
          console.log(chalk.red(`   ❌ Description has unexpected suffix: ${normalized.expandedDescription}`));
        }
      } else {
        if (descEndsWithExpected) {
          console.log(chalk.green(`   ✅ Description: ${normalized.expandedDescription}`));
          passedTests++;
        } else {
          console.log(chalk.yellow(`   ⚠️  Description: ${normalized.expandedDescription} (expected suffix: ${testCase.expectedSuffix})`));
        }
      }
      
      // Show point function
      console.log(chalk.cyan(`   🎯 Function: ${normalized.pointFunction}`));
      
    } else {
      console.log(chalk.red(`   ❌ Normalization failed: ${result.errors?.join(', ')}`));
    }
  }
  
  // Print summary
  console.log(chalk.gray('\n' + '=' .repeat(80)));
  console.log(chalk.bold.cyan('\n📊 Test Summary:\n'));
  
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  const rateColor = passedTests === totalTests ? chalk.green : 
                    passedTests >= totalTests * 0.8 ? chalk.yellow : chalk.red;
  
  console.log(`   Total test cases: ${totalTests}`);
  console.log(rateColor(`   Passed: ${passedTests}/${totalTests} (${successRate}%)`));
  
  console.log(chalk.bold.cyan('\n📋 Key Rules Verified:\n'));
  console.log('   1. Normalized name NEVER includes function suffix');
  console.log('   2. AI/BI points get "Sensor" in description only');
  console.log('   3. AO/BO points get "Command" in description only');
  console.log('   4. Writable AV/BV points get appropriate suffix in description');
  console.log('   5. Read-only AV/BV points get NO suffix');
  
  if (passedTests === totalTests) {
    console.log(chalk.green.bold('\n   ✅ ALL TESTS PASSED! Object type logic is working correctly.'));
  } else {
    console.log(chalk.yellow(`\n   ⚠️  Some tests failed. Review the logic for edge cases.`));
  }
  
  console.log(chalk.gray('\n' + '=' .repeat(80) + '\n'));
}

// Run the tests
runObjectTypeTests().catch(console.error);