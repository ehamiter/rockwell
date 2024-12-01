import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

export async function initializeDatabase() {
  db = await open({
    filename: './monitor.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS websites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      last_hash TEXT,
      last_checked DATETIME,
      check_frequency INTEGER DEFAULT 24
    );

    CREATE TABLE IF NOT EXISTS changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id INTEGER,
      old_hash TEXT,
      new_hash TEXT,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(website_id) REFERENCES websites(id)
    );
  `);

  return db;
}

export async function getDatabase() {
  if (!db) {
    await initializeDatabase();
  }
  return db;
}