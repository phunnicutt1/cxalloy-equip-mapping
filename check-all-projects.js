const mysql = require('mysql2/promise');

async function checkAllProjects() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '567eight',
    database: 'cxalloytq-dup'
  });
  
  try {
    // First check if there's any equipment at all
    const [totalCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM equipment WHERE is_deleted = 0'
    );
    console.log(`Total equipment in database: ${totalCount[0].total}\n`);
    
    // Get all unique fk_project values
    const [projects] = await connection.execute(`
      SELECT 
        fk_project,
        COUNT(*) as equipment_count
      FROM equipment
      WHERE is_deleted = 0
      GROUP BY fk_project
      ORDER BY equipment_count DESC
    `);
    
    console.log('Projects with equipment:');
    console.log('========================');
    projects.forEach(p => {
      console.log(`Project ID: ${p.fk_project}, Equipment Count: ${p.equipment_count}`);
    });
    
    // Get some sample equipment
    console.log('\nSample equipment (first 10):');
    console.log('=============================');
    
    const [equipment] = await connection.execute(
      'SELECT equipment_id, fk_project, name, description FROM equipment WHERE is_deleted = 0 LIMIT 10'
    );
    
    equipment.forEach(eq => {
      console.log(`  - [Project ${eq.fk_project}] ${eq.name} (ID: ${eq.equipment_id})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAllProjects();
