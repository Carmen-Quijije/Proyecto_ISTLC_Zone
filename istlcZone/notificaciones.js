const usuarioNotificaciones = JSON.parse(localStorage.getItem("usuarioLogueado"));

document.addEventListener("DOMContentLoaded", () => {
    aplicarTemaGuardado();

    if (!usuarioNotificaciones) {
        return;
    }

    crearCentroNotificaciones();
    prepararAjustesVisuales();
    prepararLogoPrincipal();
    prepararLinksResumenNotificaciones();
    cargarNotificacionesApp();
    setInterval(cargarNotificacionesApp, 30000);
});

function prepararAjustesVisuales() {
    if (document.getElementById("ajustesVisualesNotificaciones")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "ajustesVisualesNotificaciones";
    style.textContent = `
        .navbar-brand::after{content:none!important}
        .texto-logo{font-size:clamp(28px,3vw,40px)!important}
        .texto-logo strong{display:none!important}
        .logo-istlc,.logo-istlc:hover,.logo-istlc:focus{position:relative;cursor:pointer!important}
        .logo-istlc:hover .logo-navbar{transform:scale(1.05);filter:drop-shadow(0 0 4px rgba(255,255,255,.95)) drop-shadow(0 0 12px rgba(255,193,7,.85))!important}
        .logo-navbar{transition:transform .2s ease,filter .2s ease}
        .logo-istlc:hover .texto-logo{text-shadow:0 0 10px rgba(255,193,7,.45)}
        .logo-istlc::before{
            content:attr(data-tooltip);
            position:absolute;
            left:50%;
            top:calc(100% + 8px);
            transform:translateX(-50%) translateY(-4px);
            background-color:#061A38;
            color:white;
            border:1px solid #FFC107;
            border-radius:6px;
            padding:6px 10px;
            font-size:13px;
            font-weight:700;
            white-space:nowrap;
            opacity:0;
            pointer-events:none;
            transition:opacity .2s ease,transform .2s ease;
            z-index:2200;
        }
        .logo-istlc:hover::before{opacity:1;transform:translateX(-50%) translateY(0)}
        .sugerido-linea{color:inherit;text-decoration:none;border-radius:8px;transition:background-color .2s ease,padding-left .2s ease}
        .sugerido-linea:hover{color:inherit;background-color:#fff8df;padding-left:8px;cursor:pointer}
        .notificacion-item{color:#212529;text-decoration:none;cursor:pointer;transition:border-color .2s ease,background-color .2s ease,transform .2s ease}
        .notificacion-item:hover{color:#212529;border-color:#FFC107;background-color:#fff8df;transform:translateY(-1px)}
        .notificacion-resumen-link{border-radius:8px;padding:6px 4px;transition:background-color .2s ease,padding-left .2s ease}
        .notificacion-resumen-link:hover{color:#061A38;background-color:#fff8df;padding-left:10px;cursor:pointer}
    `;
    document.head.appendChild(style);
}

function prepararLogoPrincipal() {
    document.querySelectorAll(".logo-istlc").forEach((logo) => {
        logo.href = "muro.html";
        logo.title = "Ir a la pagina principal";
        logo.dataset.tooltip = "Ir a la pagina principal";
    });
}

function prepararLinksResumenNotificaciones() {
    document.querySelectorAll(".icono-muro").forEach((icono) => {
        const fila = icono.closest("p");
        if (!fila || fila.dataset.linkPreparado) {
            return;
        }

        fila.dataset.linkPreparado = "true";
        fila.classList.add("notificacion-resumen-link");
        fila.setAttribute("role", "link");
        fila.tabIndex = 0;

        const destino = icono.textContent.trim() === "chat_bubble"
            ? "mensajes.html"
            : "muro.html#listaPublicaciones";

        const abrir = () => {
            window.location.href = destino;
        };

        fila.addEventListener("click", abrir);
        fila.addEventListener("keydown", (evento) => {
            if (evento.key === "Enter" || evento.key === " ") {
                evento.preventDefault();
                abrir();
            }
        });
    });
}

function crearCentroNotificaciones() {
    const contenedorNav = document.querySelector(".navbar .ms-auto");
    if (!contenedorNav || document.getElementById("btnNotificacionesApp")) {
        return;
    }

    const centro = document.createElement("div");
    centro.className = "notificaciones-app";
    centro.innerHTML = `
        <button id="btnTemaApp" class="btn btn-light btn-tema-app" type="button" title="Cambiar tema">
            <span class="material-symbols-outlined">palette</span>
        </button>
        <section id="panelTemaApp" class="panel-tema-app d-none">
            <strong>Tema de apariencia</strong>
            <button type="button" class="tema-opcion" data-tema="tradicional">
                <span class="material-symbols-outlined tema-icono">light_mode</span>Tradicional
            </button>
            <button type="button" class="tema-opcion" data-tema="neon">
                <span class="material-symbols-outlined tema-icono">dark_mode</span>Negro neon
            </button>
            <button type="button" class="tema-opcion" data-tema="oceano">
                <span class="material-symbols-outlined tema-icono">water_drop</span>Azul oceano
            </button>
        </section>
        <button id="btnNotificacionesApp" class="btn btn-warning btn-notificaciones-app" type="button">
            <span class="material-symbols-outlined">notifications</span>
            <span id="contadorNotificacionesApp" class="contador-notificaciones d-none">0</span>
        </button>
        <section id="panelNotificacionesApp" class="panel-notificaciones-app d-none">
            <div class="panel-notificaciones-header">
                <strong>Notificaciones</strong>
                <button class="btn btn-sm btn-light" type="button" onclick="marcarNotificacionesLeidas()">Marcar leidas</button>
            </div>
            <div id="listaNotificacionesApp" class="panel-notificaciones-lista">
                <p class="text-muted mb-0">Cargando...</p>
            </div>
        </section>
    `;

    contenedorNav.prepend(centro);
    document.getElementById("btnNotificacionesApp").addEventListener("click", alternarPanelNotificaciones);
    document.getElementById("btnTemaApp").addEventListener("click", alternarPanelTema);
    centro.querySelectorAll(".tema-opcion").forEach((boton) => {
        boton.addEventListener("click", () => seleccionarTema(boton.dataset.tema));
    });
    document.addEventListener("click", (evento) => {
        if (!centro.contains(evento.target)) {
            document.getElementById("panelNotificacionesApp")?.classList.add("d-none");
            document.getElementById("panelTemaApp")?.classList.add("d-none");
        }
    });
}

function aplicarTemaGuardado() {
    const temaAnterior = localStorage.getItem("temaIstlcColor");
    const tema = localStorage.getItem("temaIstlcModo")
        || (temaAnterior && temaAnterior !== "tradicional" ? "neon" : "tradicional");

    localStorage.setItem("temaIstlcModo", tema);
    localStorage.removeItem("temaIstlcColor");
    document.documentElement.dataset.temaIstlc = tema;
    document.body.dataset.temaIstlc = tema;
}

function alternarPanelTema(evento) {
    evento.stopPropagation();
    document.getElementById("panelTemaApp")?.classList.toggle("d-none");
    document.getElementById("panelNotificacionesApp")?.classList.add("d-none");
}

function seleccionarTema(tema) {
    localStorage.setItem("temaIstlcModo", tema);
    aplicarTemaGuardado();
    document.getElementById("panelTemaApp")?.classList.add("d-none");
    mostrarToastApp("Tema actualizado");
}

async function leerRespuestaJson(respuesta, mensajeFallback) {
    const texto = await respuesta.text();
    let data = {};

    if (texto) {
        try {
            data = JSON.parse(texto);
        } catch (error) {
            throw new Error(mensajeFallback || "La API devolvio una respuesta no valida");
        }
    }

    if (!respuesta.ok || data.success === false) {
        throw new Error(data.message || mensajeFallback || "No se pudo completar la accion");
    }

    return data;
}

async function cargarNotificacionesApp() {
    const lista = document.getElementById("listaNotificacionesApp");
    const contador = document.getElementById("contadorNotificacionesApp");

    if (!lista || !contador || !usuarioNotificaciones?.id) {
        return;
    }

    try {
        const [notificacionesRespuesta, solicitudesRespuesta] = await Promise.all([
            fetch(`${API_BASE}/api/auth/notifications/${usuarioNotificaciones.id}`),
            fetch(`${API_BASE}/api/auth/follow-requests/${usuarioNotificaciones.id}`)
        ]);
        const notificacionesData = await leerRespuestaJson(notificacionesRespuesta, "No se pudieron cargar las notificaciones");
        const solicitudesData = await leerRespuestaJson(solicitudesRespuesta, "No se pudieron cargar las solicitudes");
        const solicitudes = solicitudesData.success ? (solicitudesData.solicitudes || []) : [];
        const notificaciones = notificacionesData.success
            ? (notificacionesData.notificaciones || []).filter((notificacion) => {
                const tipo = String(notificacion.tipo || "").toLowerCase();
                const mensaje = String(notificacion.mensaje || "").toLowerCase();
                return !tipo.includes("solicitud") && !mensaje.includes("quiere seguirte");
            })
            : [];
        const sinLeer = notificaciones.filter((notificacion) => !notificacion.leida).length + solicitudes.length;

        contador.textContent = sinLeer > 9 ? "9+" : sinLeer;
        contador.classList.toggle("d-none", sinLeer === 0);

        const bloques = [
            ...solicitudes.map(renderSolicitudNotificacion),
            ...notificaciones.map(renderNotificacion)
        ];

        lista.innerHTML = bloques.length
            ? bloques.join("")
            : `<p class="text-muted mb-0">No tienes notificaciones nuevas.</p>`;
    } catch (error) {
        lista.innerHTML = `<p class="text-muted mb-0">No se pudieron cargar las notificaciones.</p>`;
    }
}

function renderSolicitudNotificacion(solicitud) {
    const persona = typeof solicitud.usuario === "object" && solicitud.usuario
        ? solicitud.usuario
        : {
            id: solicitud.usuario_id,
            nombre: solicitud.nombre,
            usuario: solicitud.usuario,
            fotoPerfil: solicitud.fotoPerfil || solicitud.foto_perfil
        };
    const nombre = escaparTextoNotificacion(persona.nombre || persona.usuario || "Usuario");
    const fotoPerfil = persona.fotoPerfil || persona.foto_perfil || "images/icono.png";

    return `
        <article class="notificacion-item solicitud" data-solicitud-id="${solicitud.id}">
            <img src="${fotoPerfil}" alt="${nombre}">
            <div>
                <strong>${nombre}</strong>
                <p>Quiere seguirte.</p>
                <div class="notificacion-acciones">
                    <button class="btn btn-sm btn-warning" onclick="responderSolicitudSeguimiento(event, ${solicitud.id}, 'accept')">
                        Aceptar
                    </button>
                    <button class="btn btn-sm btn-light" onclick="responderSolicitudSeguimiento(event, ${solicitud.id}, 'reject')">
                        Rechazar
                    </button>
                </div>
            </div>
        </article>
    `;
}

function renderNotificacion(notificacion) {
    const clase = notificacion.leida ? "" : "nueva";
    const fecha = notificacion.fecha ? new Date(notificacion.fecha).toLocaleString("es-EC") : "";
    const destino = obtenerDestinoNotificacion(notificacion);
    const contenido = `
        <span class="material-symbols-outlined notificacion-icono">${obtenerIconoNotificacion(notificacion.tipo)}</span>
        <div>
            <p>${escaparTextoNotificacion(notificacion.mensaje)}</p>
            <small>${fecha}</small>
        </div>
    `;

    return `
        <a class="notificacion-item ${clase}" href="${destino}" title="Abrir notificacion">
            ${contenido}
        </a>
    `;
}

function obtenerDestinoNotificacion(notificacion) {
    const referenciaId = notificacion.referenciaId || notificacion.referencia_id;

    if (notificacion.tipo === "mensaje" && referenciaId) {
        return `mensajes.html?contacto=${referenciaId}`;
    }

    if ((notificacion.tipo === "solicitud_aceptada" || notificacion.tipo === "seguimiento") && referenciaId) {
        return `perfil.html?id=${referenciaId}`;
    }

    if ((notificacion.tipo === "comentario" || notificacion.tipo === "respuesta_comentario" || notificacion.tipo === "like") && referenciaId) {
        return `muro.html#post-${referenciaId}`;
    }

    return "muro.html";
}

function obtenerIconoNotificacion(tipo) {
    if (tipo === "mensaje") {
        return "chat_bubble";
    }

    if (tipo === "comentario" || tipo === "respuesta_comentario") {
        return "forum";
    }

    if (tipo === "like") {
        return "thumb_up";
    }

    return "notifications";
}

async function responderSolicitudSeguimiento(evento, solicitudId, accion) {
    if (typeof evento === "number") {
        accion = solicitudId;
        solicitudId = evento;
        evento = null;
    }

    if (evento?.stopPropagation) {
        evento.stopPropagation();
        evento.preventDefault();
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/follow-requests/${solicitudId}/${accion}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuarioNotificaciones.id })
        });
        await leerRespuestaJson(respuesta, "No se pudo responder la solicitud");

        mostrarToastApp(accion === "accept" ? "Solicitud aceptada" : "Solicitud rechazada");
        await cargarNotificacionesApp();

        if (typeof cargarPerfil === "function") {
            await cargarPerfil();
        }
    } catch (error) {
        mostrarToastApp(error.message, "error");
    }
}

async function marcarNotificacionesLeidas() {
    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/notifications/read`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuarioNotificaciones.id })
        });
        await leerRespuestaJson(respuesta, "No se pudieron marcar las notificaciones");
        await cargarNotificacionesApp();
        mostrarToastApp("Notificaciones marcadas como leidas");
    } catch (error) {
        mostrarToastApp(error.message, "error");
    }
}

function alternarPanelNotificaciones() {
    document.getElementById("panelTemaApp")?.classList.add("d-none");
    document.getElementById("panelNotificacionesApp")?.classList.toggle("d-none");
}
function mostrarToastApp(mensaje, tipo = "ok") {
    let toast = document.getElementById("toastApp");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toastApp";
        toast.className = "toast-app";
        document.body.appendChild(toast);
    }

    toast.textContent = mensaje;
    toast.className = `toast-app mostrar ${tipo === "error" ? "error" : ""}`;
    clearTimeout(window.toastAppTimer);
    window.toastAppTimer = setTimeout(() => toast.classList.remove("mostrar"), 2800);
}

function confirmarApp(mensaje) {
    return new Promise((resolve) => {
        let modal = document.getElementById("confirmacionApp");
        if (!modal) {
            modal = document.createElement("section");
            modal.id = "confirmacionApp";
            modal.className = "confirmacion-app d-none";
            modal.innerHTML = `
                <div class="confirmacion-overlay"></div>
                <div class="confirmacion-card">
                    <span class="material-symbols-outlined">notifications</span>
                    <p id="confirmacionAppMensaje"></p>
                    <div>
                        <button id="confirmacionCancelar" class="btn btn-light" type="button">Cancelar</button>
                        <button id="confirmacionAceptar" class="btn btn-warning" type="button">Aceptar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.querySelector("#confirmacionAppMensaje").textContent = mensaje;
        modal.classList.remove("d-none");

        const cerrar = (valor) => {
            modal.classList.add("d-none");
            resolve(valor);
        };

        modal.querySelector("#confirmacionAceptar").onclick = () => cerrar(true);
        modal.querySelector("#confirmacionCancelar").onclick = () => cerrar(false);
        modal.querySelector(".confirmacion-overlay").onclick = () => cerrar(false);
    });
}

function escaparTextoNotificacion(texto) {
    const div = document.createElement("div");
    div.textContent = texto || "";
    return div.innerHTML;
}
