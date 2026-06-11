const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    cargarHistorialActividad();
});

async function cargarHistorialActividad() {
    const contenedor = document.getElementById("listaActividad");

    try {
        const actividades = [];

        const publicaciones = await obtenerPublicacionesFeed();
        const notificaciones = await obtenerNotificaciones();

        publicaciones.forEach((publicacion) => {
            agregarActividadPublicacion(actividades, publicacion);
            agregarActividadLikePropio(actividades, publicacion);
        });

        await agregarActividadesComentarios(actividades, publicaciones);

        notificaciones.forEach((notificacion) => {
            agregarActividadNotificacion(actividades, notificacion);
        });

        const actividadesUnicas = eliminarDuplicados(actividades)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        if (!actividadesUnicas.length) {
            contenedor.innerHTML = `
                <p class="text-muted mb-0">
                    Aún no tienes actividades registradas.
                </p>
            `;
            return;
        }

        contenedor.innerHTML = actividadesUnicas.map(tarjetaActividad).join("");

    } catch (error) {
        console.error("Error cargando actividad:", error);

        contenedor.innerHTML = `
            <p class="text-danger">
                No se pudo cargar el historial de actividades.
            </p>
        `;
    }
}

async function obtenerPublicacionesFeed() {
    const respuesta = await fetch(`${API_BASE}/api/auth/feed/${usuario.id}`);
    const data = await respuesta.json();

    if (!respuesta.ok || !data.success) {
        return [];
    }

    return data.publicaciones || [];
}

async function obtenerNotificaciones() {
    const respuesta = await fetch(`${API_BASE}/api/auth/notifications/${usuario.id}`);
    const data = await respuesta.json();

    if (!respuesta.ok || !data.success) {
        return [];
    }

    return data.notificaciones || [];
}

function agregarActividadPublicacion(actividades, publicacion) {
    const autor = publicacion.autor || {};

    if (Number(autor.id) !== Number(usuario.id)) {
        return;
    }

    actividades.push({
        clave: `publicacion-${publicacion.id}`,
        tipo: "publicacion",
        titulo: "Publicaste en tu muro",
        descripcion: recortarTexto(publicacion.contenido || "Publicación con foto"),
        fecha: publicacion.fecha || new Date().toISOString(),
        destino: `muro.html?post=${publicacion.id}`,
        nombrePersona: autor.nombre || usuario.nombre || "Usuario",
        foto: autor.fotoPerfil || usuario.fotoPerfil || "images/icono.png"
    });
}

function agregarActividadLikePropio(actividades, publicacion) {
    const autor = publicacion.autor || {};

    if (!publicacion.likedByMe) {
        return;
    }

    if (Number(autor.id) === Number(usuario.id)) {
        return;
    }

    actividades.push({
        clave: `like-propio-${publicacion.id}`,
        tipo: "like",
        titulo: `Te gusta una publicación de ${autor.nombre || "un usuario"}`,
        descripcion: recortarTexto(publicacion.contenido || "Publicación con foto"),
        fecha: publicacion.fecha || new Date().toISOString(),
        destino: `muro.html?post=${publicacion.id}`,
        nombrePersona: autor.nombre || "Usuario",
        foto: autor.fotoPerfil || "images/icono.png"
    });
}

async function agregarActividadesComentarios(actividades, publicaciones) {
    for (const publicacion of publicaciones) {
        const autorPublicacion = publicacion.autor || {};
        const comentarios = await obtenerComentarios(publicacion.id);

        comentarios.forEach((comentario) => {
            const autorComentario = comentario.autor || {};

            if (Number(autorComentario.id) === Number(usuario.id)) {
                actividades.push({
                    clave: `comentario-propio-${comentario.id || publicacion.id}-${comentario.fecha}`,
                    tipo: "comentario",
                    titulo: `Comentaste una publicación de ${autorPublicacion.nombre || "un usuario"}`,
                    descripcion: recortarTexto(comentario.contenido || "Comentario"),
                    fecha: comentario.fecha || publicacion.fecha || new Date().toISOString(),
                    destino: `muro.html?post=${publicacion.id}&comentarios=1`,
                    nombrePersona: autorComentario.nombre || usuario.nombre || "Usuario",
                    foto: autorComentario.fotoPerfil || usuario.fotoPerfil || "images/icono.png"
                });
            }

            if (
                Number(autorPublicacion.id) === Number(usuario.id) &&
                Number(autorComentario.id) !== Number(usuario.id)
            ) {
                actividades.push({
                    clave: `comentario-en-mi-post-${comentario.id || publicacion.id}-${comentario.fecha}`,
                    tipo: "comentario",
                    titulo: `${autorComentario.nombre || "Un usuario"} comentó tu publicación`,
                    descripcion: recortarTexto(comentario.contenido || "Comentario"),
                    fecha: comentario.fecha || publicacion.fecha || new Date().toISOString(),
                    destino: `muro.html?post=${publicacion.id}&comentarios=1`,
                    nombrePersona: autorComentario.nombre || "Usuario",
                    foto: autorComentario.fotoPerfil || "images/icono.png"
                });
            }
        });
    }
}

async function obtenerComentarios(publicacionId) {
    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts/${publicacionId}/comments`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            return [];
        }

        return data.comentarios || [];
    } catch (error) {
        return [];
    }
}

function agregarActividadNotificacion(actividades, notificacion) {
    if (!notificacion.tipo) {
        return;
    }

    let titulo = notificacion.mensaje || "Tienes una nueva actividad";
    let tipo = notificacion.tipo;

    if (notificacion.tipo === "like") {
        titulo = notificacion.mensaje || "Alguien dio me gusta a tu publicación";
    }

    if (notificacion.tipo === "comentario" || notificacion.tipo === "respuesta_comentario") {
        titulo = notificacion.mensaje || "Alguien comentó tu publicación";
    }

    actividades.push({
        clave: `notificacion-${notificacion.id || notificacion.tipo}-${notificacion.fecha}`,
        tipo,
        titulo,
        descripcion: "Actividad recibida en ISTLC Zone",
        fecha: notificacion.fecha || new Date().toISOString(),
        destino: notificacion.referenciaId
            ? `muro.html?post=${notificacion.referenciaId}&comentarios=1`
            : "muro.html",
        nombrePersona: "ISTLC Zone",
        foto: "images/icono.png"
    });
}

function tarjetaActividad(actividad) {
    return `
        <a href="${actividad.destino}" class="actividad-link">
            <div class="actividad-item">
                <div class="actividad-icono">
                    <span class="material-symbols-outlined">
                        ${obtenerIconoActividad(actividad.tipo)}
                    </span>
                </div>

                <img
                    src="${actividad.foto}"
                    class="actividad-foto"
                    alt="${escaparHtml(actividad.nombrePersona)}"
                >

                <div class="flex-grow-1">
                    <h6 class="mb-1">${escaparHtml(actividad.titulo)}</h6>
                    <p class="mb-1">${escaparHtml(actividad.descripcion)}</p>
                    <small class="text-muted">${formatearFecha(actividad.fecha)}</small>
                </div>
            </div>
        </a>
    `;
}

function obtenerIconoActividad(tipo) {
    if (tipo === "publicacion") {
        return "edit_square";
    }

    if (tipo === "comentario" || tipo === "respuesta_comentario") {
        return "forum";
    }

    if (tipo === "like") {
        return "thumb_up";
    }

    if (tipo === "seguimiento" || tipo === "solicitud_aceptada") {
        return "person_add";
    }

    return "history";
}

function eliminarDuplicados(actividades) {
    const mapa = new Map();

    actividades.forEach((actividad) => {
        if (!mapa.has(actividad.clave)) {
            mapa.set(actividad.clave, actividad);
        }
    });

    return Array.from(mapa.values());
}

function recortarTexto(texto) {
    const limpio = String(texto || "").trim();

    if (!limpio) {
        return "Sin contenido";
    }

    return limpio.length > 90 ? limpio.substring(0, 90) + "..." : limpio;
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "Fecha no disponible";
    }

    return new Date(fecha).toLocaleString("es-EC", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto || "";
    return div.innerHTML;
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}