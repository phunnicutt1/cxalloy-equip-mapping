#!/usr/bin/env node

/**
 * Test Script for Database Logging with Color Coding
 * 
 * This script demonstrates the enhanced database logging with color-coded messages:
 * - 🟢 Green: Success messages
 * - 🔴 Red: Error messages
 * - 🟡 Yellow: Warning/info messages
 * - 🔵 Cyan: General database operations
 * 
 * Run with: npx tsx scripts/test-db-logging.ts
 */

import { testConnection } from '../lib/database/config';
import { EquipmentDatabaseService } from '../lib/database/equipment-db-service';

async function testDatabaseLogging() {
  console.log('\n📋 Database Logging Test - Color Coding Demo\n');
  console.log('=' .repeat(60));
  
  // Test 1: Connection Test
  console.log('\n1️⃣  Testing Database Connection...\n');
  const connectionResult = await testConnection();
  
  if (connectionResult.success) {
    console.log('✅ Connection successful');
  } else {
    console.log('❌ Connection failed');
    return;
  }
  
  // Test 2: Clear Data (Warning message)
  console.log('\n2️⃣  Testing Data Clear Operation...\n');
  const dbService = new EquipmentDatabaseService();
  
  try {
    await dbService.clearAllData();
    console.log('✅ Data cleared successfully');
  } catch (error) {
    console.log('❌ Data clear failed');
  }
  
  // Test 3: Simulate a failure scenario
  console.log('\n3️⃣  Simulating Database Error Scenario...\n');
  
  // Try to store equipment with invalid data to trigger error
  try {
    // This will fail if the database is not properly configured
    await dbService.storeEquipmentWithPoints(
      'test-file-id',
      {
        id: 'test-equipment-1',
        name: 'Test Equipment',
        displayName: 'Test Equipment Display',
        type: 'Unknown',
        filename: 'test.trio',
        status: 'ACTIVE' as any,
        connectionState: 'CONNECTED' as any,
        connectionStatus: 'ok',
        vendor: 'Test Vendor',
        modelName: 'Test Model',
        location: null,
        description: 'Test Description',
        points: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      [],
      'test-session'
    );
    console.log('✅ Equipment stored successfully');
  } catch (error) {
    console.log('❌ Equipment storage failed (expected if tables don\'t exist)');
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 Logging Color Legend:\n');
  console.log('\x1b[32m[SUCCESS]\x1b[0m - Green: Successful operations');
  console.log('\x1b[31m[ERROR]\x1b[0m - Red: Failed operations or errors');
  console.log('\x1b[33m[WARNING]\x1b[0m - Yellow: Warning or caution messages');
  console.log('\x1b[36m[INFO]\x1b[0m - Cyan: General information messages');
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n✨ Database logging test complete!\n');
}

// Run the test
testDatabaseLogging().catch(console.error);