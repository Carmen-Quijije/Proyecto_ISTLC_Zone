const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL para conectar con Neon PostgreSQL');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const toPostgresQuery = (sql) => {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
};

const db = {
    async get(sql, params = []) {
        const result = await pool.query(toPostgresQuery(sql), params);
        return result.rows[0];
    },

    async run(sql, params = []) {
        const result = await pool.query(toPostgresQuery(sql), params);
        return {
            rowCount: result.rowCount,
            rows: result.rows
        };
    }
};

const initDatabase = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            usuario TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email_verificado BOOLEAN DEFAULT FALSE,
            privacidad BOOLEAN DEFAULT FALSE,
            codigo_verificacion TEXT,
            fecha_registro TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log('Tabla usuarios lista');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS codigos_verificacion (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            codigo TEXT NOT NULL,
            intentos INTEGER DEFAULT 0,
            fecha_expiracion TIMESTAMPTZ NOT NULL,
            usado BOOLEAN DEFAULT FALSE
        )
    `);
    console.log('Tabla codigos_verificacion lista');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS registros_pendientes (
            id SERIAL PRIMARY KEY,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            usuario TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            privacidad BOOLEAN DEFAULT FALSE,
            fecha_registro TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log('Tabla registros_pendientes lista');

    await pool.query('SELECT 1');
    console.log('Base de datos Neon PostgreSQL conectada');
};

const getDb = () => db;

module.exports = { getDb, initDatabase };
