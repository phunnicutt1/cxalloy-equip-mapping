#!/usr/bin/env node

/**
 * Template System Setup Script
 * Initializes the unified template system in the database
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function setupTemplates() {
  let connection;
  
  try {
    console.log('🚀 Setting up unified template system...');
    
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

    // Read and execute template schema
    console.log('📋 Creating template tables...');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema', 'templates.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    
    // Execute schema
    await connection.query(schemaSQL);
    console.log('✅ Template tables created successfully');

    // Verify table creation
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE table_schema = 'cxalloytq' 
      AND table_name IN ('unified_templates', 'template_points', 'template_applications')
    `);
    
    console.log('📊 Created tables:', tables.map(t => t.TABLE_NAME));
    
    // Check if default templates were inserted
    const [templateCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM unified_templates WHERE is_built_in = TRUE
    `);
    
    console.log(`📚 Default templates: ${templateCount[0].count}`);
    
    console.log('');
    console.log('🎉 Template system setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start your application: npm run dev');
    console.log('2. The unified template system will automatically:');
    console.log('   - Use the database for template storage');
    console.log('   - Provide migration tools for existing localStorage templates');
    console.log('   - Support both point tracking and bulk mapping workflows');
    console.log('');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.code === 'ENOENT') {
      console.error('💡 Make sure you\'re running this from the project root directory');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Check your database credentials in .env.local');
    } else if (error.errno === -4078 || error.code === 'ENOTFOUND') {
      console.error('💡 Make sure MySQL is running on localhost:3306');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run setup
setupTemplates().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});