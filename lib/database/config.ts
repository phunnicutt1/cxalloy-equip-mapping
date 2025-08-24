import mysql, { RowDataPacket } from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
}

// Database configuration for local CxAlloy development
export const databaseConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '567eight',
  database: process.env.DB_NAME || 'cxalloytq',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
  timeout: parseInt(process.env.DB_TIMEOUT || '60000'),
};

// Connection pool for database operations
let pool: mysql.Pool | null = null;

export function getConnectionPool(): mysql.Pool {
  if (!pool) {
    console.log('\x1b[36m[DATABASE]\x1b[0m Creating connection pool', {
      host: databaseConfig.host,
      port: databaseConfig.port,
      database: databaseConfig.database,
      user: databaseConfig.user,
      connectionLimit: databaseConfig.connectionLimit
    });
    
    pool = mysql.createPool({
      host: databaseConfig.host,
      port: databaseConfig.port,
      user: databaseConfig.user,
      password: databaseConfig.password,
      database: databaseConfig.database,
      waitForConnections: true,
      connectionLimit: databaseConfig.connectionLimit,
      queueLimit: 0,
      // Additional MySQL settings for development
      multipleStatements: false,
      timezone: 'Z',
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: false,
    });
  }
  
  return pool;
}

// Test database connection
export async function testConnection(): Promise<{ success: boolean; error?: string; info?: Record<string, unknown> }> {
  try {
    const pool = getConnectionPool();
    const connection = await pool.getConnection();
    
    console.log('\x1b[33m[DATABASE]\x1b[0m Testing connection...');
    
    // Test basic connectivity
    await connection.execute('SELECT 1 as test');
    
    // Get database info
    const [rows] = await connection.execute<RowDataPacket[]>(`
      SELECT 
        DATABASE() as current_database,
        VERSION() as mysql_version,
        USER() as connected_user
    `);
    
    connection.release();
    
    const dbInfo = rows.length > 0 ? rows[0] : undefined;

    console.log('\x1b[32m[DATABASE]\x1b[0m Connection test successful', dbInfo);
    
    return {
      success: true,
      info: dbInfo,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    console.error('\x1b[31m[DATABASE ERROR]\x1b[0m Connection test failed:', error);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Close connection pool
export async function closeConnectionPool(): Promise<void> {
  if (pool) {
    console.log('[DATABASE] Closing connection pool');
    await pool.end();
    pool = null;
  }
}

// Database query helper with debugging
export async function executeQuery<T>(
  query: string, 
  params: (string | number | boolean | null)[] = [],
  debugName = 'QUERY'
): Promise<T[]> {
  const startTime = Date.now();
  
  try {
    const pool = getConnectionPool();
    
    console.log(`\x1b[36m[DATABASE ${debugName}]\x1b[0m Executing query`, {
      query: query.replace(/\s+/g, ' ').trim(),
      params: params.length > 0 ? params : undefined,
      timestamp: new Date().toISOString()
    });
    
    const [rows] = await pool.execute(query, params);
    const duration = Date.now() - startTime;
    
    console.log(`\x1b[32m[DATABASE ${debugName}]\x1b[0m Query completed`, {
      duration: `${duration}ms`,
      rowCount: Array.isArray(rows) ? rows.length : 'N/A'
    });
    
    return rows as T[];
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`\x1b[31m[DATABASE ${debugName} ERROR]\x1b[0m Query failed`, {
      error: errorMessage,
      query: query.replace(/\s+/g, ' ').trim(),
      params: params.length > 0 ? params : undefined,
      duration: `${duration}ms`
    });
    
    throw error;
  }
}

// Transaction helper
export async function executeTransaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getConnectionPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('\x1b[36m[DATABASE TRANSACTION]\x1b[0m Started');
    
    const result = await callback(connection);
    
    await connection.commit();
    console.log('\x1b[32m[DATABASE TRANSACTION]\x1b[0m Committed');
    
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('\x1b[31m[DATABASE TRANSACTION ERROR]\x1b[0m Rolled back:', error);
    throw error;
  } finally {
    connection.release();
  }
} 