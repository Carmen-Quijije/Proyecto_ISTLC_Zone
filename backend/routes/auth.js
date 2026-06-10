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
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const generarCodigo = () => Math.floor(100000 + Math.random() * 900000).toString();

const run = (db, sql, params = []) => db.run(sql, params);
const get = (db, sql, params = []) => db.get(sql, params);

const perfilPublico = (usuario) => ({
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    usuario: usuario.usuario,
    viveEn: usuario.vive_en,
    lugarOrigen: usuario.lugar_origen,
    fechaNacimiento: usuario.fecha_nacimiento,
    estadoCivil: usuario.estado_civil,
    carrera: usuario.carrera,
    semestre: usuario.semestre,
    fotoPerfil: usuario.foto_perfil,
    bio: usuario.bio
});

const enviarCorreoVerificacion = async (email, codigo) => {
    const htmlContent = `
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
    `;

    try {
        if (BREVO_API_KEY) {
            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: {
                        email: EMAIL_FROM,
                        name: 'ISTLC Zone'
                    },
                    to: [{ email }],
                    subject: 'Codigo de verificacion - ISTLC Zone',
                    htmlContent
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                console.error('Error al enviar email con Brevo API:', response.status, data);
                return false;
            }

            console.log('Email enviado con Brevo API a:', email);
            console.log('Brevo messageId:', data.messageId || data.messageIds);
            return true;
        }

        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: email,
            subject: 'Codigo de verificacion - ISTLC Zone',
            html: htmlContent
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

        await run(db, 'DELETE FROM registros_pendientes WHERE email = ? OR usuario = ?', [email, usuario]);
        await run(db, 'UPDATE codigos_verificacion SET usado = TRUE WHERE email = ?', [email]);

        const hashedPassword = await bcrypt.hash(password, 10);
        const codigo = generarCodigo();
        const expiracion = new Date(Date.now() + 10 * 60000);

        await run(
            db,
            `INSERT INTO registros_pendientes (nombre, email, usuario, password, privacidad)
             VALUES (?, ?, ?, ?, ?)`,
            [nombre, email, usuario, hashedPassword, Boolean(privacidad)]
        );

        await run(
            db,
            'INSERT INTO codigos_verificacion (email, codigo, fecha_expiracion) VALUES (?, ?, ?)',
            [email, codigo, expiracion.toISOString()]
        );

        const emailEnviado = await enviarCorreoVerificacion(email, codigo);

        if (!emailEnviado) {
            await run(db, 'DELETE FROM registros_pendientes WHERE email = ?', [email]);
            await run(db, 'UPDATE codigos_verificacion SET usado = TRUE WHERE email = ? AND codigo = ?', [email, codigo]);

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
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'Ese correo o usuario ya existe. Prueba con otro usuario o inicia sesion.'
            });
        }

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
            'SELECT * FROM usuarios WHERE email = ? AND email_verificado = TRUE',
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
            usuario: perfilPublico(usuario)
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
             WHERE email = ? AND codigo = ? AND usado = FALSE
             AND fecha_expiracion > NOW()
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

        await run(db, 'UPDATE codigos_verificacion SET usado = TRUE WHERE id = ?', [codigoValido.id]);

        await run(
            db,
            `INSERT INTO usuarios (nombre, email, usuario, password, privacidad, codigo_verificacion, email_verificado)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                pendiente.nombre,
                pendiente.email,
                pendiente.usuario,
                pendiente.password,
                Boolean(pendiente.privacidad),
                codigo,
                true
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

router.get('/profile/:id', async (req, res) => {
    try {
        const db = getDb();
        const usuario = await get(db, 'SELECT * FROM usuarios WHERE id = ?', [req.params.id]);

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const seguidores = await get(db, 'SELECT COUNT(*)::int AS total FROM seguidores WHERE seguido_id = ?', [req.params.id]);
        const seguidos = await get(db, 'SELECT COUNT(*)::int AS total FROM seguidores WHERE seguidor_id = ?', [req.params.id]);

        res.json({
            success: true,
            usuario: perfilPublico(usuario),
            seguidores: seguidores?.total || 0,
            seguidos: seguidos?.total || 0
        });
    } catch (error) {
        console.error('Error al cargar perfil:', error);
        res.status(500).json({ success: false, message: 'Error al cargar perfil' });
    }
});

router.put('/profile', async (req, res) => {
    try {
        const {
            id,
            nombre,
            viveEn,
            lugarOrigen,
            fechaNacimiento,
            estadoCivil,
            carrera,
            semestre,
            fotoPerfil,
            bio
        } = req.body;
        const db = getDb();

        if (!id || !nombre) {
            return res.status(400).json({ success: false, message: 'Faltan datos' });
        }

        await run(
            db,
            `UPDATE usuarios
             SET nombre = ?, vive_en = ?, lugar_origen = ?, fecha_nacimiento = ?,
                 estado_civil = ?, carrera = ?, semestre = ?, foto_perfil = ?, bio = ?
             WHERE id = ?`,
            [
                nombre,
                viveEn || null,
                lugarOrigen || null,
                fechaNacimiento || null,
                estadoCivil || null,
                carrera || null,
                semestre || null,
                fotoPerfil || null,
                bio || null,
                id
            ]
        );

        const usuario = await get(db, 'SELECT * FROM usuarios WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Perfil actualizado',
            usuario: perfilPublico(usuario)
        });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar perfil' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const db = getDb();
        const q = `%${String(req.query.q || '').trim().toLowerCase()}%`;
        const currentUserId = Number(req.query.currentUserId || 0);
        const result = await db.run(
            `SELECT u.*,
                    EXISTS (
                        SELECT 1 FROM seguidores s
                        WHERE s.seguidor_id = ? AND s.seguido_id = u.id
                    ) AS siguiendo
             FROM usuarios u
             WHERE u.email_verificado = TRUE
               AND u.id <> ?
               AND (LOWER(u.nombre) LIKE ? OR LOWER(u.usuario) LIKE ? OR LOWER(u.email) LIKE ?)
             ORDER BY u.nombre
             LIMIT 30`,
            [currentUserId, currentUserId, q, q, q]
        );

        res.json({
            success: true,
            usuarios: result.rows.map((usuario) => ({
                ...perfilPublico(usuario),
                siguiendo: Boolean(usuario.siguiendo)
            }))
        });
    } catch (error) {
        console.error('Error al buscar usuarios:', error);
        res.status(500).json({ success: false, message: 'Error al buscar usuarios' });
    }
});

router.get('/following/:id', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.run(
            `SELECT u.*
             FROM seguidores s
             JOIN usuarios u ON u.id = s.seguido_id
             WHERE s.seguidor_id = ?
             ORDER BY u.nombre
             LIMIT 12`,
            [req.params.id]
        );

        res.json({
            success: true,
            usuarios: result.rows.map(perfilPublico)
        });
    } catch (error) {
        console.error('Error al cargar seguidos:', error);
        res.status(500).json({ success: false, message: 'Error al cargar amigos' });
    }
});

router.post('/follow', async (req, res) => {
    try {
        const { seguidorId, seguidoId } = req.body;
        const db = getDb();

        if (!seguidorId || !seguidoId || Number(seguidorId) === Number(seguidoId)) {
            return res.status(400).json({ success: false, message: 'Datos invalidos' });
        }

        await run(
            db,
            'INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
            [seguidorId, seguidoId]
        );

        res.json({ success: true, message: 'Usuario agregado' });
    } catch (error) {
        console.error('Error al seguir:', error);
        res.status(500).json({ success: false, message: 'Error al seguir usuario' });
    }
});

router.delete('/follow', async (req, res) => {
    try {
        const { seguidorId, seguidoId } = req.body;
        const db = getDb();

        await run(
            db,
            'DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?',
            [seguidorId, seguidoId]
        );

        res.json({ success: true, message: 'Usuario eliminado' });
    } catch (error) {
        console.error('Error al dejar de seguir:', error);
        res.status(500).json({ success: false, message: 'Error al dejar de seguir' });
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

        await run(db, 'UPDATE codigos_verificacion SET usado = TRUE WHERE email = ?', [email]);
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
