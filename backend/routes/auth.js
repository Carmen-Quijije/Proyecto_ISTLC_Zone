const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { getDb } = require('../database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const SMTP_HOST = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_USER || process.env.BREVO_SMTP_USER;
const EMAIL_PASS = process.env.EMAIL_PASS || process.env.SMTP_PASS || process.env.BREVO_SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_FROM || EMAIL_USER;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'ISTLC Zone';
const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const hayCredencialesSmtp = () => Boolean(EMAIL_USER && EMAIL_PASS);

const crearTransporter = () => nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: hayCredencialesSmtp()
        ? {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
        : undefined,
    requireTLS: SMTP_PORT === 587,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: {
        servername: SMTP_HOST
    }
});

const obtenerRemitente = () => {
    if (!EMAIL_FROM) return null;

    const remitente = String(EMAIL_FROM).trim();
    const match = remitente.match(/^(.*)<(.+)>$/);

    if (match) {
        return {
            name: match[1].trim().replace(/^"|"$/g, '') || EMAIL_FROM_NAME,
            email: match[2].trim()
        };
    }

    return {
        name: EMAIL_FROM_NAME,
        email: remitente
    };
};

const diagnosticoCorreo = () => ({
    brevoApiKey: Boolean(BREVO_API_KEY),
    smtpHost: SMTP_HOST,
    smtpPort: SMTP_PORT,
    smtpUsuario: Boolean(EMAIL_USER),
    smtpClave: Boolean(EMAIL_PASS),
    remitente: Boolean(obtenerRemitente()?.email)
});

const generarCodigo = () => Math.floor(100000 + Math.random() * 900000).toString();
const db = () => getDb();
const all = async (sql, params = []) => (await db().run(sql, params)).rows || [];
const one = (sql, params = []) => db().get(sql, params);
const exec = (sql, params = []) => db().run(sql, params);
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const esErrorTemporalCorreo = (error) => ['ETIMEDOUT', 'ECONNECTION', 'ECONNRESET', 'ESOCKET'].includes(error?.code);

const normalizarUsuario = (usuario = {}) => ({
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    usuario: usuario.usuario,
    privacidad: !!usuario.privacidad,
    emailVerificado: !!usuario.email_verificado,
    viveEn: usuario.vive_en || '',
    lugarOrigen: usuario.lugar_origen || '',
    fechaNacimiento: usuario.fecha_nacimiento || '',
    estadoCivil: usuario.estado_civil || '',
    carrera: usuario.carrera || '',
    semestre: usuario.semestre || '',
    fotoPerfil: usuario.foto_perfil || '',
    bio: usuario.bio || ''
});

const usuarioSelect = `
    id, nombre, email, usuario, privacidad, email_verificado,
    vive_en, lugar_origen, fecha_nacimiento, estado_civil,
    carrera, semestre, foto_perfil, bio
`;
const usuarioSelectConAlias = (alias) => `
    ${alias}.id, ${alias}.nombre, ${alias}.email, ${alias}.usuario, ${alias}.privacidad, ${alias}.email_verificado,
    ${alias}.vive_en, ${alias}.lugar_origen, ${alias}.fecha_nacimiento, ${alias}.estado_civil,
    ${alias}.carrera, ${alias}.semestre, ${alias}.foto_perfil, ${alias}.bio
`;

const crearNotificacion = async (usuarioId, tipo, mensaje, referenciaId = null) => {
    if (!usuarioId || !mensaje) return;
    await exec(
        'INSERT INTO notificaciones (usuario_id, tipo, mensaje, referencia_id) VALUES (?, ?, ?, ?)',
        [usuarioId, tipo, mensaje, referenciaId]
    );
};

const enviarCorreoBrevoApi = async (email, asunto, html) => {
    const sender = obtenerRemitente();
    if (!BREVO_API_KEY || !sender?.email) {
        console.warn('Brevo API omitida:', {
            brevoApiKey: Boolean(BREVO_API_KEY),
            remitente: Boolean(sender?.email)
        });
        return false;
    }

    try {
        const response = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender,
                to: [{ email }],
                subject: asunto,
                htmlContent: html
            })
        });

        const text = await response.text();
        let data = {};
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (_) {
                data = { raw: text };
            }
        }

        if (!response.ok) {
            console.error('Brevo API error:', response.status, typeof data.raw === 'string' ? data.raw.slice(0, 500) : data);
            return false;
        }

        console.log('Brevo API accepted:', email, data.messageId || 'sin messageId');
        return true;
    } catch (error) {
        console.error('Error al enviar email por API Brevo:', error);
        return false;
    }
};

const enviarCorreoSmtp = async (email, asunto, html) => {
    const sender = obtenerRemitente();
    if (!sender?.email || !hayCredencialesSmtp()) return false;

    const maxIntentos = 2;
    const transporter = crearTransporter();

    for (let intento = 1; intento <= maxIntentos; intento++) {
        try {
            const info = await transporter.sendMail({
                from: { name: sender.name, address: sender.email },
                to: email,
                subject: asunto,
                html
            });
            const aceptados = Array.isArray(info.accepted) ? info.accepted.map(String) : [];
            const rechazados = Array.isArray(info.rejected) ? info.rejected.map(String) : [];

            console.log('Brevo SMTP messageId:', info.messageId || 'sin messageId');
            console.log('Brevo SMTP accepted:', aceptados);
            console.log('Brevo SMTP rejected:', rechazados);

            if (aceptados.length > 0 && rechazados.length === 0) return true;
            return !!info.messageId && rechazados.length === 0;
        } catch (error) {
            console.error(`Error al enviar email por SMTP (intento ${intento}/${maxIntentos}):`, error);
            if (intento < maxIntentos && esErrorTemporalCorreo(error)) {
                await esperar(1500);
                continue;
            }
            return false;
        }
    }

    return false;
};

const enviarCorreo = async (email, asunto, html) => {
    const envioApi = await enviarCorreoBrevoApi(email, asunto, html);
    if (envioApi) return true;

    if (BREVO_API_KEY) {
        console.warn('Brevo API no pudo enviar, intentando SMTP...');
    }

    const envioSmtp = await enviarCorreoSmtp(email, asunto, html);
    if (!envioSmtp) {
        console.error('No se pudo enviar correo. Configuracion detectada:', diagnosticoCorreo());
    }

    return envioSmtp;
};

const enviarCorreoVerificacion = (email, codigo) => enviarCorreo(
    email,
    'Codigo de verificacion - ISTLC Zone',
    `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px">
            <h2 style="color:#061A38;text-align:center">Bienvenido a ISTLC Zone</h2>
            <p>Tu codigo de verificacion es:</p>
            <div style="background:#FFC107;padding:18px;text-align:center;border-radius:8px">
                <h1 style="color:#061A38;letter-spacing:5px;margin:0">${codigo}</h1>
            </div>
            <p style="color:#666">Este codigo expira en 10 minutos.</p>
        </div>
    `
);

const enviarCorreoRecuperacion = (email, codigo) => enviarCorreo(
    email,
    'Recuperacion de cuenta - ISTLC Zone',
    `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px">
            <h2 style="color:#061A38;text-align:center">Recuperacion de cuenta</h2>
            <p>Usa este codigo para cambiar tu contrasena:</p>
            <div style="background:#FFC107;padding:18px;text-align:center;border-radius:8px">
                <h1 style="color:#061A38;letter-spacing:5px;margin:0">${codigo}</h1>
            </div>
            <p style="color:#666">Este codigo expira en 10 minutos.</p>
        </div>
    `
);

const parseImagenes = (publicacion) => {
    if (publicacion.imagenes_json) {
        try {
            const imagenes = JSON.parse(publicacion.imagenes_json);
            if (Array.isArray(imagenes)) return imagenes.filter(Boolean);
        } catch (_) {}
    }
    return publicacion.imagen_url ? [publicacion.imagen_url] : [];
};

const mapPublicacion = (row) => ({
    id: row.id,
    contenido: row.contenido,
    imagenUrl: row.imagen_url || '',
    imagenes: parseImagenes(row),
    fecha: row.fecha,
    totalLikes: Number(row.total_likes || 0),
    totalComentarios: Number(row.total_comentarios || 0),
    likedByMe: !!row.liked_by_me,
    autor: {
        id: row.autor_id,
        nombre: row.autor_nombre,
        usuario: row.autor_usuario,
        fotoPerfil: row.autor_foto_perfil || ''
    }
});

const publicacionesQuery = (where) => `
    SELECT
        p.*,
        u.id AS autor_id,
        u.nombre AS autor_nombre,
        u.usuario AS autor_usuario,
        u.foto_perfil AS autor_foto_perfil,
        COALESCE(l.total_likes, 0) AS total_likes,
        COALESCE(c.total_comentarios, 0) AS total_comentarios,
        CASE WHEN lbm.usuario_id IS NULL THEN FALSE ELSE TRUE END AS liked_by_me
    FROM publicaciones p
    JOIN usuarios u ON u.id = p.usuario_id
    LEFT JOIN (
        SELECT publicacion_id, COUNT(*) AS total_likes
        FROM likes_publicaciones
        GROUP BY publicacion_id
    ) l ON l.publicacion_id = p.id
    LEFT JOIN (
        SELECT publicacion_id, COUNT(*) AS total_comentarios
        FROM comentarios
        GROUP BY publicacion_id
    ) c ON c.publicacion_id = p.id
    LEFT JOIN likes_publicaciones lbm
        ON lbm.publicacion_id = p.id AND lbm.usuario_id = ?
    ${where}
    ORDER BY p.fecha DESC
`;

router.post('/login', async (req, res) => {
    try {
        const { identificador, email, usuario, password } = req.body;
        const login = String(identificador || email || usuario || '').trim();

        if (!login || !password) {
            return res.status(400).json({ success: false, message: 'Ingresa usuario/correo y contrasena' });
        }

        const encontrado = await one(
            `SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?) OR LOWER(usuario) = LOWER(?) LIMIT 1`,
            [login, login]
        );

        if (!encontrado || !(await bcrypt.compare(password, encontrado.password))) {
            return res.status(401).json({ success: false, message: 'Usuario, correo o contrasena incorrectos' });
        }

        res.json({ success: true, usuario: normalizarUsuario(encontrado) });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: 'Error al iniciar sesion' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { nombre, email, usuario, password, privacidad } = req.body;
        if (!nombre || !email || !usuario || !password) {
            return res.status(400).json({ success: false, message: 'Faltan datos' });
        }
        if (!email.endsWith('@tecnologicoliceocristiano.edu.ec')) {
            return res.status(400).json({ success: false, message: 'Solo se aceptan correos institucionales' });
        }

        const existe = await one('SELECT id FROM usuarios WHERE email = ? OR usuario = ?', [email, usuario]);
        if (existe) {
            return res.status(400).json({ success: false, message: 'El email o usuario ya esta registrado' });
        }

        await exec('DELETE FROM registros_pendientes WHERE email = ? OR usuario = ?', [email, usuario]);
        await exec('UPDATE codigos_verificacion SET usado = TRUE WHERE email = ?', [email]);

        const hashedPassword = await bcrypt.hash(password, 10);
        const codigo = generarCodigo();
        const expiracion = new Date(Date.now() + 10 * 60000).toISOString();

        await exec(
            `INSERT INTO registros_pendientes (nombre, email, usuario, password, privacidad)
             VALUES (?, ?, ?, ?, ?)`,
            [nombre, email, usuario, hashedPassword, !!privacidad]
        );
        await exec(
            'INSERT INTO codigos_verificacion (email, codigo, fecha_expiracion) VALUES (?, ?, ?)',
            [email, codigo, expiracion]
        );

        if (!(await enviarCorreoVerificacion(email, codigo))) {
            await exec('UPDATE codigos_verificacion SET usado = TRUE WHERE email = ? AND codigo = ?', [email, codigo]);
            await exec('DELETE FROM registros_pendientes WHERE email = ?', [email]);
            return res.status(502).json({ success: false, message: 'No se pudo enviar el codigo. Configura BREVO_API_KEY en Render o revisa las credenciales SMTP de Brevo.' });
        }

        res.json({ success: true, message: 'Verifica tu email para completar el registro' });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, message: error.code === '23505' ? 'Ese correo o usuario ya existe' : 'Error al registrar' });
    }
});

router.post('/verify-email', async (req, res) => {
    try {
        const { email, codigo } = req.body;
        const codigoValido = await one(
            `SELECT * FROM codigos_verificacion
             WHERE email = ? AND codigo = ? AND usado = FALSE AND fecha_expiracion > NOW()
             ORDER BY id DESC LIMIT 1`,
            [email, codigo]
        );
        if (!codigoValido) {
            return res.status(400).json({ success: false, message: 'Codigo invalido o expirado' });
        }

        const pendiente = await one('SELECT * FROM registros_pendientes WHERE email = ?', [email]);
        if (!pendiente) {
            return res.status(400).json({ success: false, message: 'No hay registro pendiente para este email' });
        }

        await exec(
            `INSERT INTO usuarios (nombre, email, usuario, password, privacidad, codigo_verificacion, email_verificado)
             VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
            [pendiente.nombre, pendiente.email, pendiente.usuario, pendiente.password, !!pendiente.privacidad, codigo]
        );
        await exec('UPDATE codigos_verificacion SET usado = TRUE WHERE id = ?', [codigoValido.id]);
        await exec('DELETE FROM registros_pendientes WHERE email = ?', [email]);

        res.json({ success: true, message: 'Email verificado correctamente' });
    } catch (error) {
        console.error('Error al verificar:', error);
        res.status(500).json({ success: false, message: error.code === '23505' ? 'Ese correo o usuario ya existe' : 'Error al verificar email' });
    }
});

router.post('/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        const pendiente = await one('SELECT * FROM registros_pendientes WHERE email = ?', [email]);
        if (!pendiente) {
            return res.status(400).json({ success: false, message: 'No hay registro pendiente para este email' });
        }

        const codigo = generarCodigo();
        await exec('UPDATE codigos_verificacion SET usado = TRUE WHERE email = ?', [email]);
        await exec(
            'INSERT INTO codigos_verificacion (email, codigo, fecha_expiracion) VALUES (?, ?, ?)',
            [email, codigo, new Date(Date.now() + 10 * 60000).toISOString()]
        );

        if (!(await enviarCorreoVerificacion(email, codigo))) {
            await exec('UPDATE codigos_verificacion SET usado = TRUE WHERE email = ? AND codigo = ?', [email, codigo]);
            return res.status(502).json({ success: false, message: 'No se pudo reenviar el codigo. Configura BREVO_API_KEY en Render o revisa las credenciales SMTP de Brevo.' });
        }

        res.json({ success: true, message: 'Codigo reenviado a tu email' });
    } catch (error) {
        console.error('Error al reenviar:', error);
        res.status(500).json({ success: false, message: 'Error al reenviar codigo' });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const usuario = await one('SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?)', [email]);
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'No existe una cuenta con ese correo' });
        }

        const codigo = generarCodigo();
        await exec('UPDATE codigos_recuperacion SET usado = TRUE WHERE email = ?', [email]);
        await exec(
            'INSERT INTO codigos_recuperacion (email, codigo, fecha_expiracion) VALUES (?, ?, ?)',
            [email, codigo, new Date(Date.now() + 10 * 60000).toISOString()]
        );

        if (!(await enviarCorreoRecuperacion(email, codigo))) {
            await exec('UPDATE codigos_recuperacion SET usado = TRUE WHERE email = ? AND codigo = ?', [email, codigo]);
            return res.status(502).json({ success: false, message: 'No se pudo enviar el codigo. Configura BREVO_API_KEY en Render o revisa las credenciales SMTP de Brevo.' });
        }

        res.json({ success: true, message: 'Codigo enviado al correo' });
    } catch (error) {
        console.error('Error recuperacion:', error);
        res.status(500).json({ success: false, message: 'No se pudo enviar el codigo. Revisa Brevo.' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { email, codigo, password } = req.body;
        const valido = await one(
            `SELECT id FROM codigos_recuperacion
             WHERE email = ? AND codigo = ? AND usado = FALSE AND fecha_expiracion > NOW()
             ORDER BY id DESC LIMIT 1`,
            [email, codigo]
        );
        if (!valido) {
            return res.status(400).json({ success: false, message: 'Codigo invalido o expirado' });
        }

        await exec('UPDATE usuarios SET password = ? WHERE email = ?', [await bcrypt.hash(password, 10), email]);
        await exec('UPDATE codigos_recuperacion SET usado = TRUE WHERE id = ?', [valido.id]);
        res.json({ success: true, message: 'Contrasena actualizada' });
    } catch (error) {
        console.error('Error reset:', error);
        res.status(500).json({ success: false, message: 'No se pudo cambiar la contrasena' });
    }
});

router.get('/profile/:id', async (req, res) => {
    try {
        const currentUserId = Number(req.query.currentUserId || 0);
        const usuario = await one(`SELECT ${usuarioSelect} FROM usuarios WHERE id = ?`, [req.params.id]);
        if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        const seguidores = await one('SELECT COUNT(*) AS total FROM seguidores WHERE seguido_id = ?', [req.params.id]);
        const seguidos = await one('SELECT COUNT(*) AS total FROM seguidores WHERE seguidor_id = ?', [req.params.id]);
        const seguimiento = currentUserId
            ? await one('SELECT id FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [currentUserId, req.params.id])
            : null;
        const solicitud = currentUserId
            ? await one(
                `SELECT id FROM solicitudes_seguimiento
                 WHERE solicitante_id = ? AND receptor_id = ? AND estado = 'pendiente'`,
                [currentUserId, req.params.id]
            )
            : null;

        res.json({
            success: true,
            usuario: normalizarUsuario(usuario),
            seguidores: Number(seguidores.total || 0),
            seguidos: Number(seguidos.total || 0),
            siguiendo: !!seguimiento,
            solicitudPendiente: !!solicitud
        });
    } catch (error) {
        console.error('Error perfil:', error);
        res.status(500).json({ success: false, message: 'No se pudo cargar el perfil' });
    }
});

router.put('/profile', async (req, res) => {
    try {
        const { id, nombre, viveEn, lugarOrigen, fechaNacimiento, estadoCivil, carrera, semestre, fotoPerfil, bio } = req.body;
        await exec(
            `UPDATE usuarios
             SET nombre = ?, vive_en = ?, lugar_origen = ?, fecha_nacimiento = ?, estado_civil = ?,
                 carrera = ?, semestre = ?, foto_perfil = ?, bio = ?
             WHERE id = ?`,
            [nombre, viveEn, lugarOrigen, fechaNacimiento, estadoCivil, carrera, semestre, fotoPerfil, bio, id]
        );
        const actualizado = await one(`SELECT ${usuarioSelect} FROM usuarios WHERE id = ?`, [id]);
        res.json({ success: true, usuario: normalizarUsuario(actualizado) });
    } catch (error) {
        console.error('Error actualizar perfil:', error);
        res.status(500).json({ success: false, message: 'No se pudo actualizar el perfil' });
    }
});

router.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No se recibio imagen' });
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return res.status(500).json({ success: false, message: 'Falta configurar Cloudinary' });
        }

        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const result = await cloudinary.uploader.upload(dataUri, {
            folder: req.body.folder || 'istlc-zone',
            resource_type: 'image'
        });
        res.json({ success: true, url: result.secure_url });
    } catch (error) {
        console.error('Error Cloudinary:', error);
        res.status(500).json({ success: false, message: `No se pudo subir la imagen${error.message ? `: ${error.message}` : ''}` });
    }
});

router.get('/users', async (req, res) => {
    try {
        const q = `%${String(req.query.q || '').toLowerCase()}%`;
        const currentUserId = Number(req.query.currentUserId || 0);
        const usuarios = await all(
            `SELECT ${usuarioSelectConAlias('u')},
                CASE WHEN s.id IS NULL THEN FALSE ELSE TRUE END AS siguiendo,
                CASE WHEN ss.id IS NULL THEN FALSE ELSE TRUE END AS solicitud_pendiente
             FROM usuarios u
             LEFT JOIN seguidores s ON s.seguidor_id = ? AND s.seguido_id = u.id
             LEFT JOIN solicitudes_seguimiento ss
                ON ss.solicitante_id = ? AND ss.receptor_id = u.id AND ss.estado = 'pendiente'
             WHERE u.id <> ? AND (
                LOWER(u.nombre) LIKE ? OR LOWER(u.usuario) LIKE ? OR LOWER(u.email) LIKE ?
             )
             ORDER BY u.nombre ASC`,
            [currentUserId, currentUserId, currentUserId, q, q, q]
        );

        res.json({
            success: true,
            usuarios: usuarios.map((u) => ({
                ...normalizarUsuario(u),
                siguiendo: !!u.siguiendo,
                solicitudPendiente: !!u.solicitud_pendiente
            }))
        });
    } catch (error) {
        console.error('Error usuarios:', error);
        res.status(500).json({ success: false, message: 'No se pudieron cargar usuarios' });
    }
});

router.get('/following/:id', async (req, res) => {
    try {
        const currentUserId = Number(req.query.currentUserId || 0);
        const usuarios = await all(
            `SELECT ${usuarioSelectConAlias('u')},
                CASE WHEN sf.id IS NULL THEN FALSE ELSE TRUE END AS siguiendo,
                CASE WHEN ss.id IS NULL THEN FALSE ELSE TRUE END AS solicitud_pendiente
             FROM seguidores s
             JOIN usuarios u ON u.id = s.seguido_id
             LEFT JOIN seguidores sf ON sf.seguidor_id = ? AND sf.seguido_id = u.id
             LEFT JOIN solicitudes_seguimiento ss
                ON ss.solicitante_id = ? AND ss.receptor_id = u.id AND ss.estado = 'pendiente'
             WHERE s.seguidor_id = ?
             ORDER BY u.nombre ASC`,
            [currentUserId, currentUserId, req.params.id]
        );
        res.json({
            success: true,
            usuarios: usuarios.map((u) => ({
                ...normalizarUsuario(u),
                siguiendo: !!u.siguiendo,
                solicitudPendiente: !!u.solicitud_pendiente
            }))
        });
    } catch (error) {
        console.error('Error following:', error);
        res.status(500).json({ success: false, message: 'No se pudo cargar la red' });
    }
});

router.post('/follow', async (req, res) => {
    try {
        const { seguidorId, seguidoId } = req.body;
        if (Number(seguidorId) === Number(seguidoId)) {
            return res.status(400).json({ success: false, message: 'No puedes seguirte a ti mismo' });
        }

        const existente = await one(
            `SELECT id FROM solicitudes_seguimiento
             WHERE solicitante_id = ? AND receptor_id = ? AND estado = 'pendiente'`,
            [seguidorId, seguidoId]
        );
        if (!existente) {
            await exec(
                `INSERT INTO solicitudes_seguimiento (solicitante_id, receptor_id, estado)
                 VALUES (?, ?, 'pendiente')
                 ON CONFLICT (solicitante_id, receptor_id) DO UPDATE SET estado = 'pendiente', fecha = NOW()`,
                [seguidorId, seguidoId]
            );
            const solicitante = await one('SELECT nombre FROM usuarios WHERE id = ?', [seguidorId]);
            await crearNotificacion(seguidoId, 'solicitud', `${solicitante?.nombre || 'Un usuario'} quiere seguirte`, seguidorId);
        }

        res.json({ success: true, message: 'Solicitud enviada' });
    } catch (error) {
        console.error('Error follow:', error);
        res.status(500).json({ success: false, message: 'No se pudo enviar la solicitud' });
    }
});

router.delete('/follow', async (req, res) => {
    try {
        const { seguidorId, seguidoId } = req.body;
        await exec('DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?', [seguidorId, seguidoId]);
        await exec('DELETE FROM solicitudes_seguimiento WHERE solicitante_id = ? AND receptor_id = ?', [seguidorId, seguidoId]);
        res.json({ success: true, message: 'Seguimiento eliminado' });
    } catch (error) {
        console.error('Error unfollow:', error);
        res.status(500).json({ success: false, message: 'No se pudo eliminar el seguimiento' });
    }
});

router.get('/follow-requests/:usuarioId', async (req, res) => {
    try {
        const solicitudes = await all(
            `SELECT ss.id, ss.fecha, u.id AS usuario_id, u.nombre, u.usuario, u.foto_perfil
             FROM solicitudes_seguimiento ss
             JOIN usuarios u ON u.id = ss.solicitante_id
             WHERE ss.receptor_id = ? AND ss.estado = 'pendiente'
             ORDER BY ss.fecha DESC`,
            [req.params.usuarioId]
        );
        res.json({ success: true, solicitudes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'No se pudieron cargar solicitudes' });
    }
});

const responderSolicitudSeguimientoHandler = async (req, res) => {
    try {
        const solicitud = await one('SELECT * FROM solicitudes_seguimiento WHERE id = ?', [req.params.id]);
        if (!solicitud) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });

        if (req.params.accion === 'accept' || req.params.accion === 'aceptar') {
            await exec(
                `INSERT INTO seguidores (seguidor_id, seguido_id)
                 VALUES (?, ?) ON CONFLICT (seguidor_id, seguido_id) DO NOTHING`,
                [solicitud.solicitante_id, solicitud.receptor_id]
            );
            await exec('UPDATE solicitudes_seguimiento SET estado = ? WHERE id = ?', ['aceptada', req.params.id]);
            await exec(
                'DELETE FROM notificaciones WHERE usuario_id = ? AND tipo = ? AND referencia_id = ?',
                [solicitud.receptor_id, 'solicitud', solicitud.solicitante_id]
            );
            const receptor = await one('SELECT nombre FROM usuarios WHERE id = ?', [solicitud.receptor_id]);
            await crearNotificacion(solicitud.solicitante_id, 'seguimiento', `${receptor?.nombre || 'Un usuario'} acepto tu solicitud`, solicitud.receptor_id);
            return res.json({ success: true, message: 'Solicitud aceptada' });
        }

        await exec('UPDATE solicitudes_seguimiento SET estado = ? WHERE id = ?', ['rechazada', req.params.id]);
        await exec(
            'DELETE FROM notificaciones WHERE usuario_id = ? AND tipo = ? AND referencia_id = ?',
            [solicitud.receptor_id, 'solicitud', solicitud.solicitante_id]
        );
        res.json({ success: true, message: 'Solicitud rechazada' });
    } catch (error) {
        console.error('Error solicitud:', error);
        res.status(500).json({ success: false, message: 'No se pudo responder la solicitud' });
    }
};

router.put('/follow-requests/:id/:accion', responderSolicitudSeguimientoHandler);
router.post('/follow-requests/:id/:accion', responderSolicitudSeguimientoHandler);

router.post('/posts', async (req, res) => {
    try {
        const { usuarioId, contenido, imagenesUrls = [] } = req.body;
        const imagenes = Array.isArray(imagenesUrls) ? imagenesUrls.filter(Boolean) : [];
        if (!contenido && !imagenes.length) {
            return res.status(400).json({ success: false, message: 'Escribe algo o agrega una imagen' });
        }

        const result = await exec(
            `INSERT INTO publicaciones (usuario_id, contenido, imagen_url, imagenes_json)
             VALUES (?, ?, ?, ?) RETURNING id`,
            [usuarioId, contenido || '', imagenes[0] || null, JSON.stringify(imagenes)]
        );
        res.json({ success: true, id: result.rows[0]?.id });
    } catch (error) {
        console.error('Error publicar:', error);
        res.status(500).json({ success: false, message: 'No se pudo publicar' });
    }
});

router.get('/feed/:usuarioId', async (req, res) => {
    try {
        const id = Number(req.params.usuarioId);
        const publicaciones = await all(
            publicacionesQuery(`WHERE p.usuario_id = ? OR p.usuario_id IN (
                SELECT seguido_id FROM seguidores WHERE seguidor_id = ?
            )`),
            [id, id, id]
        );
        res.json({ success: true, publicaciones: publicaciones.map(mapPublicacion) });
    } catch (error) {
        console.error('Error feed:', error);
        res.status(500).json({ success: false, message: 'No se pudo cargar el muro' });
    }
});

router.get('/posts/user/:usuarioId', async (req, res) => {
    try {
        const currentUserId = Number(req.query.currentUserId || req.params.usuarioId);
        const publicaciones = await all(
            publicacionesQuery('WHERE p.usuario_id = ?'),
            [currentUserId, req.params.usuarioId]
        );
        res.json({ success: true, publicaciones: publicaciones.map(mapPublicacion) });
    } catch (error) {
        console.error('Error posts user:', error);
        res.status(500).json({ success: false, message: 'No se pudieron cargar publicaciones' });
    }
});

router.get('/activity/:usuarioId', async (req, res) => {
    try {
        const usuarioId = Number(req.params.usuarioId);
        const usuario = await one(
            'SELECT id, nombre, usuario, foto_perfil, fecha_registro FROM usuarios WHERE id = ?',
            [usuarioId]
        );

        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const actividades = [];
        const fotoUsuario = usuario.foto_perfil || '';

        if (usuario.fecha_registro) {
            actividades.push({
                clave: `registro-${usuario.id}`,
                tipo: 'registro',
                titulo: `${usuario.nombre} se unio a ISTLC Zone`,
                descripcion: 'Inicio su perfil en la comunidad.',
                fecha: usuario.fecha_registro,
                destino: `perfil.html?id=${usuario.id}`,
                nombrePersona: usuario.nombre,
                foto: fotoUsuario
            });
        }

        const publicaciones = await all(
            `SELECT id, contenido, imagen_url, fecha
             FROM publicaciones
             WHERE usuario_id = ?
             ORDER BY fecha DESC
             LIMIT 50`,
            [usuarioId]
        );

        publicaciones.forEach((publicacion) => {
            actividades.push({
                clave: `publicacion-${publicacion.id}`,
                tipo: 'publicacion',
                titulo: `${usuario.nombre} publico en su perfil`,
                descripcion: publicacion.contenido || (publicacion.imagen_url ? 'Publicacion con foto' : 'Nueva publicacion'),
                fecha: publicacion.fecha,
                destino: `perfil.html?id=${usuario.id}#publicacion-${publicacion.id}`,
                nombrePersona: usuario.nombre,
                foto: fotoUsuario
            });
        });

        const comentarios = await all(
            `SELECT c.id, c.contenido, c.fecha, p.id AS publicacion_id, pu.nombre AS autor_publicacion
             FROM comentarios c
             JOIN publicaciones p ON p.id = c.publicacion_id
             JOIN usuarios pu ON pu.id = p.usuario_id
             WHERE c.usuario_id = ?
             ORDER BY c.fecha DESC
             LIMIT 50`,
            [usuarioId]
        );

        comentarios.forEach((comentario) => {
            actividades.push({
                clave: `comentario-${comentario.id}`,
                tipo: 'comentario',
                titulo: `${usuario.nombre} comento una publicacion`,
                descripcion: comentario.contenido || `Comentario en una publicacion de ${comentario.autor_publicacion || 'un usuario'}`,
                fecha: comentario.fecha,
                destino: `muro.html?post=${comentario.publicacion_id}&comentarios=1`,
                nombrePersona: usuario.nombre,
                foto: fotoUsuario
            });
        });

        const likes = await all(
            `SELECT lp.id, lp.fecha, p.id AS publicacion_id, p.contenido, pu.nombre AS autor_publicacion
             FROM likes_publicaciones lp
             JOIN publicaciones p ON p.id = lp.publicacion_id
             JOIN usuarios pu ON pu.id = p.usuario_id
             WHERE lp.usuario_id = ?
             ORDER BY lp.fecha DESC
             LIMIT 50`,
            [usuarioId]
        );

        likes.forEach((like) => {
            actividades.push({
                clave: `like-${like.id}`,
                tipo: 'like',
                titulo: `${usuario.nombre} reacciono a una publicacion`,
                descripcion: `Le gusto una publicacion de ${like.autor_publicacion || 'un usuario'}: ${like.contenido || 'Publicacion con foto'}`,
                fecha: like.fecha,
                destino: `muro.html?post=${like.publicacion_id}`,
                nombrePersona: usuario.nombre,
                foto: fotoUsuario
            });
        });

        const seguimientos = await all(
            `SELECT s.id, s.fecha, u.id AS seguido_id, u.nombre AS seguido_nombre, u.foto_perfil AS seguido_foto
             FROM seguidores s
             JOIN usuarios u ON u.id = s.seguido_id
             WHERE s.seguidor_id = ?
             ORDER BY s.fecha DESC
             LIMIT 50`,
            [usuarioId]
        );

        seguimientos.forEach((seguimiento) => {
            actividades.push({
                clave: `seguimiento-${seguimiento.id}`,
                tipo: 'seguimiento',
                titulo: `${usuario.nombre} empezo a seguir a ${seguimiento.seguido_nombre || 'un usuario'}`,
                descripcion: 'Nueva conexion dentro de ISTLC Zone.',
                fecha: seguimiento.fecha,
                destino: `perfil.html?id=${seguimiento.seguido_id}`,
                nombrePersona: seguimiento.seguido_nombre || usuario.nombre,
                foto: seguimiento.seguido_foto || fotoUsuario
            });
        });

        actividades.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        res.json({ success: true, actividades });
    } catch (error) {
        console.error('Error activity:', error);
        res.status(500).json({ success: false, message: 'No se pudo cargar el historial de actividades' });
    }
});

router.put('/posts/:id', async (req, res) => {
    try {
        const { usuarioId, contenido, imagenesUrls = [] } = req.body;
        const imagenes = Array.isArray(imagenesUrls) ? imagenesUrls.filter(Boolean) : [];
        const post = await one('SELECT usuario_id FROM publicaciones WHERE id = ?', [req.params.id]);
        if (!post || Number(post.usuario_id) !== Number(usuarioId)) {
            return res.status(403).json({ success: false, message: 'No puedes editar esta publicacion' });
        }

        await exec(
            'UPDATE publicaciones SET contenido = ?, imagen_url = ?, imagenes_json = ? WHERE id = ?',
            [contenido || '', imagenes[0] || null, JSON.stringify(imagenes), req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Error editar post:', error);
        res.status(500).json({ success: false, message: 'No se pudo editar la publicacion' });
    }
});

router.delete('/posts/:id', async (req, res) => {
    try {
        const { usuarioId } = req.body;
        const post = await one('SELECT usuario_id FROM publicaciones WHERE id = ?', [req.params.id]);
        if (!post || Number(post.usuario_id) !== Number(usuarioId)) {
            return res.status(403).json({ success: false, message: 'No puedes eliminar esta publicacion' });
        }
        await exec('DELETE FROM publicaciones WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error eliminar post:', error);
        res.status(500).json({ success: false, message: 'No se pudo eliminar la publicacion' });
    }
});

router.post('/posts/:id/like', async (req, res) => {
    try {
        const { usuarioId } = req.body;
        await exec(
            'INSERT INTO likes_publicaciones (publicacion_id, usuario_id) VALUES (?, ?) ON CONFLICT (publicacion_id, usuario_id) DO NOTHING',
            [req.params.id, usuarioId]
        );
        const post = await one('SELECT usuario_id FROM publicaciones WHERE id = ?', [req.params.id]);
        const autor = await one('SELECT nombre FROM usuarios WHERE id = ?', [usuarioId]);
        if (post && Number(post.usuario_id) !== Number(usuarioId)) {
            await crearNotificacion(post.usuario_id, 'like', `${autor?.nombre || 'Un usuario'} reacciono a tu publicacion`, req.params.id);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'No se pudo dar me gusta' });
    }
});

router.delete('/posts/:id/like', async (req, res) => {
    try {
        await exec('DELETE FROM likes_publicaciones WHERE publicacion_id = ? AND usuario_id = ?', [req.params.id, req.body.usuarioId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'No se pudo quitar me gusta' });
    }
});

router.get('/posts/:id/comments', async (req, res) => {
    try {
        const comentarios = await all(
            `SELECT c.*, u.id AS autor_id, u.nombre AS autor_nombre, u.usuario AS autor_usuario,
                    u.foto_perfil AS autor_foto_perfil,
                    p.id AS padre_id, pu.nombre AS padre_nombre
             FROM comentarios c
             JOIN usuarios u ON u.id = c.usuario_id
             LEFT JOIN comentarios p ON p.id = c.comentario_padre_id
             LEFT JOIN usuarios pu ON pu.id = p.usuario_id
             WHERE c.publicacion_id = ?
             ORDER BY COALESCE(c.comentario_padre_id, c.id), c.fecha ASC`,
            [req.params.id]
        );
        res.json({
            success: true,
            comentarios: comentarios.map((c) => ({
                id: c.id,
                contenido: c.contenido,
                fecha: c.fecha,
                comentarioPadreId: c.comentario_padre_id,
                autor: { id: c.autor_id, nombre: c.autor_nombre, usuario: c.autor_usuario, fotoPerfil: c.autor_foto_perfil || '' },
                respuestaA: c.padre_id ? { autor: { nombre: c.padre_nombre } } : null
            }))
        });
    } catch (error) {
        console.error('Error comentarios:', error);
        res.status(500).json({ success: false, message: 'No se pudieron cargar comentarios' });
    }
});

router.post('/posts/:id/comments', async (req, res) => {
    try {
        const { usuarioId, contenido, comentarioPadreId } = req.body;
        await exec(
            'INSERT INTO comentarios (publicacion_id, usuario_id, contenido, comentario_padre_id) VALUES (?, ?, ?, ?)',
            [req.params.id, usuarioId, contenido, comentarioPadreId || null]
        );
        const post = await one('SELECT usuario_id FROM publicaciones WHERE id = ?', [req.params.id]);
        const autor = await one('SELECT nombre FROM usuarios WHERE id = ?', [usuarioId]);
        if (comentarioPadreId) {
            const padre = await one('SELECT usuario_id FROM comentarios WHERE id = ?', [comentarioPadreId]);
            if (padre && Number(padre.usuario_id) !== Number(usuarioId)) {
                await crearNotificacion(padre.usuario_id, 'respuesta_comentario', `${autor?.nombre || 'Un usuario'} respondio tu comentario`, req.params.id);
            }
        } else if (post && Number(post.usuario_id) !== Number(usuarioId)) {
            await crearNotificacion(post.usuario_id, 'comentario', `${autor?.nombre || 'Un usuario'} comento tu publicacion`, req.params.id);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error crear comentario:', error);
        res.status(500).json({ success: false, message: 'No se pudo comentar' });
    }
});

router.put('/posts/:postId/comments/:commentId', async (req, res) => {
    try {
        const { usuarioId, contenido } = req.body;
        const texto = String(contenido || '').trim();

        if (!texto) {
            return res.status(400).json({ success: false, message: 'El comentario no puede estar vacio' });
        }

        const comentario = await one(
            'SELECT id FROM comentarios WHERE id = ? AND publicacion_id = ? AND usuario_id = ?',
            [req.params.commentId, req.params.postId, usuarioId]
        );

        if (!comentario) {
            return res.status(403).json({ success: false, message: 'No puedes editar este comentario' });
        }

        await exec(
            'UPDATE comentarios SET contenido = ? WHERE id = ? AND publicacion_id = ? AND usuario_id = ?',
            [texto, req.params.commentId, req.params.postId, usuarioId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error editar comentario:', error);
        res.status(500).json({ success: false, message: 'No se pudo editar el comentario' });
    }
});

router.delete('/posts/:postId/comments/:commentId', async (req, res) => {
    try {
        const { usuarioId } = req.body;
        const comentario = await one(
            'SELECT id FROM comentarios WHERE id = ? AND publicacion_id = ? AND usuario_id = ?',
            [req.params.commentId, req.params.postId, usuarioId]
        );

        if (!comentario) {
            return res.status(403).json({ success: false, message: 'No puedes eliminar este comentario' });
        }

        await exec(
            'DELETE FROM comentarios WHERE id = ? AND publicacion_id = ? AND usuario_id = ?',
            [req.params.commentId, req.params.postId, usuarioId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error eliminar comentario:', error);
        res.status(500).json({ success: false, message: 'No se pudo eliminar el comentario' });
    }
});

router.post('/posts/:id/share-profile', async (req, res) => {
    try {
        const original = await one('SELECT * FROM publicaciones WHERE id = ?', [req.params.id]);
        if (!original) return res.status(404).json({ success: false, message: 'Publicacion no encontrada' });
        await exec(
            `INSERT INTO publicaciones (usuario_id, contenido, imagen_url, imagenes_json)
             VALUES (?, ?, ?, ?)`,
            [req.body.usuarioId, `Compartido: ${original.contenido}`, original.imagen_url, original.imagenes_json]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'No se pudo compartir' });
    }
});

router.post('/posts/:id/share-message', async (req, res) => {
    try {
        const original = await one('SELECT contenido FROM publicaciones WHERE id = ?', [req.params.id]);
        if (!original) return res.status(404).json({ success: false, message: 'Publicacion no encontrada' });
        await exec(
            'INSERT INTO mensajes (emisor_id, receptor_id, contenido) VALUES (?, ?, ?)',
            [req.body.emisorId, req.body.receptorId, `Te compartio una publicacion: ${original.contenido}`]
        );
        const emisor = await one('SELECT nombre FROM usuarios WHERE id = ?', [req.body.emisorId]);
        await crearNotificacion(req.body.receptorId, 'mensaje', `${emisor?.nombre || 'Un usuario'} te envio un mensaje`, req.body.emisorId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'No se pudo enviar por mensaje' });
    }
});

router.get('/messages/conversations/:usuarioId', async (req, res) => {
    try {
        const usuarioId = Number(req.params.usuarioId);
        const conversaciones = await all(
            `SELECT DISTINCT ON (otro.id)
                ${usuarioSelectConAlias('otro')},
                m.contenido AS ultimo_mensaje,
                m.fecha AS ultima_fecha,
                (
                    SELECT COUNT(*)
                    FROM mensajes mn
                    WHERE mn.emisor_id = otro.id
                      AND mn.receptor_id = ?
                      AND mn.leido = FALSE
                ) AS mensajes_no_leidos
             FROM mensajes m
             JOIN usuarios otro ON otro.id = CASE WHEN m.emisor_id = ? THEN m.receptor_id ELSE m.emisor_id END
             WHERE m.emisor_id = ? OR m.receptor_id = ?
             ORDER BY otro.id, m.fecha DESC`,
            [usuarioId, usuarioId, usuarioId, usuarioId]
        );
        res.json({
            success: true,
            conversaciones: conversaciones.map((u) => ({
                ...normalizarUsuario(u),
                ultimoMensaje: u.ultimo_mensaje,
                ultimaFecha: u.ultima_fecha,
                mensajesNoLeidos: Number(u.mensajes_no_leidos || 0)
            }))
        });
    } catch (error) {
        console.error('Error conversaciones:', error);
        res.status(500).json({ success: false, message: 'No se pudieron cargar conversaciones' });
    }
});

router.get('/messages/:usuarioId/:contactoId', async (req, res) => {
    try {
        const usuarioId = Number(req.params.usuarioId);
        const contacto = await one(`SELECT ${usuarioSelect} FROM usuarios WHERE id = ?`, [req.params.contactoId]);
        const mensajes = await all(
            `SELECT * FROM mensajes
             WHERE (emisor_id = ? AND receptor_id = ?) OR (emisor_id = ? AND receptor_id = ?)
             ORDER BY fecha ASC`,
            [usuarioId, req.params.contactoId, req.params.contactoId, usuarioId]
        );
        await exec('UPDATE mensajes SET leido = TRUE WHERE emisor_id = ? AND receptor_id = ?', [req.params.contactoId, usuarioId]);
        res.json({
            success: true,
            contacto: normalizarUsuario(contacto),
            mensajes: mensajes.map((m) => ({ id: m.id, contenido: m.contenido, fecha: m.fecha, mio: Number(m.emisor_id) === usuarioId }))
        });
    } catch (error) {
        console.error('Error mensajes:', error);
        res.status(500).json({ success: false, message: 'No se pudo abrir la conversacion' });
    }
});

router.post('/messages', async (req, res) => {
    try {
        const { emisorId, receptorId, contenido } = req.body;
        await exec('INSERT INTO mensajes (emisor_id, receptor_id, contenido) VALUES (?, ?, ?)', [emisorId, receptorId, contenido]);
        const emisor = await one('SELECT nombre FROM usuarios WHERE id = ?', [emisorId]);
        await crearNotificacion(receptorId, 'mensaje', `${emisor?.nombre || 'Un usuario'} te envio un mensaje`, emisorId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'No se pudo enviar el mensaje' });
    }
});

router.get('/notifications/:usuarioId', async (req, res) => {
    try {
        const notificaciones = await all(
            'SELECT * FROM notificaciones WHERE usuario_id = ? AND tipo <> ? ORDER BY fecha DESC LIMIT 50',
            [req.params.usuarioId, 'solicitud']
        );
        const contador = await one(
            'SELECT COUNT(*) AS total FROM notificaciones WHERE usuario_id = ? AND leida = FALSE AND tipo <> ?',
            [req.params.usuarioId, 'solicitud']
        );
        res.json({ success: true, notificaciones, sinLeer: Number(contador?.total || 0) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'No se pudieron cargar notificaciones' });
    }
});

router.put('/notifications/read', async (req, res) => {
    try {
        await exec('UPDATE notificaciones SET leida = TRUE WHERE usuario_id = ? AND tipo <> ?', [req.body.usuarioId, 'solicitud']);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'No se pudieron marcar notificaciones' });
    }
});

router.put('/notifications/:id/read', async (req, res) => {
    try {
        await exec(
            'UPDATE notificaciones SET leida = TRUE WHERE id = ? AND usuario_id = ?',
            [req.params.id, req.body.usuarioId]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'No se pudo marcar la notificacion' });
    }
});

router.put('/notifications/read-target', async (req, res) => {
    try {
        const { usuarioId, tipo, referenciaId } = req.body;
        await exec(
            'UPDATE notificaciones SET leida = TRUE WHERE usuario_id = ? AND tipo = ? AND referencia_id = ?',
            [usuarioId, tipo, referenciaId]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'No se pudo marcar la notificacion' });
    }
});

module.exports = router;
