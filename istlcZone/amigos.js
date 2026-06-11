const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
const parametros = new URLSearchParams(window.location.search);
const perfilConsultadoId = Number(parametros.get("id")) || Number(usuario?.id);

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    configurarLinksPerfil();
    document.getElementById("busqueda").addEventListener("input", buscarUsuarios);
    cargarMiRed();
    buscarUsuarios();
});

function configurarLinksPerfil() {
    const sufijoPerfil = perfilConsultadoId ? `?id=${perfilConsultadoId}` : "";
    const links = {
        linkTodo: `perfil.html${sufijoPerfil}`,
        linkInformacion: `informacion.html${sufijoPerfil}`,
        linkFotos: `fotos.html${sufijoPerfil}`,
        linkAmigos: `amigos.html${sufijoPerfil}`,
        linkCumpleanos: `cumpleaños.html${sufijoPerfil}`
    };

    Object.entries(links).forEach(([id, href]) => {
        const link = document.getElementById(id);
        if (link) {
            link.href = href;
        }
    });
}

async function cargarMiRed() {
    const contenedor = document.getElementById("listaMisAmigos");
    const titulo = document.getElementById("tituloRed");
    const descripcion = document.getElementById("descripcionRed");

    if (!contenedor) {
        return;
    }

    const esMiPerfil = Number(perfilConsultadoId) === Number(usuario.id);
    titulo.textContent = esMiPerfil ? "Mis amigos" : "Amigos de este perfil";
    descripcion.textContent = esMiPerfil
        ? "Personas que ya forman parte de tu red."
        : "Personas que este usuario sigue dentro de ISTLC Zone.";
    contenedor.innerHTML = `<div class="col-12 text-muted">Cargando amigos...</div>`;

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/following/${perfilConsultadoId}`);
        const data = await respuesta.json();
        const amigos = data.success ? data.usuarios : [];

        if (!amigos.length) {
            contenedor.innerHTML = `
                <div class="col-12">
                    <div class="estado-vacio-red">
                        ${esMiPerfil ? "Aun no sigues a nadie. Busca companeros abajo." : "Este perfil aun no sigue a nadie."}
                    </div>
                </div>
            `;
            return;
        }

        contenedor.innerHTML = amigos.map((persona) => tarjetaUsuario({
            ...persona,
            siguiendo: true,
            solicitudPendiente: false
        })).join("");
    } catch (error) {
        contenedor.innerHTML = `<div class="col-12"><div class="estado-vacio-red">No se pudo cargar la red.</div></div>`;
    }
}

async function buscarUsuarios() {
    const termino = document.getElementById("busqueda").value.trim();
    const contenedor = document.getElementById("resultadosUsuarios");
    contenedor.innerHTML = `<div class="col-12 text-muted">Buscando...</div>`;

    try {
        const respuesta = await fetch(
            `${API_BASE}/api/auth/users?q=${encodeURIComponent(termino)}&currentUserId=${usuario.id}`
        );
        const data = await respuesta.json();
        const usuarios = data.success
            ? data.usuarios.filter((persona) => !persona.siguiendo)
            : [];

        if (!usuarios.length) {
            contenedor.innerHTML = `<div class="col-12"><div class="card p-4">No se encontraron usuarios.</div></div>`;
            return;
        }

        contenedor.innerHTML = usuarios.map(tarjetaUsuario).join("");
    } catch (error) {
        contenedor.innerHTML = `<div class="col-12"><div class="card p-4">No se pudo conectar con la API.</div></div>`;
    }
}

function tarjetaUsuario(persona) {
    const detalle = [persona.carrera, persona.semestre].filter(Boolean).join(" - ") || "Miembro de ISTLC Zone";
    const botonTexto = persona.siguiendo
        ? "Siguiendo"
        : persona.solicitudPendiente
            ? "Solicitud pendiente"
            : "Solicitar seguimiento";
    const botonClase = persona.siguiendo || persona.solicitudPendiente ? "btn-light" : "btn-warning";
    const deshabilitado = persona.solicitudPendiente ? "disabled" : "";

    return `
        <div class="col-md-6 col-lg-4">
            <div class="card usuario-card shadow-sm p-3 h-100">
                <a class="usuario-card-link" href="perfil.html?id=${persona.id}">
                    <img src="${persona.fotoPerfil || "images/icono.png"}" alt="${persona.nombre}">
                    <h5>${persona.nombre}</h5>
                    <p class="text-muted mb-1">@${persona.usuario}</p>
                </a>
                <p>${detalle}</p>
                <a class="btn btn-outline-primary fw-bold mb-2" href="perfil.html?id=${persona.id}">
                    Ver perfil
                </a>
                <button
                    class="btn ${botonClase} fw-bold"
                    onclick="alternarSeguimiento(${persona.id}, ${persona.siguiendo})"
                    ${deshabilitado}
                >
                    ${botonTexto}
                </button>
            </div>
        </div>
    `;
}

async function alternarSeguimiento(seguidoId, estaSiguiendo) {
    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/follow`, {
            method: estaSiguiendo ? "DELETE" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                seguidorId: usuario.id,
                seguidoId
            })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo actualizar el seguimiento");
        }

        mostrarToastAppSeguro(data.message || "Seguimiento actualizado");
        cargarMiRed();
        buscarUsuarios();
    } catch (error) {
        mostrarToastAppSeguro(error.message || "No se pudo actualizar el seguimiento", "error");
    }
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}

function mostrarToastAppSeguro(mensaje, tipo) {
    if (typeof mostrarToastApp === "function") {
        mostrarToastApp(mensaje, tipo);
    } else {
        alert(mensaje);
    }
}
