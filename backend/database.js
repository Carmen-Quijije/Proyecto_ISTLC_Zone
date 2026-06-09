const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'app.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err);
    } else {
        console.log('✅ Base de datos conectada');
    }
});

const initDatabase = () => {
    // Tabla de usuarios
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            usuario TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email_verificado BOOLEAN DEFAULT 0,
            privacidad BOOLEAN DEFAULT 0,
            codigo_verificacion TEXT,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error al crear tabla usuarios:', err);
        else console.log('✅ Tabla usuarios lista');
    });

    // Tabla de códigos de verificación
    db.run(`
        CREATE TABLE IF NOT EXISTS codigos_verificacion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            codigo TEXT NOT NULL,
            intentos INTEGER DEFAULT 0,
            fecha_expiracion DATETIME NOT NULL,
            usado BOOLEAN DEFAULT 0
        )
    `, (err) => {
        if (err) console.error('Error al crear tabla códigos:', err);
        else console.log('✅ Tabla códigos_verificacion lista');
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS registros_pendientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            usuario TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            privacidad BOOLEAN DEFAULT 0,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error al crear tabla registros_pendientes:', err);
        else console.log('Tabla registros_pendientes lista');
    });
};

const getDb = () => db;

module.exports = { getDb, initDatabase };
