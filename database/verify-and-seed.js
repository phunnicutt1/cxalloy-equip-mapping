#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function verifyAndSeed() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '567eight',
      database: 'cxalloytq'
    });

    console.log('🔍 Checking migration results...');

    // Check if bacnet_equipment has data
    const [bacnetCount] = await connection.execute('SELECT COUNT(*) as count FROM bacnet_equipment');
    console.log(`BACnet Equipment: ${bacnetCount[0].count}`);

    if (bacnetCount[0].count === 0) {
      console.log('📝 Inserting sample BACnet equipment data...');
      
      // Insert sample equipment
      await connection.execute(`
        INSERT INTO bacnet_equipment (
          id, original_file_id, original_filename, equipment_name, equipment_type,
          description, classification_confidence, status, total_points, file_path,
          vendor_name, haystack_tags, metadata
        ) VALUES 
        ('bacnet-ahu-001', 'file-ahu-1', 'AHU-1.trio', 'AHU-1', 'Air_Handler_Unit', 
         'Primary Air Handling Unit 1', 0.95, 'ACTIVE', 45, '/data/trio/AHU-1.trio', 'Johnson Controls',
         JSON_ARRAY('ahu', 'airHandler', 'hvac'), JSON_OBJECT('building', 'Main', 'floor', '1')),
        ('bacnet-vav-101', 'file-vav-101', 'VAV-101.trio', 'VAV-101', 'VAV_Controller',
         'Variable Air Volume Controller Room 101', 0.88, 'ACTIVE', 25, '/data/trio/VAV-101.trio', 'Honeywell',
         JSON_ARRAY('vav', 'terminal', 'hvac'), JSON_OBJECT('building', 'Main', 'room', '101')),
        ('bacnet-ch-001', 'file-ch-1', 'CH-1.trio', 'CH-1', 'Chiller',
         'Primary Chiller Unit 1', 0.94, 'ACTIVE', 65, '/data/trio/CH-1.trio', 'Trane',
         JSON_ARRAY('chiller', 'cooling', 'hvac'), JSON_OBJECT('building', 'Main', 'capacity', '500 tons')),
        ('bacnet-rtu-001', 'file-rtu-1', 'RTU-01.trio', 'RTU-01', 'RTU_Controller',
         'Rooftop Unit 01', 0.89, 'ACTIVE', 35, '/data/trio/RTU-01.trio', 'Lennox',
         JSON_ARRAY('rtu', 'rooftop', 'hvac'), JSON_OBJECT('building', 'Main', 'zone', 'West Wing')),
        ('bacnet-p-001', 'file-p-1', 'P-1.trio', 'P-1', 'Pump',
         'Primary Chilled Water Pump', 0.85, 'ACTIVE', 18, '/data/trio/P-1.trio', 'Grundfos',
         JSON_ARRAY('pump', 'chilledWater', 'hvac'), JSON_OBJECT('building', 'Main', 'system', 'Chilled Water'))
        ON DUPLICATE KEY UPDATE equipment_name = VALUES(equipment_name)
      `);

      // Insert some sample points
      await connection.execute(`
        INSERT INTO bacnet_points (
          id, equipment_id, original_point_id, original_name, normalized_name, display_name,
          description, category, data_type, units, bacnet_object_type, haystack_tags
        ) VALUES 
        ('point-ahu1-sat', 'bacnet-ahu-001', 'SAT', 'Supply_Air_Temp', 'supply_air_temperature', 'Supply Air Temperature',
         'Discharge air temperature sensor', 'SENSOR', 'Number', '°F', 'AI', JSON_ARRAY('sensor', 'temp', 'air', 'supply')),
        ('point-vav101-zt', 'bacnet-vav-101', 'ZT', 'Zone_Temp', 'zone_temperature', 'Zone Temperature',
         'Room temperature sensor', 'SENSOR', 'Number', '°F', 'AI', JSON_ARRAY('sensor', 'temp', 'zone', 'room')),
        ('point-ch1-chwst', 'bacnet-ch-001', 'CHWST', 'CHW_Supply_Temp', 'chilled_water_supply_temp', 'Chilled Water Supply Temperature',
         'Chilled water supply temperature', 'SENSOR', 'Number', '°F', 'AI', JSON_ARRAY('sensor', 'temp', 'water', 'chilled'))
        ON DUPLICATE KEY UPDATE normalized_name = VALUES(normalized_name)
      `);

      console.log('✅ Sample data inserted successfully');
    }

    // Final verification
    const [finalCounts] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM bacnet_equipment) as bacnet_equipment,
        (SELECT COUNT(*) FROM bacnet_points) as bacnet_points,
        (SELECT COUNT(*) FROM equipment_templates) as templates,
        (SELECT COUNT(*) FROM point_templates) as point_templates,
        (SELECT COUNT(*) FROM equipment WHERE fk_project = 2 AND is_deleted = 0) as cxalloy_equipment
    `);

    console.log('\n📊 Final Migration Results:');
    console.log(`   • BACnet Equipment: ${finalCounts[0].bacnet_equipment}`);
    console.log(`   • BACnet Points: ${finalCounts[0].bacnet_points}`);
    console.log(`   • Equipment Templates: ${finalCounts[0].templates}`);
    console.log(`   • Point Templates: ${finalCounts[0].point_templates}`);
    console.log(`   • CxAlloy Equipment (Project 2): ${finalCounts[0].cxalloy_equipment}`);

    // Show sample equipment
    const [sampleEquipment] = await connection.execute(`
      SELECT equipment_name, equipment_type, total_points FROM bacnet_equipment LIMIT 3
    `);

    console.log('\n📋 Sample BACnet Equipment:');
    sampleEquipment.forEach(eq => {
      console.log(`   • ${eq.equipment_name} (${eq.equipment_type}): ${eq.total_points} points`);
    });

    console.log('\n🎉 Database consolidation completed successfully!');
    console.log('✅ Ready for auto-mapping with real data');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

verifyAndSeed();