const mysql = require('mysql2/promise');

async function queryCxAlloyEquipment() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '567eight',
    database: 'cxalloytq-dup'
  });
  
  try {
    // Get equipment with fk_project = 2
    console.log('Querying equipment with fk_project = 2...\n');
    const [equipment] = await connection.execute(
      'SELECT equipment_id, fk_project, name, description, fk_type, fk_discipline, fk_space FROM equipment WHERE fk_project = 2 AND is_deleted = 0 LIMIT 20'
    );
    
    if (equipment.length > 0) {
      console.log(`Found ${equipment.length} equipment items with fk_project = 2:\n`);
      equipment.forEach(eq => {
        console.log(`ID: ${eq.equipment_id}, Name: ${eq.name}, Type: ${eq.fk_type}`);
      });
      
      // Count total
      const [count] = await connection.execute(
        'SELECT COUNT(*) as total FROM equipment WHERE fk_project = 2 AND is_deleted = 0'
      );
      console.log(`\nTotal equipment with fk_project = 2: ${count[0].total}`);
    } else {
      console.log('No equipment found with fk_project = 2');
      
      // Check what project_ids exist
      const [projects] = await connection.execute(
        'SELECT DISTINCT fk_project, COUNT(*) as count FROM equipment WHERE is_deleted = 0 GROUP BY fk_project ORDER BY count DESC LIMIT 10'
      );
      console.log('\nAvailable projects and equipment counts:');
      projects.forEach(p => {
        console.log(`  Project ${p.fk_project}: ${p.count} equipment`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

queryCxAlloyEquipment();
