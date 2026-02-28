import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbFile = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'contacts.sqlite');

    const dir = path.dirname(dbFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbFile);
    db.pragma('foreign_keys = ON');
  }

  return db;
}

export function initDb(): void {
  const database = getDb();

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phoneNumber TEXT,
      email TEXT,
      linkedId INTEGER,
      linkPrecedence TEXT CHECK (linkPrecedence IN ('primary', 'secondary')) NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      deletedAt TEXT,
      FOREIGN KEY (linkedId) REFERENCES contacts(id)
    );
  `;

  database.exec(createTableSql);
}

