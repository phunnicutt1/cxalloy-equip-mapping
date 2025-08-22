const mysql = require('mysql2/promise');

async function queryCxAlloyEquipment() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '567eight',
    database: 'cxalloytq-dup'
  });
  
  try {
    // First, list all tables
    console.log('Listing all tables in database:');
    const [tables] = await connection.execute("SHOW TABLES");
    console.log(tables.map(t => Object.values(t)[0]));
    
    // Check if equipment table exists
    const [equipmentCheck] = await connection.execute(
      "SELECT * FROM information_schema.tables WHERE table_schema = 'cxalloytq-dup' AND table_name = 'equipment'"
    );
    
    if (equipmentCheck.length > 0) {
      console.log('\nFound equipment table!');
      
      // Get equipment with project_id = 2
      const [equipment] = await connection.execute(
        'SELECT id, name, project_id FROM equipment WHERE project_id = 2 LIMIT 10'
      );
      console.log('\nEquipment with project_id = 2:');
      console.log(equipment);
    } else {
      console.log('\nNo equipment table found. Looking for equipment_mapping instead...');
      
      // Check equipment_mapping structure
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM equipment_mapping"
      );
      console.log('\nColumns in equipment_mapping:');
      console.log(columns.map(c => c.Field));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

queryCxAlloyEquipment();
