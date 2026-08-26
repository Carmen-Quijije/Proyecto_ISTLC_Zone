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
        ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS vive_en TEXT,
        ADD COLUMN IF NOT EXISTS lugar_origen TEXT,
        ADD COLUMN IF NOT EXISTS fecha_nacimiento TEXT,
        ADD COLUMN IF NOT EXISTS estado_civil TEXT,
        ADD COLUMN IF NOT EXISTS carrera TEXT,
        ADD COLUMN IF NOT EXISTS semestre TEXT,
        ADD COLUMN IF NOT EXISTS foto_perfil TEXT,
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS rol TEXT DEFAULT 'usuario'
    `);
    console.log('Columnas de perfil listas');

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
        CREATE TABLE IF NOT EXISTS codigos_recuperacion (
            id SERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            codigo TEXT NOT NULL,
            fecha_expiracion TIMESTAMPTZ NOT NULL,
            usado BOOLEAN DEFAULT FALSE,
            fecha_creacion TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log('Tabla codigos_recuperacion lista');

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

    await pool.query(`
        CREATE TABLE IF NOT EXISTS seguidores (
            id SERIAL PRIMARY KEY,
            seguidor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            seguido_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            fecha TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (seguidor_id, seguido_id)
        )
    `);
    console.log('Tabla seguidores lista');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS solicitudes_seguimiento (
            id SERIAL PRIMARY KEY,
            solicitante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            receptor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            estado TEXT DEFAULT 'pendiente',
            fecha TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (solicitante_id, receptor_id)
        )
    `);
    console.log('Tabla solicitudes_seguimiento lista');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS notificaciones (
            id SERIAL PRIMARY KEY,
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            tipo TEXT NOT NULL,
            mensaje TEXT NOT NULL,
            referencia_id INTEGER,
            leida BOOLEAN DEFAULT FALSE,
            fecha TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log('Tabla notificaciones lista');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS publicaciones (
            id SERIAL PRIMARY KEY,
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            contenido TEXT NOT NULL,
            imagen_url TEXT,
            fecha TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log('Tabla publicaciones lista');

    await pool.query(`
        ALTER TABLE publicaciones
        ADD COLUMN IF NOT EXISTS imagenes_json TEXT
    `);
    console.log('Columnas de publicaciones listas');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS comentarios (
            id SERIAL PRIMARY KEY,
            publicacion_id INTEGER NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            comentario_padre_id INTEGER REFERENCES comentarios(id) ON DELETE CASCADE,
            contenido TEXT NOT NULL,
            fecha TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await pool.query(`
        ALTER TABLE comentarios
        ADD COLUMN IF NOT EXISTS comentario_padre_id INTEGER REFERENCES comentarios(id) ON DELETE CASCADE
    `);
    console.log('Tabla comentarios lista');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS likes_publicaciones (
            id SERIAL PRIMARY KEY,
            publicacion_id INTEGER NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
            usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            fecha TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (publicacion_id, usuario_id)
        )
    `);
    console.log('Tabla likes_publicaciones lista');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS mensajes (
            id SERIAL PRIMARY KEY,
            emisor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            receptor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            contenido TEXT NOT NULL,
            leido BOOLEAN DEFAULT FALSE,
            fecha TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log('Tabla mensajes lista');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS reportes (
            id SERIAL PRIMARY KEY,
            tipo TEXT NOT NULL,
            referencia_id INTEGER NOT NULL,
            reportante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            motivo TEXT NOT NULL,
            estado TEXT DEFAULT 'pendiente',
            fecha TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (tipo, referencia_id, reportante_id)
        )
    `);
    console.log('Tabla reportes lista');

    await pool.query('SELECT 1');
    console.log('Base de datos Neon PostgreSQL conectada');
};

const getDb = () => db;

module.exports = { getDb, initDatabase };
