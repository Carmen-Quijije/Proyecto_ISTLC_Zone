const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { getDb } = require('../database');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY;

// Configurar nodemailer para Brevo
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Generar código de verificación
const generarCodigo = () => Math.floor(100000 + Math.random() * 900000).toString();

// Enviar email con código
const enviarCorreoVerificacion = async (email, codigo) => {
    try {
        await transporter.sendMail({
            from: 'tecnologicoliceo@proton.me',
            to: email,
            subject: 'Código de verificación - ISTLC Zone',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #061A38; text-align: center;">Bienvenido a ISTLC Zone</h2>
                    <p style="color: #333; font-size: 16px;">Tu código de verificación es:</p>
                    <div style="background-color: #FFC107; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <h1 style="color: #061A38; font-size: 32px; letter-spacing: 5px; margin: 0;">${codigo}</h1>
                    </div>
                    <p style="color: #666; font-size: 14px;">Este código expira en 10 minutos.</p>
                    <p style="color: #666; font-size: 14px;">Si no solicitaste este registro, ignora este email.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">© 2026 Tecnológico Liceo Cristiano</p>
                </div>
            `
        });
        console.log('✅ Email enviado a:', email);
        return true;
    } catch (error) {
        console.error('❌ Error al enviar email:', error);
        return false;
    }
};

// REGISTRO
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, usuario, password, privacidad } = req.body;
        const db = getDb();

        // Validaciones
        if (!nombre || !email || !usuario || !password) {
            return res.status(400).json({ success: false, message: 'Faltan datos' });
        }

        if (!email.endsWith('@tecnologicoliceocristiano.edu.ec')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Solo se aceptan correos del dominio @tecnologicoliceocristiano.edu.ec' 
            });
        }

        // Verificar si el email ya existe Y está verificado
        db.get('SELECT * FROM usuarios WHERE email = ? AND email_verificado = 1', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error en la base de datos' });
            }

            if (row) {
                return res.status(400).json({ success: false, message: 'El email ya está registrado' });
            }

            // Verificar si el usuario ya existe Y está verificado
            db.get('SELECT * FROM usuarios WHERE usuario = ? AND email_verificado = 1', [usuario], async (err, row) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error en la base de datos' });
                }

                if (row) {
                    return res.status(400).json({ success: false, message: 'El usuario ya existe' });
                }

                // Encriptar contraseña
                const hashedPassword = await bcrypt.hash(password, 10);

                // Generar código de verificación
                const codigo = generarCodigo();
                const ahora = new Date();
                const expiracion = new Date(ahora.getTime() + 10 * 60000); // 10 minutos

                // Guardar código en BD
                db.run(
                    'INSERT INTO codigos_verificacion (email, codigo, fecha_expiracion) VALUES (?, ?, ?)',
                    [email, codigo, expiracion.toISOString()],
                    (err) => {
                        if (err) {
                            console.error('Error al guardar código:', err);
                        }
                    }
                );

                // Intentar enviar email con Brevo
                const emailEnviado = await enviarCorreoVerificacion(email, codigo);

                if (!emailEnviado) {
                    console.warn('⚠️ No se pudo enviar email, pero continuamos con el registro temporal');
                }

                // Guardar usuario TEMPORAL (sin verificar aún)
                db.run(
                    `INSERT INTO usuarios (nombre, email, usuario, password, privacidad, codigo_verificacion, email_verificado) 
                     VALUES (?, ?, ?, ?, ?, ?, 0)`,
                    [nombre, email, usuario, hashedPassword, privacidad ? 1 : 0, codigo],
                    function(err) {
                        if (err) {
                            console.error('Error al crear usuario temporal:', err);
                            return res.status(500).json({ 
                                success: false, 
                                message: 'Error al crear la cuenta' 
                            });
                        }

                        res.json({ 
                            success: true, 
                            message: 'Verifica tu email para completar el registro',
                            codigoDemo: codigo // Solo para desarrollo
                        });
                    }
                );
            });
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, message: 'Error al registrar' });
    }
});

// VERIFICAR EMAIL
router.post('/verify-email', (req, res) => {
    try {
        const { email, codigo } = req.body;
        const db = getDb();

        if (!email || !codigo) {
            return res.status(400).json({ success: false, message: 'Faltan datos' });
        }

        // Buscar código válido
        db.get(
            `SELECT * FROM codigos_verificacion 
             WHERE email = ? AND codigo = ? AND usado = 0 
             AND fecha_expiracion > datetime('now')
             ORDER BY id DESC LIMIT 1`,
            [email, codigo],
            (err, row) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error en la base de datos' });
                }

                if (!row) {
                    return res.status(400).json({ success: false, message: 'Código inválido o expirado' });
                }

                // Marcar código como usado
                db.run('UPDATE codigos_verificacion SET usado = 1 WHERE id = ?', [row.id]);

                // Actualizar usuario como verificado
                db.run(
                    'UPDATE usuarios SET email_verificado = 1 WHERE email = ?',
                    [email],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: 'Error al verificar' });
                        }

                        res.json({ 
                            success: true, 
                            message: 'Email verificado correctamente' 
                        });
                    }
                );
            }
        );

    } catch (error) {
        console.error('Error al verificar:', error);
        res.status(500).json({ success: false, message: 'Error al verificar email' });
    }
});

// REENVIAR CÓDIGO
router.post('/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        const db = getDb();

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email requerido' });
        }

        // Verificar que el usuario existe
        db.get('SELECT * FROM usuarios WHERE email = ?', [email], async (err, user) => {
            if (err || !user) {
                return res.status(400).json({ success: false, message: 'Usuario no encontrado' });
            }

            // Generar nuevo código
            const codigo = generarCodigo();
            const ahora = new Date();
            const expiracion = new Date(ahora.getTime() + 10 * 60000);

            // Guardar nuevo código
            db.run(
                'INSERT INTO codigos_verificacion (email, codigo, fecha_expiracion) VALUES (?, ?, ?)',
                [email, codigo, expiracion.toISOString()],
                (err) => {
                    if (err) console.error('Error al guardar código:', err);
                }
            );

            // Enviar email
            const emailEnviado = await enviarCorreoVerificacion(email, codigo);

            if (emailEnviado) {
                res.json({ 
                    success: true, 
                    message: 'Código reenviado a tu email',
                    codigoDemo: codigo // Solo para desarrollo
                });
            } else {
                res.json({ 
                    success: true, 
                    message: 'Código generado',
                    codigoDemo: codigo // Para testing sin email
                });
            }
        });

    } catch (error) {
        console.error('Error al reenviar:', error);
        res.status(500).json({ success: false, message: 'Error al reenviar código' });
    }
});

module.exports = router;
