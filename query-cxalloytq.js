const mysql = require("mysql2/promise");

async function queryCxAlloyEquipment() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "567eight",
    database: "cxalloytq"
  });
  
  try {
    console.log("Connected to database: cxalloytq");
    console.log("");
    
    // Check for equipment with fk_project = 2
    console.log("Querying equipment with fk_project = 2...");
    const [equipment] = await connection.execute(
      "SELECT equipment_id, fk_project, name, description FROM equipment WHERE fk_project = 2 AND is_deleted = 0 LIMIT 10"
    );
    
    if (equipment.length > 0) {
      console.log("Found " + equipment.length + " equipment items:");
      console.log("");
      equipment.forEach(eq => {
        console.log("  ID: " + eq.equipment_id + ", Name: " + eq.name);
      });
      
      // Count total
      const [count] = await connection.execute(
        "SELECT COUNT(*) as total FROM equipment WHERE fk_project = 2 AND is_deleted = 0"
      );
      console.log("");
      console.log("Total equipment with fk_project = 2: " + count[0].total);
    } else {
      // Check what projects have equipment
      const [projects] = await connection.execute(
        "SELECT fk_project, COUNT(*) as equipment_count FROM equipment WHERE is_deleted = 0 GROUP BY fk_project ORDER BY equipment_count DESC LIMIT 10"
      );
      
      console.log("");
      console.log("No equipment found with fk_project = 2");
      console.log("");
      console.log("Projects with equipment:");
      projects.forEach(p => {
        console.log("  Project " + p.fk_project + ": " + p.equipment_count + " equipment");
      });
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await connection.end();
  }
}

queryCxAlloyEquipment();
