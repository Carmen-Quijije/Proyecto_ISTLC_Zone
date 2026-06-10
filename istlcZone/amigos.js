const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("busqueda").addEventListener("input", buscarUsuarios);
    buscarUsuarios();
});

async function buscarUsuarios() {
    const termino = document.getElementById("busqueda").value.trim();
    const contenedor = document.getElementById("resultadosUsuarios");
    contenedor.innerHTML = `<div class="col-12 text-muted">Buscando...</div>`;

    try {
        const respuesta = await fetch(
            `${API_BASE}/api/auth/users?q=${encodeURIComponent(termino)}&currentUserId=${usuario.id}`
        );
        const data = await respuesta.json();
        const usuarios = data.success ? data.usuarios : [];

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
