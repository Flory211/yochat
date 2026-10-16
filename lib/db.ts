import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Cloudflare D1 types
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(): Promise<T | undefined>;
  all<T = any>(): Promise<{ results: T[] }>;
  run(): Promise<D1Result>;
}

export interface D1Result {
  success: boolean;
  meta: {
    changes: number;
    last_row_id: number;
  };
}

// Local SQLite database (for development only)
let localDb: any = null;
let isProduction = false;

try {
  isProduction = process.env.NODE_ENV === 'production';
} catch {
  isProduction = false;
}

if (!isProduction) {
  const dbPath = path.join(process.cwd(), 'data', 'yochat.db');
  const dataDir = path.dirname(dbPath);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  localDb = new Database(dbPath);
  localDb.pragma('journal_mode = WAL');

  // Initialize local database schema
  localDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
      is_banned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'general' CHECK(type IN ('general', 'private')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS chat_members (
      chat_id INTEGER,
      user_id INTEGER,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (chat_id, user_id),
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK(message_type IN ('text', 'image', 'file')),
      file_url TEXT,
      file_name TEXT,
      file_size INTEGER,
      is_edited INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

// Unified database interface
export function getDb() {
  if (localDb) {
    // Local SQLite
    return {
      prepare: (sql: string) => {
        const stmt = localDb.prepare(sql);
        return {
          get: (...params: any[]) => stmt.get(...params) || null,
          run: (...params: any[]) => {
            const result = stmt.run(...params);
            return { lastInsertRowid: result.lastInsertRowid };
          },
          all: (...params: any[]) => stmt.all(...params) || []
        };
      }
    };
  } else {
    throw new Error('No database available - not on Cloudflare and no local SQLite');
  }
}

export default localDb;
