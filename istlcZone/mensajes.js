const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

let usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
let contactoActual = null;

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
});

async function cargarConversaciones() {
    const contenedor = document.getElementById("listaContactos");
    contenedor.innerHTML = `<p class="text-muted mb-0">Cargando conversaciones...</p>`;

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/messages/conversations/${usuario.id}`);
        const data = await respuesta.json();
        const conversaciones = data.success ? data.conversaciones : [];

        if (!conversaciones.length) {
            contenedor.innerHTML = `<p class="text-muted mb-0">Busca un companero para iniciar un chat.</p>`;
            return;
        }

        contenedor.innerHTML = conversaciones.map(tarjetaContacto).join("");
    } catch (error) {
        contenedor.innerHTML = `<p class="text-muted mb-0">No se pudieron cargar los mensajes.</p>`;
    }
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
        : `<small>@${escaparHtml(contacto.usuario)}</small>`;
    const activo = contactoActual && Number(contactoActual.id) === Number(contacto.id) ? "activo" : "";

    return `
        <button class="mensaje-contacto ${activo}" onclick="abrirChat(${contacto.id})">
            <img src="${contacto.fotoPerfil || "images/icono.png"}" alt="${escaparHtml(contacto.nombre)}">
            <span>
                <strong>${escaparHtml(contacto.nombre)}</strong>
                ${ultimo}
            </span>
        </button>
    `;
}

async function abrirChat(contactoId) {
    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/messages/${usuario.id}/${contactoId}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo abrir la conversacion");
        }

        contactoActual = data.contacto;
        pintarEncabezado(data.contacto);
        pintarMensajes(data.mensajes);
        document.getElementById("formMensaje").classList.remove("d-none");
        await cargarConversaciones();
    } catch (error) {
        alert(error.message);
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
