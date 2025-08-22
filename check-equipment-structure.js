const mysql = require('mysql2/promise');

async function checkEquipmentStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '567eight',
    database: 'cxalloytq-dup'
  });
  
  try {
    // Get equipment table structure
    const [columns] = await connection.execute("SHOW COLUMNS FROM equipment");
    console.log('Equipment table columns:');
    columns.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type}`);
    });
    
    // Try to get some sample equipment data
    console.log('\nSample equipment data:');
    const [equipment] = await connection.execute(
      'SELECT * FROM equipment WHERE project_id = 2 LIMIT 5'
    );
    
    if (equipment.length > 0) {
      console.log(`Found ${equipment.length} equipment items with project_id = 2`);
      console.log('Sample item:', JSON.stringify(equipment[0], null, 2));
      
      // Count total
      const [count] = await connection.execute(
        'SELECT COUNT(*) as total FROM equipment WHERE project_id = 2'
      );
      console.log(`\nTotal equipment with project_id = 2: ${count[0].total}`);
    } else {
      console.log('No equipment found with project_id = 2');
      
      // Check what project_ids exist
      const [projects] = await connection.execute(
        'SELECT DISTINCT project_id FROM equipment LIMIT 10'
      );
      console.log('\nAvailable project_ids:', projects.map(p => p.project_id));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkEquipmentStructure();
