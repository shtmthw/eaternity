import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';

const migrationsFolder = path.resolve(import.meta.dirname, '../../../drizzle');

/**
 * Opens the SQLite database and brings its schema up to date.
 * Node ships SQLite in the node:sqlite module, so there is no native add-on
 * to compile and the same image works on amd64 and arm64.
 */
export function openDatabase(file: string) {
  const client = new DatabaseSync(file);
  client.exec('PRAGMA journal_mode = WAL');
  client.exec('PRAGMA foreign_keys = ON');
  client.exec('PRAGMA busy_timeout = 5000');

  const db = drizzle({ client });
  migrate(db, { migrationsFolder });
  return db;
}

export type Database = ReturnType<typeof openDatabase>;
