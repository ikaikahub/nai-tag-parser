import Database from '@tauri-apps/plugin-sql';

export class DatabaseError extends Error {}

type Opened = { database: Database; error: null } | { database: null; error: DatabaseError };

async function open(): Promise<Opened> {
    try {
        // the db we apply migrations to in lib.rs
        const database = await Database.load('sqlite:nai_ats.db');
        const [check] = await database.select<{ quick_check: string }[]>('PRAGMA quick_check(1)');
        if (check.quick_check !== 'ok') throw check.quick_check;
        return { database, error: null };
    } catch (e) {
        return { database: null, error: new DatabaseError(String(e)) };
    }
}

const opened = await open();

export const databaseError = opened.error;

async function run<T>(query: (d: Database) => Promise<T>) {
    if (opened.error) throw opened.error;
    try {
        return await query(opened.database);
    } catch (e) {
        throw new DatabaseError(String(e));
    }
}

export const db = {
    select: <T>(sql: string, values?: unknown[]) => run((d) => d.select<T>(sql, values)),
    execute: (sql: string, values?: unknown[]) => run((d) => d.execute(sql, values)),
    close: () => opened.database?.close(),
};
