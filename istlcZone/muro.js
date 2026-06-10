const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

let usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    pintarUsuario(usuario);
    document.getElementById("formPublicacion").addEventListener("submit", crearPublicacion);
    await cargarPerfil();
    await cargarFeed();
    await cargarSugerencias();
});

function pintarUsuario(datosUsuario) {
    const nombre = datosUsuario?.nombre || datosUsuario?.usuario || "Usuario";
    document.getElementById("nombrePerfil").textContent = nombre;
    document.getElementById("fotoPerfil").src = datosUsuario?.fotoPerfil || "images/icono.png";
}

async function cargarPerfil() {
    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/profile/${usuario.id}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            return;
        }

        usuario = data.usuario;
        usuario.seguidores = data.seguidores;
        usuario.seguidos = data.seguidos;
        localStorage.setItem("usuarioLogueado", JSON.stringify(usuario));
        pintarUsuario(usuario);
        document.getElementById("contadorSeguidores").textContent =
            `${data.seguidores} seguidores - ${data.seguidos} seguidos`;
    } catch (error) {
        console.error("No se pudo cargar el perfil:", error);
    }
}

async function crearPublicacion(evento) {
    evento.preventDefault();

    const boton = document.getElementById("btnPublicar");
    const contenido = document.getElementById("contenidoPublicacion").value.trim();
    const imagenUrl = document.getElementById("imagenPublicacion").value.trim();

    boton.disabled = true;
    boton.textContent = "Publicando...";

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: usuario.id,
                contenido,
                imagenUrl
            })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo publicar");
        }

        document.getElementById("formPublicacion").reset();
        await cargarFeed();
    } catch (error) {
        alert(error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = "Publicar";
    }
}

async function cargarFeed() {
    const contenedor = document.getElementById("listaPublicaciones");
    contenedor.innerHTML = `<div class="card shadow-sm p-4 text-muted">Cargando publicaciones...</div>`;

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/feed/${usuario.id}`);
        const data = await respuesta.json();
        const publicaciones = data.success ? data.publicaciones : [];

        if (!publicaciones.length) {
            contenedor.innerHTML = `
                <div class="card shadow-sm p-4">
                    <h4>Bienvenido a tu muro</h4>
                    <p class="mb-0 text-muted">
                        Aqui apareceran tus publicaciones y las de las personas que sigues.
                    </p>
                </div>
            `;
            return;
        }

        contenedor.innerHTML = publicaciones.map(tarjetaPublicacion).join("");
    } catch (error) {
        contenedor.innerHTML = `
            <div class="card shadow-sm p-4">
                No se pudieron cargar las publicaciones.
            </div>
        `;
    }
}

function tarjetaPublicacion(publicacion) {
    const autor = publicacion.autor || {};
    const contenido = escaparHtml(publicacion.contenido);
    const imagen = publicacion.imagenUrl
        ? `<img class="publicacion-img" src="${publicacion.imagenUrl}" alt="Imagen de publicacion">`
        : "";
    const fecha = publicacion.fecha ? new Date(publicacion.fecha).toLocaleString("es-EC") : "Hoy";

    return `
        <article class="card shadow-sm mb-4 publicacion-card">
            <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                    <img
                        src="${autor.fotoPerfil || "images/icono.png"}"
                        class="rounded-circle me-2"
                        width="50"
                        height="50"
                        alt="${autor.nombre || "Usuario"}"
                    />
                    <div>
                        <h6 class="mb-0">${autor.nombre || "Usuario"}</h6>
                        <small class="text-muted">${fecha}</small>
                    </div>
                </div>

                <p>${contenido}</p>
                ${imagen}

                <div class="border-top pt-2 d-flex justify-content-around">
                    <button class="btn btn-light">Me gusta</button>
                    <button class="btn btn-light">Comentar</button>
                    <button class="btn btn-light">Compartir</button>
                </div>
            </div>
        </article>
    `;
}

function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto || "";
    return div.innerHTML;
}

async function cargarSugerencias() {
    const contenedor = document.getElementById("amigosSugeridos");

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/users?q=&currentUserId=${usuario.id}`);
        const data = await respuesta.json();
        const sugeridos = data.success ? data.usuarios.filter((persona) => !persona.siguiendo).slice(0, 3) : [];

        if (!sugeridos.length) {
            contenedor.innerHTML = `<p class="text-muted mb-0">No hay sugerencias por ahora.</p>`;
            return;
        }

        contenedor.innerHTML = sugeridos
            .map((persona) => `
                <div class="sugerido-linea">
                    <img src="${persona.fotoPerfil || "images/icono.png"}" alt="${persona.nombre}">
                    <div>
                        <strong>${persona.nombre}</strong>
                        <small>@${persona.usuario}</small>
                    </div>
                </div>
            `)
            .join("");
    } catch (error) {
        contenedor.innerHTML = `<p class="text-muted mb-0">No se pudieron cargar sugerencias.</p>`;
    }
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}
