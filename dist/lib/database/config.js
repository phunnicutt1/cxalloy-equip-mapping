"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfig = void 0;
exports.getConnectionPool = getConnectionPool;
exports.testConnection = testConnection;
exports.closeConnectionPool = closeConnectionPool;
exports.executeQuery = executeQuery;
exports.executeTransaction = executeTransaction;
const promise_1 = __importDefault(require("mysql2/promise"));
// Database configuration for local CxAlloy development
exports.databaseConfig = {
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
let pool = null;
function getConnectionPool() {
    if (!pool) {
        console.log('[DATABASE] Creating connection pool', {
            host: exports.databaseConfig.host,
            port: exports.databaseConfig.port,
            database: exports.databaseConfig.database,
            user: exports.databaseConfig.user,
            connectionLimit: exports.databaseConfig.connectionLimit
        });
        pool = promise_1.default.createPool({
            host: exports.databaseConfig.host,
            port: exports.databaseConfig.port,
            user: exports.databaseConfig.user,
            password: exports.databaseConfig.password,
            database: exports.databaseConfig.database,
            waitForConnections: true,
            connectionLimit: exports.databaseConfig.connectionLimit,
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
async function testConnection() {
    try {
        const pool = getConnectionPool();
        const connection = await pool.getConnection();
        console.log('[DATABASE] Testing connection...');
        // Test basic connectivity
        const [rows] = await connection.execute('SELECT 1 as test');
        // Get database info
        const [dbInfo] = await connection.execute(`
      SELECT 
        DATABASE() as current_database,
        VERSION() as mysql_version,
        USER() as connected_user
    `);
        connection.release();
        console.log('[DATABASE] Connection test successful', dbInfo);
        return {
            success: true,
            info: dbInfo
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        console.error('[DATABASE] Connection test failed:', error);
        return {
            success: false,
            error: errorMessage
        };
    }
}
// Close connection pool
async function closeConnectionPool() {
    if (pool) {
        console.log('[DATABASE] Closing connection pool');
        await pool.end();
        pool = null;
    }
}
// Database query helper with debugging
async function executeQuery(query, params = [], debugName = 'QUERY') {
    const startTime = Date.now();
    try {
        const pool = getConnectionPool();
        console.log(`[DATABASE ${debugName}] Executing query`, {
            query: query.replace(/\s+/g, ' ').trim(),
            params: params.length > 0 ? params : undefined,
            timestamp: new Date().toISOString()
        });
        const [rows] = await pool.execute(query, params);
        const duration = Date.now() - startTime;
        console.log(`[DATABASE ${debugName}] Query completed`, {
            duration: `${duration}ms`,
            rowCount: Array.isArray(rows) ? rows.length : 'N/A'
        });
        return rows;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[DATABASE ${debugName}] Query failed`, {
            error: errorMessage,
            query: query.replace(/\s+/g, ' ').trim(),
            params: params.length > 0 ? params : undefined,
            duration: `${duration}ms`
        });
        throw error;
    }
}
// Transaction helper
async function executeTransaction(callback) {
    const pool = getConnectionPool();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        console.log('[DATABASE TRANSACTION] Started');
        const result = await callback(connection);
        await connection.commit();
        console.log('[DATABASE TRANSACTION] Committed');
        return result;
    }
    catch (error) {
        await connection.rollback();
        console.error('[DATABASE TRANSACTION] Rolled back due to error:', error);
        throw error;
    }
    finally {
        connection.release();
    }
}
