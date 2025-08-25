/**
 * Database connection service
 */

import mysql from 'mysql2/promise';

let connectionPool: mysql.Pool | null = null;

export async function getDb(): Promise<mysql.PoolConnection> {
  if (!connectionPool) {
    connectionPool = mysql.createPool({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '567eight',
      database: 'cxalloytq',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  
  return await connectionPool.getConnection();
}