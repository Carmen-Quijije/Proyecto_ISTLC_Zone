const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
const parametros = new URLSearchParams(window.location.search);
const perfilConsultadoId = Number(parametros.get("id")) || Number(usuario?.id);
let estadoSeguimientoPerfil = {
    siguiendo: false,
    solicitudPendiente: false
};
let nombrePerfilConsultado = "";

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    configurarLinksPerfil();
    await cargarPerfilConsultado();
    cargarHistorialActividad();
});

function configurarLinksPerfil() {
    const sufijoPerfil = perfilConsultadoId ? `?id=${perfilConsultadoId}` : "";
    const links = {
        linkVolverPerfil: `perfil.html${sufijoPerfil}`,
        linkTodo: `perfil.html${sufijoPerfil}`,
        linkInformacion: `informacion.html${sufijoPerfil}`,
        linkFotos: `fotos.html${sufijoPerfil}`,
        linkAmigos: `amigos.html${sufijoPerfil}`,
        linkCumpleanos: `cumpleaños.html${sufijoPerfil}`,
        linkActividad: `actividad.html${sufijoPerfil}`
    };

    Object.entries(links).forEach(([id, href]) => {
        const link = document.getElementById(id);
        if (link) {
            link.href = href;
        }
    });
}

async function cargarPerfilConsultado() {
    if (!perfilConsultadoId) {
        document.getElementById("perfilHeader")?.classList.remove("perfil-cargando");
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/profile/${perfilConsultadoId}?currentUserId=${usuario.id}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            document.getElementById("perfilHeader")?.classList.remove("perfil-cargando");
            return;
        }

        const perfil = data.usuario;
        nombrePerfilConsultado = perfil?.nombre || perfil?.usuario || "Usuario";
        estadoSeguimientoPerfil = {
            siguiendo: !!data.siguiendo,
            solicitudPendiente: !!data.solicitudPendiente
        };

        ponerTexto("nombrePerfil", nombrePerfilConsultado);
        ponerTexto("contadorSeguidores", `${data.seguidores || 0} seguidores - ${data.seguidos || 0} seguidos`);
        ponerTexto("bioPerfil", perfil?.bio || "Bienvenido a mi perfil de ISTLC Zone.");
        ponerTexto("detalleViveEn", texto(perfil?.viveEn));
        ponerTexto("detalleCarrera", texto(perfil?.carrera));
        ponerTexto("detalleSemestre", texto(perfil?.semestre));

        const fotoPerfil = document.getElementById("fotoPerfil");
        if (fotoPerfil) {
            fotoPerfil.src = perfil?.fotoPerfil || "images/icono.png";
            fotoPerfil.alt = `Foto de ${nombrePerfilConsultado}`;
        }

        const esMiPerfil = Number(perfilConsultadoId) === Number(usuario.id);
        ponerTexto(
            "descripcionActividad",
            esMiPerfil
                ? "Revisa tus publicaciones, comentarios, me gusta, conexiones y actividad reciente."
                : `Actividad publica y reciente de ${nombrePerfilConsultado}.`
        );
        renderAccionesPerfil();
    } catch (error) {
        console.error("No se pudo cargar el perfil:", error);
    } finally {
        document.getElementById("perfilHeader")?.classList.remove("perfil-cargando");
    }
}

function renderAccionesPerfil() {
    const contenedor = document.querySelector(".perfil-acciones");
    if (!contenedor) {
        return;
    }

    const esMiPerfil = Number(perfilConsultadoId) === Number(usuario.id);
    if (esMiPerfil) {
        contenedor.innerHTML = `<a href="editarPerfil.html" class="btn btn-warning">Editar perfil</a>`;
        return;
    }

    let textoBoton = "Enviar solicitud";
    let claseBoton = "btn-warning";
    let deshabilitado = "";

    if (estadoSeguimientoPerfil.siguiendo) {
        textoBoton = "Siguiendo";
        claseBoton = "btn-light";
        deshabilitado = "disabled";
    } else if (estadoSeguimientoPerfil.solicitudPendiente) {
        textoBoton = "Solicitud enviada";
        claseBoton = "btn-light";
        deshabilitado = "disabled";
    }

    contenedor.innerHTML = `
        <button
            id="btnSolicitudPerfil"
            class="btn ${claseBoton} fw-bold"
            type="button"
            onclick="enviarSolicitudPerfil()"
            ${deshabilitado}
        >
            ${textoBoton}
        </button>
        <a href="mensajes.html?contacto=${perfilConsultadoId}" class="btn btn-light fw-bold">
            Mensaje
        </a>
    `;
}

async function enviarSolicitudPerfil() {
    if (estadoSeguimientoPerfil.siguiendo || estadoSeguimientoPerfil.solicitudPendiente) {
        return;
    }

    const boton = document.getElementById("btnSolicitudPerfil");
    if (boton) {
        boton.disabled = true;
        boton.textContent = "Enviando...";
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/follow`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                seguidorId: usuario.id,
                seguidoId: perfilConsultadoId
            })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo enviar la solicitud");
        }

        estadoSeguimientoPerfil.solicitudPendiente = true;
        renderAccionesPerfil();
        mostrarToastAppSeguro(data.message || "Solicitud enviada");

        if (typeof cargarNotificacionesApp === "function") {
            await cargarNotificacionesApp();
        }
    } catch (error) {
        mostrarToastAppSeguro(error.message || "No se pudo enviar la solicitud", "error");
        renderAccionesPerfil();
    }
}

async function cargarHistorialActividad() {
    const contenedor = document.getElementById("listaActividad");
    contenedor.innerHTML = `<p class="text-muted">Cargando historial...</p>`;

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/activity/${perfilConsultadoId}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo cargar el historial");
        }

        const actividades = data.actividades || [];

        if (!actividades.length) {
            contenedor.innerHTML = `
                <p class="text-muted mb-0">
                    Este perfil aun no tiene actividades registradas.
                </p>
            `;
            return;
        }

        contenedor.innerHTML = actividades.map(tarjetaActividad).join("");
    } catch (error) {
        console.error("Error cargando actividad:", error);
        contenedor.innerHTML = `
            <p class="text-danger">
                No se pudo cargar el historial de actividades.
            </p>
        `;
    }
}

function tarjetaActividad(actividad) {
    return `
        <a href="${actividad.destino || "#"}" class="actividad-link">
            <div class="actividad-item">
                <div class="actividad-icono">
                    <span class="material-symbols-outlined">
                        ${obtenerIconoActividad(actividad.tipo)}
                    </span>
                </div>

                <img
                    src="${actividad.foto || "images/icono.png"}"
                    class="actividad-foto"
                    alt="${escaparHtml(actividad.nombrePersona || "Usuario")}"
                >

                <div class="flex-grow-1">
                    <h6 class="mb-1">${escaparHtml(actividad.titulo)}</h6>
                    <p class="mb-1">${escaparHtml(recortarTexto(actividad.descripcion))}</p>
                    <small class="text-muted">${formatearFecha(actividad.fecha)}</small>
                </div>
            </div>
        </a>
    `;
}

function obtenerIconoActividad(tipo) {
    if (tipo === "registro") {
        return "how_to_reg";
    }

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

function texto(valor) {
    return valor && String(valor).trim() ? valor : "No registrado";
}

function ponerTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = valor;
    }
}

function recortarTexto(texto) {
    const limpio = String(texto || "").trim();

    if (!limpio) {
        return "Sin contenido";
    }

    return limpio.length > 120 ? `${limpio.substring(0, 120)}...` : limpio;
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

function mostrarToastAppSeguro(mensaje, tipo) {
    if (typeof mostrarToastApp === "function") {
        mostrarToastApp(mensaje, tipo);
    } else {
        alert(mensaje);
    }
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}
