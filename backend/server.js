const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar base de datos
initDatabase();

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Servir archivos estáticos desde el proyecto raíz
app.use(express.static('/app'));

// Servir rutas específicas
app.get('/', (req, res) => {
    res.sendFile('/app/index.html');
});

app.get('/Registro.html', (req, res) => {
    res.sendFile('/app/Registro.html');
});

app.listen(PORT, () => {
    console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
});
