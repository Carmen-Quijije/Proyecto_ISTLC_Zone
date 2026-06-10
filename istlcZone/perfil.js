const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

let usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
let publicacionesPerfil = [];

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    cargarDatosUsuario(usuario);
    await cargarPerfilActualizado();
    await cargarAmigosPerfil();
    await cargarPublicacionesPerfil();
});

async function cargarPerfilActualizado() {
    if (!usuario?.id) {
        return;
    }

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
        cargarDatosUsuario(usuario);
        cargarContadores(data.seguidores, data.seguidos);
    } catch (error) {
        console.error("No se pudo cargar el perfil:", error);
    }
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

function ponerImagen(selector, src) {
    document.querySelectorAll(selector).forEach((imagen) => {
        imagen.src = src || "images/icono.png";
    });
}

function cargarDatosUsuario(datosUsuario) {
    const nombreUsuario =
        datosUsuario?.nombre ||
        datosUsuario?.nombreCompleto ||
        datosUsuario?.usuario ||
        "Usuario";

    ponerTexto("nombrePerfil", nombreUsuario);
    ponerTexto("nombrePost", nombreUsuario);
    ponerTexto("detalleViveEn", texto(datosUsuario?.viveEn));
    ponerTexto("detalleCarrera", texto(datosUsuario?.carrera));
    ponerTexto("detalleSemestre", texto(datosUsuario?.semestre));
    ponerTexto("viveEn", texto(datosUsuario?.viveEn));
    ponerTexto("lugarOrigen", texto(datosUsuario?.lugarOrigen));
    ponerTexto("fechaNacimiento", texto(datosUsuario?.fechaNacimiento));
    ponerTexto("estadoCivil", texto(datosUsuario?.estadoCivil));
    ponerTexto("carrera", texto(datosUsuario?.carrera));
    ponerTexto("semestre", texto(datosUsuario?.semestre));

    const bio = datosUsuario?.bio || "Bienvenido a mi perfil de ISTLC Zone.";
    ponerTexto("bioPerfil", bio);

    ponerImagen("#fotoPerfil, .foto-usuario", datosUsuario?.fotoPerfil);
}

function cargarContadores(seguidores = usuario?.seguidores || 0, seguidos = usuario?.seguidos || 0) {
    ponerTexto("contadorSeguidores", `${seguidores} seguidores - ${seguidos} seguidos`);
    ponerTexto("contadorAmigos", `${seguidos} amigos`);
}

async function cargarAmigosPerfil() {
    const listaAmigos = document.getElementById("listaAmigos");
    const contadorAmigos = document.getElementById("contadorAmigos");

    if (!listaAmigos || !usuario?.id) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/following/${usuario.id}`);
        const data = await respuesta.json();
        const amigos = data.success ? data.usuarios : [];

        if (contadorAmigos) {
            contadorAmigos.textContent = `${amigos.length} amigos`;
        }

        if (!amigos.length) {
            listaAmigos.innerHTML = `
                <div class="col-12">
                    <p class="text-muted mb-2">Aun no tienes amigos agregados.</p>
                    <a href="amigos.html" class="btn btn-warning w-100">Buscar amigos</a>
                </div>
            `;
            return;
        }

        listaAmigos.innerHTML = amigos
            .map((amigo) => `
                <div class="col-6">
                    <div class="amigo-mini">
                        <img src="${amigo.fotoPerfil || "images/icono.png"}" alt="${amigo.nombre}">
                        <strong>${amigo.nombre}</strong>
                    </div>
                </div>
            `)
            .join("");
    } catch (error) {
        console.error("No se pudieron cargar amigos:", error);
    }
}

async function cargarPublicacionesPerfil() {
    const contenedor = document.getElementById("publicacionesPerfil");

    if (!contenedor || !usuario?.id) {
        return;
    }

    contenedor.innerHTML = `<p class="text-muted">Cargando publicaciones...</p>`;

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts/user/${usuario.id}?currentUserId=${usuario.id}`);
        const data = await respuesta.json();
        const publicaciones = data.success ? data.publicaciones : [];
        publicacionesPerfil = publicaciones;

        if (!publicaciones.length) {
            contenedor.innerHTML = `
                <p class="text-muted mb-0">
                    Aun no tienes publicaciones. Crea una desde tu muro.
                </p>
            `;
            return;
        }

        contenedor.innerHTML = publicaciones.map(tarjetaPublicacionPerfil).join("");
    } catch (error) {
        contenedor.innerHTML = `<p class="text-muted mb-0">No se pudieron cargar tus publicaciones.</p>`;
    }
}

function tarjetaPublicacionPerfil(publicacion) {
    const imagen = publicacion.imagenUrl
        ? `<img class="publicacion-img" src="${publicacion.imagenUrl}" alt="Imagen de publicacion">`
        : "";
    const fecha = publicacion.fecha ? new Date(publicacion.fecha).toLocaleString("es-EC") : "Hoy";

    return `
        <article class="perfil-publicacion">
            <div class="d-flex align-items-start justify-content-between mb-2">
                <div class="d-flex align-items-center">
                    <img
                        src="${usuario.fotoPerfil || "images/icono.png"}"
                        class="rounded-circle me-2"
                        width="44"
                        height="44"
                        alt="${usuario.nombre || "Usuario"}"
                    />
                    <div>
                        <h6 class="mb-0">${usuario.nombre || "Usuario"}</h6>
                        <small class="text-muted">${fecha}</small>
                    </div>
                </div>
                <div>
                    <button
                        class="btn btn-sm btn-outline-primary btn-eliminar-publicacion me-2"
                        onclick="editarPublicacionPerfil(${publicacion.id})"
                    >
                        Editar
                    </button>
                <button
                    class="btn btn-sm btn-outline-danger btn-eliminar-publicacion"
                    onclick="eliminarPublicacionPerfil(${publicacion.id})"
                >
                    Eliminar
                </button>
                </div>
            </div>
            <p>${escaparHtml(publicacion.contenido)}</p>
            ${imagen}
            <div class="perfil-publicacion-resumen">
                <span>${publicacion.totalLikes || 0} me gusta</span>
                <span>${publicacion.totalComentarios || 0} comentarios</span>
            </div>
        </article>
    `;
}

async function editarPublicacionPerfil(publicacionId) {
    const publicacion = publicacionesPerfil.find((item) => Number(item.id) === Number(publicacionId));
    if (!publicacion) {
        alert("No se encontro la publicacion");
        return;
    }

    const nuevoTexto = prompt("Edita tu publicacion:", publicacion.contenido || "");
    if (nuevoTexto === null) {
        return;
    }

    const contenido = nuevoTexto.trim();
    if (!contenido) {
        alert("La publicacion no puede quedar vacia");
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts/${publicacionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: usuario.id,
                contenido
            })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo editar la publicacion");
        }

        await cargarPublicacionesPerfil();
    } catch (error) {
        alert(error.message);
    }
}

async function eliminarPublicacionPerfil(publicacionId) {
    const confirmar = confirm("Quieres eliminar esta publicacion? Se borraran tambien sus comentarios y me gusta.");

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts/${publicacionId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuario.id })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo eliminar la publicacion");
        }

        await cargarPublicacionesPerfil();
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
