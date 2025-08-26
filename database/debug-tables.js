#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function debugTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '567eight',
      database: 'cxalloytq'
    });

    console.log('🔍 Checking database tables and data...\n');

    // Check all tables in database
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📊 Available tables:');
    tables.forEach(table => {
      const tableName = table[`Tables_in_cxalloytq`];
      console.log(`   • ${tableName}`);
    });

    console.log('\n🔍 Checking data in equipment-related tables:\n');

    // Check bacnet_equipment table
    try {
      const [bacnetEquipment] = await connection.execute('SELECT COUNT(*) as count FROM bacnet_equipment');
      console.log(`bacnet_equipment: ${bacnetEquipment[0].count} records`);
      
      if (bacnetEquipment[0].count > 0) {
        const [sampleBacnet] = await connection.execute('SELECT equipment_name, equipment_type, total_points FROM bacnet_equipment LIMIT 3');
        console.log('   Sample records:');
        sampleBacnet.forEach(row => {
          console.log(`   • ${row.equipment_name} (${row.equipment_type}) - ${row.total_points} points`);
        });
      }
    } catch (e) {
      console.log(`bacnet_equipment: Table doesn't exist or error - ${e.message}`);
    }

    // Check equipment_mapping table
    try {
      const [equipmentMapping] = await connection.execute('SELECT COUNT(*) as count FROM equipment_mapping');
      console.log(`\nequipment_mapping: ${equipmentMapping[0].count} records`);
      
      if (equipmentMapping[0].count > 0) {
        const [sampleMapping] = await connection.execute('SELECT equipment_name, equipment_type, total_points FROM equipment_mapping LIMIT 5');
        console.log('   Sample records:');
        sampleMapping.forEach(row => {
          console.log(`   • ${row.equipment_name} (${row.equipment_type}) - ${row.total_points} points`);
        });
      }
    } catch (e) {
      console.log(`equipment_mapping: Table doesn't exist or error - ${e.message}`);
    }

    // Check point_mapping table
    try {
      const [pointMapping] = await connection.execute('SELECT COUNT(*) as count FROM point_mapping');
      console.log(`\npoint_mapping: ${pointMapping[0].count} records`);
    } catch (e) {
      console.log(`point_mapping: Table doesn't exist or error - ${e.message}`);
    }

    // Check bacnet_points table
    try {
      const [bacnetPoints] = await connection.execute('SELECT COUNT(*) as count FROM bacnet_points');
      console.log(`bacnet_points: ${bacnetPoints[0].count} records`);
    } catch (e) {
      console.log(`bacnet_points: Table doesn't exist or error - ${e.message}`);
    }

    // Check CxAlloy equipment from project 2
    try {
      const [cxalloyEquipment] = await connection.execute('SELECT COUNT(*) as count FROM equipment WHERE fk_project = 2 AND is_deleted = 0');
      console.log(`\nCxAlloy equipment (project 2): ${cxalloyEquipment[0].count} records`);
    } catch (e) {
      console.log(`CxAlloy equipment: Table doesn't exist or error - ${e.message}`);
    }

    console.log('\n✅ Database analysis complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

debugTables();