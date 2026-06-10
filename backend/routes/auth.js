const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { getDb } = require('../database');
const router = express.Router();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;

const generarCodigo = () => Math.floor(100000 + Math.random() * 900000).toString();

const run = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const get = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const enviarCorreoVerificacion = async (email, codigo) => {
    try {
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: email,
            subject: 'Codigo de verificacion - ISTLC Zone',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #061A38; text-align: center;">Bienvenido a ISTLC Zone</h2>
                    <p style="color: #333; font-size: 16px;">Tu codigo de verificacion es:</p>
                    <div style="background-color: #FFC107; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <h1 style="color: #061A38; font-size: 32px; letter-spacing: 5px; margin: 0;">${codigo}</h1>
                    </div>
                    <p style="color: #666; font-size: 14px;">Este codigo expira en 10 minutos.</p>
                    <p style="color: #666; font-size: 14px;">Si no solicitaste este registro, ignora este email.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">2026 Tecnologico Liceo Cristiano</p>
                </div>
            `
        });

        console.log('Email enviado a:', email);
        console.log('Brevo messageId:', info.messageId);
        console.log('Brevo accepted:', info.accepted);
        console.log('Brevo rejected:', info.rejected);

        return Array.isArray(info.accepted) && info.accepted.includes(email);
    } catch (error) {
        console.error('Error al enviar email:', error);
        return false;
    }
};

router.post('/register', async (req, res) => {
    try {
        const { nombre, password, privacidad } = req.body;
        const email = String(req.body.email || '').trim().toLowerCase();
        const usuario = String(req.body.usuario || '').trim();
        const db = getDb();

        if (!nombre || !email || !usuario || !password) {
            return res.status(400).json({ success: false, message: 'Faltan datos' });
        }

        if (!email.endsWith('@tecnologicoliceocristiano.edu.ec')) {
            return res.status(400).json({
                success: false,
                message: 'Solo se aceptan correos del dominio @tecnologicoliceocristiano.edu.ec'
            });
        }

        const usuarioExistente = await get(
            db,
            'SELECT id FROM usuarios WHERE email = ? OR usuario = ?',
            [email, usuario]
        );

        if (usuarioExistente) {
            return res.status(400).json({ success: false, message: 'El email o usuario ya esta registrado' });
        }

        const pendingExistente = await get(
            db,
            'SELECT id FROM registros_pendientes WHERE email = ? OR usuario = ?',
            [email, usuario]
        );

        if (pendingExistente) {
            await run(db, 'DELETE FROM registros_pendientes WHERE email = ?', [email]);
            await run(db, 'DELETE FROM registros_pendientes WHERE usuario = ?', [usuario]);
            await run(db, 'UPDATE codigos_verificacion SET usado = 1 WHERE email = ?', [email]);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const codigo = generarCodigo();
        const expiracion = new Date(Date.now() + 10 * 60000);

        await run(
            db,
            `INSERT INTO registros_pendientes (nombre, email, usuario, password, privacidad)
             VALUES (?, ?, ?, ?, ?)`,
            [nombre, email, usuario, hashedPassword, privacidad ? 1 : 0]
        );

        await run(
            db,
            'INSERT INTO codigos_verificacion (email, codigo, fecha_expiracion) VALUES (?, ?, ?)',
            [email, codigo, expiracion.toISOString()]
        );

        const emailEnviado = await enviarCorreoVerificacion(email, codigo);

        if (!emailEnviado) {
            await run(db, 'DELETE FROM registros_pendientes WHERE email = ?', [email]);
            await run(db, 'UPDATE codigos_verificacion SET usado = 1 WHERE email = ? AND codigo = ?', [email, codigo]);

            return res.status(502).json({
                success: false,
                message: 'No se pudo enviar el codigo. Revisa la configuracion SMTP de Brevo.'
            });
        }

        res.json({
            success: true,
            message: 'Verifica tu email para completar el registro'
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar: ' + (error.code || error.message || 'error desconocido')
        });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = getDb();

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Faltan datos' });
        }

        const usuario = await get(
            db,
            'SELECT * FROM usuarios WHERE email = ? AND email_verificado = 1',
            [email]
        );

        if (!usuario) {
            return res.status(401).json({ success: false, message: 'Correo o contrasena incorrectos' });
        }

        const passwordCorrecta = await bcrypt.compare(password, usuario.password);

        if (!passwordCorrecta) {
            return res.status(401).json({ success: false, message: 'Correo o contrasena incorrectos' });
        }

        res.json({
            success: true,
            message: 'Inicio de sesion correcto',
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                usuario: usuario.usuario
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: 'Error al iniciar sesion' });
    }
});

router.post('/verify-email', async (req, res) => {
    try {
        const { email, codigo } = req.body;
        const db = getDb();

        if (!email || !codigo) {
            return res.status(400).json({ success: false, message: 'Faltan datos' });
        }

        const codigoValido = await get(
            db,
            `SELECT * FROM codigos_verificacion
             WHERE email = ? AND codigo = ? AND usado = 0
             AND datetime(fecha_expiracion) > datetime('now')
             ORDER BY id DESC LIMIT 1`,
            [email, codigo]
        );

        if (!codigoValido) {
            return res.status(400).json({ success: false, message: 'Codigo invalido o expirado' });
        }

        const pendiente = await get(db, 'SELECT * FROM registros_pendientes WHERE email = ?', [email]);

        if (!pendiente) {
            return res.status(400).json({ success: false, message: 'No hay registro pendiente para este email' });
        }

        await run(db, 'UPDATE codigos_verificacion SET usado = 1 WHERE id = ?', [codigoValido.id]);

        await run(
            db,
            `INSERT INTO usuarios (nombre, email, usuario, password, privacidad, codigo_verificacion, email_verificado)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
                pendiente.nombre,
                pendiente.email,
                pendiente.usuario,
                pendiente.password,
                pendiente.privacidad ? 1 : 0,
                codigo,
            ]
        );

        await run(db, 'DELETE FROM registros_pendientes WHERE email = ?', [email]);

        res.json({
            success: true,
            message: 'Email verificado correctamente'
        });
    } catch (error) {
        console.error('Error al verificar:', error);
        res.status(500).json({ success: false, message: 'Error al verificar email' });
    }
});

router.post('/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        const db = getDb();

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email requerido' });
        }

        const pendiente = await get(db, 'SELECT * FROM registros_pendientes WHERE email = ?', [email]);

        if (!pendiente) {
            return res.status(400).json({ success: false, message: 'No hay registro pendiente para este email' });
        }

        const codigo = generarCodigo();
        const expiracion = new Date(Date.now() + 10 * 60000);

        await run(db, 'UPDATE codigos_verificacion SET usado = 1 WHERE email = ?', [email]);
        await run(
            db,
            'INSERT INTO codigos_verificacion (email, codigo, fecha_expiracion) VALUES (?, ?, ?)',
            [email, codigo, expiracion.toISOString()]
        );

        const emailEnviado = await enviarCorreoVerificacion(email, codigo);

        if (!emailEnviado) {
            return res.status(502).json({
                success: false,
                message: 'No se pudo reenviar el codigo. Revisa la configuracion SMTP de Brevo.'
            });
        }

        res.json({
            success: true,
            message: 'Codigo reenviado a tu email'
        });
    } catch (error) {
        console.error('Error al reenviar:', error);
        res.status(500).json({ success: false, message: 'Error al reenviar codigo' });
    }
});

module.exports = router;
