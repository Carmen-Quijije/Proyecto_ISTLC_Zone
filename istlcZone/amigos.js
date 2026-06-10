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
    const botonTexto = persona.siguiendo ? "Siguiendo" : "Seguir";
    const botonClase = persona.siguiendo ? "btn-light" : "btn-warning";

    return `
        <div class="col-md-6 col-lg-4">
            <div class="card usuario-card shadow-sm p-3 h-100">
                <img src="${persona.fotoPerfil || "images/icono.png"}" alt="${persona.nombre}">
                <h5>${persona.nombre}</h5>
                <p class="text-muted mb-1">@${persona.usuario}</p>
                <p>${detalle}</p>
                <button
                    class="btn ${botonClase} fw-bold"
                    onclick="alternarSeguimiento(${persona.id}, ${persona.siguiendo})"
                >
                    ${botonTexto}
                </button>
            </div>
        </div>
    `;
}

async function alternarSeguimiento(seguidoId, estaSiguiendo) {
    try {
        await fetch(`${API_BASE}/api/auth/follow`, {
            method: estaSiguiendo ? "DELETE" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                seguidorId: usuario.id,
                seguidoId
            })
        });
        buscarUsuarios();
    } catch (error) {
        alert("No se pudo actualizar el seguimiento");
    }
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}
