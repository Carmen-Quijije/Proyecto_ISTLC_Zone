const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
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
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 12 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Solo se permiten imagenes'));
            return;
        }

        cb(null, true);
    }
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const generarCodigo = () => Math.floor(100000 + Math.random() * 900000).toString();

const run = (db, sql, params = []) => db.run(sql, params);
const get = (db, sql, params = []) => db.get(sql, params);

const crearNotificacion = async (db, usuarioId, tipo, mensaje, referenciaId = null) => {
    if (!usuarioId || !tipo || !mensaje) {
        return;
    }

    await run(
        db,
        `INSERT INTO notificaciones (usuario_id, tipo, mensaje, referencia_id)
         VALUES (?, ?, ?, ?)`,
        [usuarioId, tipo, mensaje, referenciaId]
    );
};

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

const leerImagenesPublicacion = (publicacion) => {
    if (publicacion.imagenes_json) {
        try {
            const imagenes = JSON.parse(publicacion.imagenes_json);
            if (Array.isArray(imagenes)) {
                return imagenes.filter(Boolean);
            }
        } catch (error) {
            return publicacion.imagen_url ? [publicacion.imagen_url] : [];
        }
    }

    return publicacion.imagen_url ? [publicacion.imagen_url] : [];
};

const limpiarImagenesPublicacion = (imagenes) => {
    if (!Array.isArray(imagenes)) {
        return [];
    }

    return imagenes
        .map((imagen) => String(imagen || '').trim())
        .filter((imagen) => imagen.startsWith('http://') || imagen.startsWith('https://'))
        .slice(0, 6);
};

const publicacionPublica = (publicacion) => ({
    id: publicacion.id,
    contenido: publicacion.contenido,
    imagenUrl: publicacion.imagen_url,
    imagenes: leerImagenesPublicacion(publicacion),
    fecha: publicacion.fecha,
    totalLikes: Number(publicacion.total_likes || 0),
    totalComentarios: Number(publicacion.total_comentarios || 0),
    likedByMe: Boolean(publicacion.liked_by_me),
    autor: {
        id: publicacion.usuario_id,
        nombre: publicacion.nombre,
        usuario: publicacion.usuario,
        fotoPerfil: publicacion.foto_perfil
    }
});

const comentarioPublico = (comentario) => ({
    id: comentario.id,
    contenido: comentario.contenido,
    fecha: comentario.fecha,
    autor: {
        id: comentario.usuario_id,
        nombre: comentario.nombre,
        usuario: comentario.usuario,
        fotoPerfil: comentario.foto_perfil
    }
});

const mensajePublico = (mensaje, usuarioActualId) => ({
    id: mensaje.id,
    contenido: mensaje.contenido,
    fecha: mensaje.fecha,
    mio: Number(mensaje.emisor_id) === Number(usuarioActualId),
    emisor: {
        id: mensaje.emisor_id,
        nombre: mensaje.emisor_nombre,
        usuario: mensaje.emisor_usuario,
        fotoPerfil: mensaje.emisor_foto
    },
    receptor: {
        id: mensaje.receptor_id,
        nombre: mensaje.receptor_nombre,
        usuario: mensaje.receptor_usuario,
        fotoPerfil: mensaje.receptor_foto
    }
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

const enviarCorreoRecuperacion = async (email, codigo) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #061A38; text-align: center;">Recuperacion de cuenta</h2>
            <p style="color: #333; font-size: 16px;">Usa este codigo para cambiar tu contrasena:</p>
            <div style="background-color: #FFC107; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <h1 style="color: #061A38; font-size: 32px; letter-spacing: 5px; margin: 0;">${codigo}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">Este codigo expira en 10 minutos.</p>
            <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, ignora este email.</p>
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
                    sender: { email: EMAIL_FROM, name: 'ISTLC Zone' },
                    to: [{ email }],
                    subject: 'Recuperacion de cuenta - ISTLC Zone',
                    htmlContent
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                console.error('Error al enviar recuperacion con Brevo API:', response.status, data);
                return false;
            }

            return true;
        }

        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: email,
            subject: 'Recuperacion de cuenta - ISTLC Zone',
            html: htmlContent
        });

        return Array.isArray(info.accepted) && info.accepted.includes(email);
    } catch (error) {
        console.error('Error al enviar recuperacion:', error);
        return false;
    }
};

const subirImagenCloudinary = (file, folder = 'istlc-zone') => new Promise((resolve, reject) => {
    const base64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64}`;

    cloudinary.uploader.upload(
        dataUri,
        {
            folder,
            resource_type: 'image',
            transformation: [
                { width: 1200, height: 1200, crop: 'limit' },
                { quality: 'auto', fetch_format: 'auto' }
            ]
        }
    ).then(resolve).catch(reject);
});

const obtenerPublicIdCloudinary = (urlImagen) => {
    if (!urlImagen || !urlImagen.includes('/image/upload/')) {
        return '';
    }

    try {
        const url = new URL(urlImagen);
        const ruta = url.pathname.split('/image/upload/')[1];
        if (!ruta) {
            return '';
        }

        const partes = ruta.split('/').filter(Boolean);
        if (partes[0] && /^v\d+$/.test(partes[0])) {
            partes.shift();
        }

        const publicIdConExtension = partes.join('/');
        return decodeURIComponent(publicIdConExtension.replace(/\.[^/.]+$/, ''));
    } catch (error) {
        return '';
    }
};

const borrarImagenCloudinary = async (urlImagen) => {
    const publicId = obtenerPublicIdCloudinary(urlImagen);
    if (!publicId) {
        return;
    }

    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
        console.warn('No se pudo borrar la imagen de Cloudinary:', error.message);
    }
};

router.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return res.status(500).json({
                success: false,
                message: 'Falta configurar Cloudinary en Render'
            });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Selecciona una imagen' });
        }

        const folder = req.body.folder || 'istlc-zone';
        const result = await subirImagenCloudinary(req.file, folder);

        res.json({
            success: true,
            url: result.secure_url,
            publicId: result.public_id
        });
    } catch (error) {
        console.error('Error al subir imagen:', error);
        res.status(500).json({
            success: false,
            message: 'No se pudo subir la imagen: ' + (error.message || 'revisa Cloudinary')
        });
    }
});

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

router.post('/forgot-password', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const db = getDb();

        if (!email) {
            return res.status(400).json({ success: false, message: 'Ingresa tu correo' });
        }

        const usuario = await get(
            db,
            'SELECT id FROM usuarios WHERE email = ? AND email_verificado = TRUE',
            [email]
        );

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'No existe una cuenta con ese correo' });
        }

        const codigo = generarCodigo();
        const expiracion = new Date(Date.now() + 10 * 60000);

        await run(db, 'UPDATE codigos_recuperacion SET usado = TRUE WHERE email = ?', [email]);
        await run(
            db,
            'INSERT INTO codigos_recuperacion (email, codigo, fecha_expiracion) VALUES (?, ?, ?)',
            [email, codigo, expiracion.toISOString()]
        );

        const enviado = await enviarCorreoRecuperacion(email, codigo);

        if (!enviado) {
            return res.status(502).json({
                success: false,
                message: 'No se pudo enviar el codigo de recuperacion'
            });
        }

        res.json({ success: true, message: 'Codigo enviado a tu correo' });
    } catch (error) {
        console.error('Error en recuperacion:', error);
        res.status(500).json({ success: false, message: 'Error al solicitar recuperacion' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const { codigo, password } = req.body;
        const db = getDb();

        if (!email || !codigo || !password) {
            return res.status(400).json({ success: false, message: 'Faltan datos' });
        }

        const codigoValido = await get(
            db,
            `SELECT * FROM codigos_recuperacion
             WHERE email = ? AND codigo = ? AND usado = FALSE
             AND fecha_expiracion > NOW()
             ORDER BY id DESC LIMIT 1`,
            [email, codigo]
        );

        if (!codigoValido) {
            return res.status(400).json({ success: false, message: 'Codigo invalido o expirado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await run(db, 'UPDATE usuarios SET password = ? WHERE email = ?', [hashedPassword, email]);
        await run(db, 'UPDATE codigos_recuperacion SET usado = TRUE WHERE id = ?', [codigoValido.id]);

        res.json({ success: true, message: 'Contrasena actualizada correctamente' });
    } catch (error) {
        console.error('Error al cambiar contrasena:', error);
        res.status(500).json({ success: false, message: 'Error al cambiar contrasena' });
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
                    ) AS siguiendo,
                    EXISTS (
                        SELECT 1 FROM solicitudes_seguimiento ss
                        WHERE ss.solicitante_id = ? AND ss.receptor_id = u.id AND ss.estado = 'pendiente'
                    ) AS solicitud_pendiente
             FROM usuarios u
             WHERE u.email_verificado = TRUE
               AND u.id <> ?
               AND (LOWER(u.nombre) LIKE ? OR LOWER(u.usuario) LIKE ? OR LOWER(u.email) LIKE ?)
             ORDER BY u.nombre
             LIMIT 30`,
            [currentUserId, currentUserId, currentUserId, q, q, q]
        );

        res.json({
            success: true,
            usuarios: result.rows.map((usuario) => ({
                ...perfilPublico(usuario),
                siguiendo: Boolean(usuario.siguiendo),
                solicitudPendiente: Boolean(usuario.solicitud_pendiente)
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

        const yaSigue = await get(
            db,
            'SELECT id FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?',
            [seguidorId, seguidoId]
        );

        if (yaSigue) {
            return res.json({ success: true, message: 'Ya sigues a este usuario' });
        }

        const solicitante = await get(db, 'SELECT nombre FROM usuarios WHERE id = ?', [seguidorId]);
        const result = await db.run(
            `INSERT INTO solicitudes_seguimiento (solicitante_id, receptor_id, estado)
             VALUES (?, ?, 'pendiente')
             ON CONFLICT (solicitante_id, receptor_id)
             DO UPDATE SET estado = 'pendiente', fecha = NOW()
             RETURNING id`,
            [seguidorId, seguidoId]
        );

        await crearNotificacion(
            db,
            seguidoId,
            'solicitud_seguimiento',
            `${solicitante?.nombre || 'Un usuario'} quiere seguirte`,
            result.rows[0]?.id || null
        );

        res.json({ success: true, message: 'Solicitud enviada' });
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

        await run(
            db,
            `DELETE FROM solicitudes_seguimiento
             WHERE solicitante_id = ? AND receptor_id = ? AND estado = 'pendiente'`,
            [seguidorId, seguidoId]
        );

        res.json({ success: true, message: 'Seguimiento actualizado' });
    } catch (error) {
        console.error('Error al dejar de seguir:', error);
        res.status(500).json({ success: false, message: 'Error al dejar de seguir' });
    }
});

router.get('/follow-requests/:id', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.run(
            `SELECT ss.id, ss.fecha, u.id AS usuario_id, u.nombre, u.usuario, u.foto_perfil, u.carrera, u.semestre
             FROM solicitudes_seguimiento ss
             JOIN usuarios u ON u.id = ss.solicitante_id
             WHERE ss.receptor_id = ? AND ss.estado = 'pendiente'
             ORDER BY ss.fecha DESC
             LIMIT 20`,
            [req.params.id]
        );

        res.json({
            success: true,
            solicitudes: result.rows.map((solicitud) => ({
                id: solicitud.id,
                fecha: solicitud.fecha,
                usuario: {
                    id: solicitud.usuario_id,
                    nombre: solicitud.nombre,
                    usuario: solicitud.usuario,
                    fotoPerfil: solicitud.foto_perfil,
                    carrera: solicitud.carrera,
                    semestre: solicitud.semestre
                }
            }))
        });
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        res.status(500).json({ success: false, message: 'Error al cargar solicitudes' });
    }
});

router.post('/follow-requests/:id/accept', async (req, res) => {
    try {
        const { usuarioId } = req.body;
        const db = getDb();
        const solicitud = await get(
            db,
            `SELECT ss.*, u.nombre AS receptor_nombre
             FROM solicitudes_seguimiento ss
             JOIN usuarios u ON u.id = ss.receptor_id
             WHERE ss.id = ? AND ss.receptor_id = ? AND ss.estado = 'pendiente'`,
            [req.params.id, usuarioId]
        );

        if (!solicitud) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        await run(db, `UPDATE solicitudes_seguimiento SET estado = 'aceptada' WHERE id = ?`, [req.params.id]);
        await run(
            db,
            'INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
            [solicitud.solicitante_id, solicitud.receptor_id]
        );
        await crearNotificacion(
            db,
            solicitud.solicitante_id,
            'solicitud_aceptada',
            `${solicitud.receptor_nombre || 'Un usuario'} acepto tu solicitud`,
            solicitud.receptor_id
        );

        res.json({ success: true, message: 'Solicitud aceptada' });
    } catch (error) {
        console.error('Error al aceptar solicitud:', error);
        res.status(500).json({ success: false, message: 'Error al aceptar solicitud' });
    }
});

router.post('/follow-requests/:id/reject', async (req, res) => {
    try {
        const { usuarioId } = req.body;
        const db = getDb();
        const solicitud = await get(
            db,
            `SELECT id FROM solicitudes_seguimiento
             WHERE id = ? AND receptor_id = ? AND estado = 'pendiente'`,
            [req.params.id, usuarioId]
        );

        if (!solicitud) {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }

        await run(db, `UPDATE solicitudes_seguimiento SET estado = 'rechazada' WHERE id = ?`, [req.params.id]);
        res.json({ success: true, message: 'Solicitud rechazada' });
    } catch (error) {
        console.error('Error al rechazar solicitud:', error);
        res.status(500).json({ success: false, message: 'Error al rechazar solicitud' });
    }
});

router.get('/notifications/:id', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.run(
            `SELECT id, tipo, mensaje, referencia_id, leida, fecha
             FROM notificaciones
             WHERE usuario_id = ?
             ORDER BY fecha DESC
             LIMIT 30`,
            [req.params.id]
        );

        res.json({
            success: true,
            notificaciones: result.rows.map((notificacion) => ({
                id: notificacion.id,
                tipo: notificacion.tipo,
                mensaje: notificacion.mensaje,
                referenciaId: notificacion.referencia_id,
                leida: Boolean(notificacion.leida),
                fecha: notificacion.fecha
            })),
            sinLeer: result.rows.filter((notificacion) => !notificacion.leida).length
        });
    } catch (error) {
        console.error('Error al cargar notificaciones:', error);
        res.status(500).json({ success: false, message: 'Error al cargar notificaciones' });
    }
});

router.put('/notifications/read', async (req, res) => {
    try {
        const { usuarioId } = req.body;
        const db = getDb();

        await run(db, 'UPDATE notificaciones SET leida = TRUE WHERE usuario_id = ?', [usuarioId]);
        res.json({ success: true, message: 'Notificaciones leidas' });
    } catch (error) {
        console.error('Error al marcar notificaciones:', error);
        res.status(500).json({ success: false, message: 'Error al marcar notificaciones' });
    }
});

router.post('/posts', async (req, res) => {
    try {
        const { usuarioId, contenido, imagenUrl, imagenesUrls } = req.body;
        const db = getDb();
        const texto = String(contenido || '').trim();
        const imagenes = limpiarImagenesPublicacion(
            Array.isArray(imagenesUrls) && imagenesUrls.length ? imagenesUrls : [imagenUrl]
        );

        if (!usuarioId || !texto) {
            return res.status(400).json({ success: false, message: 'Escribe algo para publicar' });
        }

        const result = await db.run(
            `INSERT INTO publicaciones (usuario_id, contenido, imagen_url, imagenes_json)
             VALUES (?, ?, ?, ?)
             RETURNING id`,
            [usuarioId, texto, imagenes[0] || null, JSON.stringify(imagenes)]
        );

        res.json({
            success: true,
            message: 'Publicacion creada',
            id: result.rows[0]?.id
        });
    } catch (error) {
        console.error('Error al crear publicacion:', error);
        res.status(500).json({ success: false, message: 'Error al publicar' });
    }
});

router.put('/posts/:id', async (req, res) => {
    try {
        const { usuarioId, contenido, imagenesUrls } = req.body;
        const db = getDb();
        const texto = String(contenido || '').trim();
        const debeActualizarImagenes = Array.isArray(imagenesUrls);

        if (!usuarioId || !texto) {
            return res.status(400).json({ success: false, message: 'Escribe algo para actualizar' });
        }

        const publicacion = await get(
            db,
            'SELECT id, usuario_id, imagen_url, imagenes_json FROM publicaciones WHERE id = ?',
            [req.params.id]
        );

        if (!publicacion) {
            return res.status(404).json({ success: false, message: 'La publicacion ya no existe' });
        }

        if (Number(publicacion.usuario_id) !== Number(usuarioId)) {
            return res.status(403).json({ success: false, message: 'Solo puedes editar tus publicaciones' });
        }

        if (debeActualizarImagenes) {
            const nuevasImagenes = limpiarImagenesPublicacion(imagenesUrls);
            const imagenesAnteriores = leerImagenesPublicacion(publicacion);
            const imagenesEliminadas = imagenesAnteriores.filter((imagen) => !nuevasImagenes.includes(imagen));

            await run(
                db,
                'UPDATE publicaciones SET contenido = ?, imagen_url = ?, imagenes_json = ? WHERE id = ? AND usuario_id = ?',
                [texto, nuevasImagenes[0] || null, JSON.stringify(nuevasImagenes), req.params.id, usuarioId]
            );

            await Promise.all(imagenesEliminadas.map((imagen) => borrarImagenCloudinary(imagen)));
        } else {
            await run(
                db,
                'UPDATE publicaciones SET contenido = ? WHERE id = ? AND usuario_id = ?',
                [texto, req.params.id, usuarioId]
            );
        }

        res.json({ success: true, message: 'Publicacion actualizada' });
    } catch (error) {
        console.error('Error al editar publicacion:', error);
        res.status(500).json({ success: false, message: 'Error al editar publicacion' });
    }
});

router.get('/posts/user/:id', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.run(
            `SELECT p.id, p.usuario_id, p.contenido, p.imagen_url, p.imagenes_json, p.fecha,
                    u.nombre, u.usuario, u.foto_perfil,
                    COUNT(DISTINCT l.id)::int AS total_likes,
                    COUNT(DISTINCT c.id)::int AS total_comentarios,
                    EXISTS (
                        SELECT 1 FROM likes_publicaciones lm
                        WHERE lm.publicacion_id = p.id AND lm.usuario_id = ?
                    ) AS liked_by_me
             FROM publicaciones p
             JOIN usuarios u ON u.id = p.usuario_id
             LEFT JOIN likes_publicaciones l ON l.publicacion_id = p.id
             LEFT JOIN comentarios c ON c.publicacion_id = p.id
             WHERE p.usuario_id = ?
             GROUP BY p.id, u.nombre, u.usuario, u.foto_perfil
             ORDER BY p.fecha DESC
             LIMIT 30`,
            [req.query.currentUserId || req.params.id, req.params.id]
        );

        res.json({
            success: true,
            publicaciones: result.rows.map(publicacionPublica)
        });
    } catch (error) {
        console.error('Error al cargar publicaciones del perfil:', error);
        res.status(500).json({ success: false, message: 'Error al cargar publicaciones' });
    }
});

router.get('/feed/:id', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.run(
            `SELECT p.id, p.usuario_id, p.contenido, p.imagen_url, p.imagenes_json, p.fecha,
                    u.nombre, u.usuario, u.foto_perfil,
                    COUNT(DISTINCT l.id)::int AS total_likes,
                    COUNT(DISTINCT c.id)::int AS total_comentarios,
                    EXISTS (
                        SELECT 1 FROM likes_publicaciones lm
                        WHERE lm.publicacion_id = p.id AND lm.usuario_id = ?
                    ) AS liked_by_me
             FROM publicaciones p
             JOIN usuarios u ON u.id = p.usuario_id
             LEFT JOIN likes_publicaciones l ON l.publicacion_id = p.id
             LEFT JOIN comentarios c ON c.publicacion_id = p.id
             WHERE p.usuario_id = ?
                OR p.usuario_id IN (
                    SELECT seguido_id FROM seguidores WHERE seguidor_id = ?
                )
             GROUP BY p.id, u.nombre, u.usuario, u.foto_perfil
             ORDER BY p.fecha DESC
             LIMIT 50`,
            [req.params.id, req.params.id, req.params.id]
        );

        res.json({
            success: true,
            publicaciones: result.rows.map(publicacionPublica)
        });
    } catch (error) {
        console.error('Error al cargar feed:', error);
        res.status(500).json({ success: false, message: 'Error al cargar publicaciones' });
    }
});

router.delete('/posts/:id', async (req, res) => {
    try {
        const { usuarioId } = req.body;
        const db = getDb();

        if (!usuarioId) {
            return res.status(400).json({ success: false, message: 'Falta usuario' });
        }

        const publicacion = await get(
            db,
            'SELECT id, usuario_id, imagen_url, imagenes_json FROM publicaciones WHERE id = ?',
            [req.params.id]
        );

        if (!publicacion) {
            return res.status(404).json({ success: false, message: 'La publicacion ya no existe' });
        }

        if (Number(publicacion.usuario_id) !== Number(usuarioId)) {
            return res.status(403).json({ success: false, message: 'Solo puedes eliminar tus publicaciones' });
        }

        await run(db, 'DELETE FROM comentarios WHERE publicacion_id = ?', [req.params.id]);
        await run(db, 'DELETE FROM likes_publicaciones WHERE publicacion_id = ?', [req.params.id]);
        await run(db, 'DELETE FROM publicaciones WHERE id = ? AND usuario_id = ?', [req.params.id, usuarioId]);
        await Promise.all(leerImagenesPublicacion(publicacion).map((imagen) => borrarImagenCloudinary(imagen)));

        res.json({ success: true, message: 'Publicacion eliminada' });
    } catch (error) {
        console.error('Error al eliminar publicacion:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar publicacion' });
    }
});

router.post('/posts/:id/like', async (req, res) => {
    try {
        const { usuarioId } = req.body;
        const db = getDb();

        if (!usuarioId) {
            return res.status(400).json({ success: false, message: 'Falta usuario' });
        }

        const likeResult = await run(
            db,
            'INSERT INTO likes_publicaciones (publicacion_id, usuario_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
            [req.params.id, usuarioId]
        );

        const publicacion = await get(
            db,
            `SELECT p.usuario_id, u.nombre
             FROM publicaciones p
             JOIN usuarios u ON u.id = ?
             WHERE p.id = ?`,
            [usuarioId, req.params.id]
        );

        if (likeResult.rowCount && publicacion && Number(publicacion.usuario_id) !== Number(usuarioId)) {
            await crearNotificacion(
                db,
                publicacion.usuario_id,
                'like',
                `${publicacion.nombre || 'Un usuario'} reacciono a tu publicacion`,
                req.params.id
            );
        }

        res.json({ success: true, message: 'Like agregado' });
    } catch (error) {
        console.error('Error al dar like:', error);
        res.status(500).json({ success: false, message: 'Error al dar like' });
    }
});

router.delete('/posts/:id/like', async (req, res) => {
    try {
        const { usuarioId } = req.body;
        const db = getDb();

        await run(
            db,
            'DELETE FROM likes_publicaciones WHERE publicacion_id = ? AND usuario_id = ?',
            [req.params.id, usuarioId]
        );

        res.json({ success: true, message: 'Like eliminado' });
    } catch (error) {
        console.error('Error al quitar like:', error);
        res.status(500).json({ success: false, message: 'Error al quitar like' });
    }
});

router.get('/posts/:id/comments', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.run(
            `SELECT c.*, u.nombre, u.usuario, u.foto_perfil
             FROM comentarios c
             JOIN usuarios u ON u.id = c.usuario_id
             WHERE c.publicacion_id = ?
             ORDER BY c.fecha ASC
             LIMIT 40`,
            [req.params.id]
        );

        res.json({
            success: true,
            comentarios: result.rows.map(comentarioPublico)
        });
    } catch (error) {
        console.error('Error al cargar comentarios:', error);
        res.status(500).json({ success: false, message: 'Error al cargar comentarios' });
    }
});

router.post('/posts/:id/comments', async (req, res) => {
    try {
        const { usuarioId, contenido } = req.body;
        const db = getDb();
        const texto = String(contenido || '').trim();

        if (!usuarioId || !texto) {
            return res.status(400).json({ success: false, message: 'Escribe un comentario' });
        }

        const result = await db.run(
            `INSERT INTO comentarios (publicacion_id, usuario_id, contenido)
             VALUES (?, ?, ?)
             RETURNING id`,
            [req.params.id, usuarioId, texto]
        );

        const publicacion = await get(
            db,
            `SELECT p.usuario_id, u.nombre
             FROM publicaciones p
             JOIN usuarios u ON u.id = ?
             WHERE p.id = ?`,
            [usuarioId, req.params.id]
        );

        if (publicacion && Number(publicacion.usuario_id) !== Number(usuarioId)) {
            await crearNotificacion(
                db,
                publicacion.usuario_id,
                'comentario',
                `${publicacion.nombre || 'Un usuario'} comento tu publicacion`,
                req.params.id
            );
        }

        res.json({
            success: true,
            message: 'Comentario agregado',
            id: result.rows[0]?.id
        });
    } catch (error) {
        console.error('Error al comentar:', error);
        res.status(500).json({ success: false, message: 'Error al comentar' });
    }
});

router.get('/messages/conversations/:id', async (req, res) => {
    try {
        const db = getDb();
        const usuarioId = req.params.id;
        const result = await db.run(
            `WITH ultimos AS (
                SELECT
                    CASE
                        WHEN emisor_id = ? THEN receptor_id
                        ELSE emisor_id
                    END AS contacto_id,
                    MAX(fecha) AS ultima_fecha
                FROM mensajes
                WHERE emisor_id = ? OR receptor_id = ?
                GROUP BY contacto_id
            )
            SELECT u.id, u.nombre, u.usuario, u.foto_perfil, m.contenido AS ultimo_mensaje, m.fecha AS ultima_fecha
            FROM ultimos ul
            JOIN usuarios u ON u.id = ul.contacto_id
            JOIN mensajes m ON (
                ((m.emisor_id = ? AND m.receptor_id = u.id) OR (m.emisor_id = u.id AND m.receptor_id = ?))
                AND m.fecha = ul.ultima_fecha
            )
            ORDER BY ul.ultima_fecha DESC
            LIMIT 30`,
            [usuarioId, usuarioId, usuarioId, usuarioId, usuarioId]
        );

        res.json({
            success: true,
            conversaciones: result.rows.map((fila) => ({
                id: fila.id,
                nombre: fila.nombre,
                usuario: fila.usuario,
                fotoPerfil: fila.foto_perfil,
                ultimoMensaje: fila.ultimo_mensaje,
                ultimaFecha: fila.ultima_fecha
            }))
        });
    } catch (error) {
        console.error('Error al cargar conversaciones:', error);
        res.status(500).json({ success: false, message: 'Error al cargar conversaciones' });
    }
});

router.get('/messages/:usuarioId/:contactoId', async (req, res) => {
    try {
        const db = getDb();
        const { usuarioId, contactoId } = req.params;
        const contacto = await get(
            db,
            'SELECT id, nombre, usuario, foto_perfil FROM usuarios WHERE id = ?',
            [contactoId]
        );

        if (!contacto) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const result = await db.run(
            `SELECT m.*,
                    e.nombre AS emisor_nombre, e.usuario AS emisor_usuario, e.foto_perfil AS emisor_foto,
                    r.nombre AS receptor_nombre, r.usuario AS receptor_usuario, r.foto_perfil AS receptor_foto
             FROM mensajes m
             JOIN usuarios e ON e.id = m.emisor_id
             JOIN usuarios r ON r.id = m.receptor_id
             WHERE (m.emisor_id = ? AND m.receptor_id = ?)
                OR (m.emisor_id = ? AND m.receptor_id = ?)
             ORDER BY m.fecha ASC
             LIMIT 80`,
            [usuarioId, contactoId, contactoId, usuarioId]
        );

        await run(
            db,
            'UPDATE mensajes SET leido = TRUE WHERE receptor_id = ? AND emisor_id = ?',
            [usuarioId, contactoId]
        );

        res.json({
            success: true,
            contacto: {
                id: contacto.id,
                nombre: contacto.nombre,
                usuario: contacto.usuario,
                fotoPerfil: contacto.foto_perfil
            },
            mensajes: result.rows.map((mensaje) => mensajePublico(mensaje, usuarioId))
        });
    } catch (error) {
        console.error('Error al cargar mensajes:', error);
        res.status(500).json({ success: false, message: 'Error al cargar mensajes' });
    }
});

router.post('/messages', async (req, res) => {
    try {
        const { emisorId, receptorId, contenido } = req.body;
        const db = getDb();
        const texto = String(contenido || '').trim();

        if (!emisorId || !receptorId || !texto) {
            return res.status(400).json({ success: false, message: 'Escribe un mensaje' });
        }

        if (Number(emisorId) === Number(receptorId)) {
            return res.status(400).json({ success: false, message: 'No puedes enviarte mensajes a ti mismo' });
        }

        const receptor = await get(db, 'SELECT id FROM usuarios WHERE id = ?', [receptorId]);
        if (!receptor) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const result = await db.run(
            `INSERT INTO mensajes (emisor_id, receptor_id, contenido)
             VALUES (?, ?, ?)
             RETURNING id`,
            [emisorId, receptorId, texto]
        );

        const emisor = await get(db, 'SELECT nombre FROM usuarios WHERE id = ?', [emisorId]);
        await crearNotificacion(
            db,
            receptorId,
            'mensaje',
            `${emisor?.nombre || 'Un usuario'} te envio un mensaje`,
            result.rows[0]?.id || null
        );

        res.json({
            success: true,
            message: 'Mensaje enviado',
            id: result.rows[0]?.id
        });
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({ success: false, message: 'Error al enviar mensaje' });
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
