const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

let usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
let contactoActual = null;
let actualizandoMensajes = false;
let firmaMensajesActual = "";
let timerMensajes = null;

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("buscarMensajes").addEventListener("input", buscarContactos);
    document.getElementById("formMensaje").addEventListener("submit", enviarMensaje);
    await cargarConversaciones();

    const contactoUrl = new URLSearchParams(window.location.search).get("contacto");
    if (contactoUrl) {
        await abrirChat(contactoUrl);
    }

    iniciarActualizacionAutomatica();
});

async function cargarConversaciones() {
    const contenedor = document.getElementById("listaContactos");
    contenedor.innerHTML = `<p class="text-muted mb-0">Cargando amigos...</p>`;

    await actualizarListaContactos({ silencioso: false });
}

async function actualizarListaContactos({ silencioso = true } = {}) {
    const contenedor = document.getElementById("listaContactos");
    const buscando = document.getElementById("buscarMensajes")?.value.trim();

    if (buscando) {
        return;
    }

    try {
        const [conversacionesRespuesta, amigosRespuesta] = await Promise.all([
            fetch(`${API_BASE}/api/auth/messages/conversations/${usuario.id}`),
            fetch(`${API_BASE}/api/auth/following/${usuario.id}?currentUserId=${usuario.id}`)
        ]);

        const conversacionesData = await conversacionesRespuesta.json();
        const amigosData = await amigosRespuesta.json();
        const conversaciones = conversacionesData.success ? conversacionesData.conversaciones : [];
        const amigos = amigosData.success ? amigosData.usuarios : [];
        const contactos = unirConversacionesYAmigos(conversaciones, amigos);

        if (!contactos.length) {
            contenedor.innerHTML = `<p class="text-muted mb-0">Aun no tienes amigos para enviar mensajes.</p>`;
            return;
        }

        contenedor.innerHTML = contactos.map(tarjetaContacto).join("");
    } catch (error) {
        if (!silencioso) {
            contenedor.innerHTML = `<p class="text-muted mb-0">No se pudieron cargar los mensajes.</p>`;
        }
    }
}

function unirConversacionesYAmigos(conversaciones, amigos) {
    const contactos = new Map();

    conversaciones.forEach((contacto) => {
        contactos.set(Number(contacto.id), {
            ...contacto,
            origen: "conversacion"
        });
    });

    amigos.forEach((amigo) => {
        const id = Number(amigo.id);

        if (!contactos.has(id)) {
            contactos.set(id, {
                ...amigo,
                origen: "amigo"
            });
        }
    });

    return Array.from(contactos.values()).sort((a, b) => {
        const noLeidosA = Number(a.mensajesNoLeidos || 0);
        const noLeidosB = Number(b.mensajesNoLeidos || 0);

        if (noLeidosA !== noLeidosB) {
            return noLeidosB - noLeidosA;
        }

        if (a.ultimaFecha && b.ultimaFecha) {
            return new Date(b.ultimaFecha) - new Date(a.ultimaFecha);
        }

        if (a.ultimaFecha) return -1;
        if (b.ultimaFecha) return 1;

        return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    });
}

async function buscarContactos(evento) {
    const termino = evento.target.value.trim();

    if (!termino) {
        await cargarConversaciones();
        return;
    }

    const contenedor = document.getElementById("listaContactos");
    contenedor.innerHTML = `<p class="text-muted mb-0">Buscando...</p>`;

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/users?q=${encodeURIComponent(termino)}&currentUserId=${usuario.id}`);
        const data = await respuesta.json();
        const contactos = data.success ? data.usuarios.filter((persona) => Number(persona.id) !== Number(usuario.id)) : [];

        if (!contactos.length) {
            contenedor.innerHTML = `<p class="text-muted mb-0">No se encontraron usuarios.</p>`;
            return;
        }

        contenedor.innerHTML = contactos.map(tarjetaContacto).join("");
    } catch (error) {
        contenedor.innerHTML = `<p class="text-muted mb-0">No se pudo buscar usuarios.</p>`;
    }
}

function tarjetaContacto(contacto) {
    const ultimo = contacto.ultimoMensaje
        ? `<small>${escaparHtml(contacto.ultimoMensaje)}</small>`
        : contacto.origen === "amigo"
            ? `<small>Amigo - @${escaparHtml(contacto.usuario)}</small>`
            : `<small>@${escaparHtml(contacto.usuario)}</small>`;
    const activo = contactoActual && Number(contactoActual.id) === Number(contacto.id) ? "activo" : "";
    const noLeidos = Number(contacto.mensajesNoLeidos || 0);
    const badge = noLeidos > 0
        ? `<b class="mensajes-no-leidos">${noLeidos > 9 ? "9+" : noLeidos}</b>`
        : "";
    const fecha = contacto.ultimaFecha
        ? `<em>${new Date(contacto.ultimaFecha).toLocaleDateString("es-EC", { day: "2-digit", month: "short" })}</em>`
        : "";

    return `
        <button class="mensaje-contacto ${activo}" onclick="abrirChat(${contacto.id})">
            <img src="${contacto.fotoPerfil || "images/icono.png"}" alt="${escaparHtml(contacto.nombre)}">
            <span>
                <strong>${escaparHtml(contacto.nombre)}</strong>
                ${ultimo}
            </span>
            <span class="mensajes-contacto-meta">
                ${fecha}
                ${badge}
            </span>
        </button>
    `;
}

async function abrirChat(contactoId) {
    try {
        const data = await obtenerChat(contactoId);

        contactoActual = data.contacto || contactoActual;
        pintarEncabezado(data.contacto);
        pintarMensajes(data.mensajes);
        document.getElementById("formMensaje").classList.remove("d-none");
        await marcarMensajesComoLeidos(contactoId);
        await actualizarListaContactos();
    } catch (error) {
        alert(error.message);
    }
}

async function obtenerChat(contactoId) {
    const respuesta = await fetch(`${API_BASE}/api/auth/messages/${usuario.id}/${contactoId}`);
    const data = await respuesta.json();

    if (!respuesta.ok || !data.success) {
        throw new Error(data.message || "No se pudo abrir la conversacion");
    }

    return data;
}

async function marcarMensajesComoLeidos(contactoId) {
    try {
        await fetch(`${API_BASE}/api/auth/notifications/read-target`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: usuario.id,
                tipo: "mensaje",
                referenciaId: contactoId
            })
        });

        if (typeof cargarNotificacionesApp === "function") {
            await cargarNotificacionesApp();
        }
    } catch (error) {
        console.warn("No se pudo actualizar la campanita:", error);
    }
}

function pintarEncabezado(contacto) {
    document.getElementById("chatEncabezado").innerHTML = `
        <div class="mensajes-chat-contacto">
            <img src="${contacto.fotoPerfil || "images/icono.png"}" alt="${escaparHtml(contacto.nombre)}">
            <div>
                <h3>${escaparHtml(contacto.nombre)}</h3>
                <p>@${escaparHtml(contacto.usuario)}</p>
            </div>
        </div>
    `;
}

function pintarMensajes(mensajes) {
    const contenedor = document.getElementById("chatMensajes");
    firmaMensajesActual = crearFirmaMensajes(mensajes);

    if (!mensajes.length) {
        contenedor.innerHTML = `
            <div class="mensajes-vacio">
                <span class="material-symbols-outlined">waving_hand</span>
                <p>Aun no hay mensajes. Escribe el primero.</p>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = mensajes.map((mensaje) => `
        <div class="mensaje-burbuja ${mensaje.mio ? "mio" : "otro"}">
            <p>${escaparHtml(mensaje.contenido)}</p>
            <small>${mensaje.fecha ? new Date(mensaje.fecha).toLocaleString("es-EC") : "Ahora"}</small>
        </div>
    `).join("");
    contenedor.scrollTop = contenedor.scrollHeight;
}

function crearFirmaMensajes(mensajes) {
    return (mensajes || [])
        .map((mensaje) => `${mensaje.id}:${mensaje.fecha}`)
        .join("|");
}

async function refrescarChatAbierto() {
    if (!contactoActual || actualizandoMensajes) {
        return;
    }

    actualizandoMensajes = true;

    try {
        const data = await obtenerChat(contactoActual.id);
        const nuevaFirma = crearFirmaMensajes(data.mensajes);

        if (nuevaFirma !== firmaMensajesActual) {
            contactoActual = data.contacto || contactoActual;
            pintarEncabezado(contactoActual);
            pintarMensajes(data.mensajes);
        }

        await marcarMensajesComoLeidos(contactoActual.id);
    } catch (error) {
        console.warn("No se pudo actualizar el chat:", error);
    } finally {
        actualizandoMensajes = false;
    }
}

function iniciarActualizacionAutomatica() {
    clearInterval(timerMensajes);

    timerMensajes = setInterval(async () => {
        if (document.hidden) {
            return;
        }

        await refrescarChatAbierto();
        await actualizarListaContactos();

        if (typeof cargarNotificacionesApp === "function") {
            await cargarNotificacionesApp();
        }
    }, 5000);
}

async function enviarMensaje(evento) {
    evento.preventDefault();

    if (!contactoActual) {
        return;
    }

    const input = document.getElementById("textoMensaje");
    const contenido = input.value.trim();

    if (!contenido) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                emisorId: usuario.id,
                receptorId: contactoActual.id,
                contenido
            })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo enviar el mensaje");
        }

        input.value = "";
        await abrirChat(contactoActual.id);
    } catch (error) {
        alert(error.message);
    }
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
