import mysql from "mysql2/promise"

// Check for required environment variables
const requiredEnvVars = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"]
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v])

if (missingEnvVars.length > 0) {
  console.error("Missing required MySQL environment variables:", missingEnvVars)
}

// Database configuration
const dbConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "furnish_db",
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 30000,
  acquireTimeout: 30000,
}

// Create connection pool for efficient connection reuse
let pool: mysql.Pool | null = null

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

// Execute a query with automatic connection handling
export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  // Check if env vars are set
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE) {
    console.error("MySQL environment variables not configured")
    throw new Error("Database not configured. Please set MySQL environment variables.")
  }
  
  let connection: mysql.PoolConnection | null = null
  try {
    connection = await getPool().getConnection()
    const [results] = await connection.execute(sql, params)
    return results as T
  } catch (error) {
    const err = error as Error & { code?: string; errno?: number }
    console.error("Database query error:", {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sql: sql.substring(0, 100),
    })
    
    if (err.code === "ECONNREFUSED") {
      throw new Error("Cannot connect to database. Please check your MySQL server is running.")
    }
    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      throw new Error("Database access denied. Please check your MySQL credentials.")
    }
    if (err.code === "ER_BAD_DB_ERROR") {
      throw new Error("Database does not exist. Please run the setup script.")
    }
    
    throw new Error(`Database error: ${err.message}`)
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

// Execute multiple queries in a transaction
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection()
  await connection.beginTransaction()
  
  try {
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// Utility for pagination
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function getPaginationSQL(params: PaginationParams, allowedSortFields: string[]): { 
  limitSQL: string
  orderSQL: string
  offset: number
  limit: number 
} {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(1000, Math.max(1, params.limit || 20))
  const offset = (page - 1) * limit
  
  let orderSQL = ""
  if (params.sortBy && allowedSortFields.includes(params.sortBy)) {
    const order = params.sortOrder === "desc" ? "DESC" : "ASC"
    orderSQL = `ORDER BY ${params.sortBy} ${order}`
  }
  
  return {
    limitSQL: `LIMIT ${limit} OFFSET ${offset}`,
    orderSQL,
    offset,
    limit,
  }
}

// Close the pool (for graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
