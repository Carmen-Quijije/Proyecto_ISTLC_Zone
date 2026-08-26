const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(
    __dirname,
    '..',
    'frontend-angular',
    'dist',
    'proyecto-istlc-zone-angular',
    'browser'
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);

// Publica el resultado de Angular y entrega index.html para todas las rutas del SPA.
if (fs.existsSync(FRONTEND_DIR)) {
    app.use(express.static(FRONTEND_DIR));
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
    });
}

const startServer = async () => {
    try {
        await initDatabase();

        app.listen(PORT, () => {
            console.log(`Servidor ejecutandose en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error al iniciar servidor:', error);
        process.exit(1);
    }
};

startServer();
