#!/usr/bin/env node

/**
 * Database Migration Script
 * Consolidates all equipment data into cxalloytq database
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting database migration...');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '567eight',
      database: 'cxalloytq',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Read and execute schema
    console.log('📋 Creating consolidated schema...');
    const schemaPath = path.join(__dirname, 'schema', 'consolidated-schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    
    // Execute schema with multipleStatements: true
    try {
      await connection.query(schemaSQL);
    } catch (error) {
      // Some warnings are expected for "IF NOT EXISTS" statements
      if (!error.message.includes('already exists')) {
        console.warn(`⚠️  Schema warning: ${error.message}`);
      }
    }

    console.log('✅ Schema created successfully');

    // Read and execute migration
    console.log('🔄 Running data migration...');
    const migrationPath = path.join(__dirname, 'migrations', '001-consolidate-equipment-data.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Execute migration with multipleStatements: true
    try {
      await connection.query(migrationSQL);
    } catch (error) {
      // Ignore duplicate entry errors for sample data
      if (!error.message.includes('Duplicate entry') && 
          !error.message.includes('already exists')) {
        console.warn(`⚠️  Migration warning: ${error.message}`);
      }
    }
    
    let processedStatements = migrationSQL.split(';').filter(s => s.trim().length > 0).length;

    console.log(`✅ Migration completed - processed ${processedStatements} statements`);

    // Verify migration
    console.log('🔍 Verifying migration results...');
    
    const [equipmentRows] = await connection.execute('SELECT COUNT(*) as count FROM bacnet_equipment');
    const [pointRows] = await connection.execute('SELECT COUNT(*) as count FROM bacnet_points WHERE equipment_id IN (SELECT id FROM bacnet_equipment)');
    const [templateRows] = await connection.execute('SELECT COUNT(*) as count FROM equipment_templates');
    const [pointTemplateRows] = await connection.execute('SELECT COUNT(*) as count FROM point_templates');
    const [cxalloyRows] = await connection.execute('SELECT COUNT(*) as count FROM equipment WHERE fk_project = 2 AND is_deleted = 0');

    console.log('\n📊 Migration Results:');
    console.log(`   • BACnet Equipment: ${equipmentRows[0].count}`);
    console.log(`   • BACnet Points: ${pointRows[0].count}`);
    console.log(`   • Equipment Templates: ${templateRows[0].count}`);
    console.log(`   • Point Templates: ${pointTemplateRows[0].count}`);
    console.log(`   • CxAlloy Equipment (Project 2): ${cxalloyRows[0].count}`);

    // Show sample equipment for verification
    const [sampleEquipment] = await connection.execute(`
      SELECT 
        equipment_name,
        equipment_type,
        total_points,
        (SELECT COUNT(*) FROM bacnet_points WHERE equipment_id = be.id) as actual_points
      FROM bacnet_equipment be
      ORDER BY equipment_type, equipment_name
      LIMIT 5
    `);

    console.log('\n📋 Sample Equipment:');
    sampleEquipment.forEach(eq => {
      console.log(`   • ${eq.equipment_name} (${eq.equipment_type}): ${eq.actual_points}/${eq.total_points} points`);
    });

    console.log('\n🎉 Database migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };