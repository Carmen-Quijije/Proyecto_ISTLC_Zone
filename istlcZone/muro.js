const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

let usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
let publicacionesFeed = [];

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    pintarUsuario(usuario);
    document.getElementById("formPublicacion").addEventListener("submit", crearPublicacion);
    document.getElementById("imagenPublicacion").addEventListener("change", actualizarPreviewPublicacion);
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
    const imagenesArchivos = Array.from(document.getElementById("imagenPublicacion").files).slice(0, 6);

    boton.disabled = true;
    boton.textContent = imagenesArchivos.length ? "Subiendo imagenes..." : "Publicando...";

    try {
        const imagenesUrls = await subirImagenes(imagenesArchivos, "istlc-zone/publicaciones");
        boton.textContent = "Publicando...";

        const respuesta = await fetch(`${API_BASE}/api/auth/posts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: usuario.id,
                contenido,
                imagenesUrls
            })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo publicar");
        }

        document.getElementById("formPublicacion").reset();
        limpiarPreviewPublicacion();
        await cargarFeed();
    } catch (error) {
        mostrarToastAppSeguro(error.message, "error");
    } finally {
        boton.disabled = false;
        boton.textContent = "Publicar";
    }
}

function actualizarPreviewPublicacion() {
    const input = document.getElementById("imagenPublicacion");
    const archivos = Array.from(input.files).slice(0, 6);
    const preview = document.getElementById("previewImagenPublicacion");
    const texto = document.getElementById("textoImagenPublicacion");

    if (!archivos.length) {
        limpiarPreviewPublicacion();
        return;
    }

    preview.innerHTML = archivos
        .map((archivo) => `<img src="${URL.createObjectURL(archivo)}" alt="Vista previa">`)
        .join("");
    preview.classList.remove("d-none");
    texto.textContent = archivos.length === 1 ? archivos[0].name : `${archivos.length} imagenes seleccionadas`;
}

function limpiarPreviewPublicacion() {
    const preview = document.getElementById("previewImagenPublicacion");
    const texto = document.getElementById("textoImagenPublicacion");

    preview.innerHTML = "";
    preview.classList.add("d-none");
    texto.textContent = "Añadir foto desde el ordenador";
}

async function subirImagenes(archivos, folder) {
    const imagenes = [];

    for (const archivo of archivos) {
        imagenes.push(await subirImagen(archivo, folder));
    }

    return imagenes;
}

async function subirImagen(archivo, folder) {
    if (!archivo) {
        return "";
    }

    const formData = new FormData();
    formData.append("image", archivo);
    formData.append("folder", folder);

    const respuesta = await fetch(`${API_BASE}/api/auth/upload-image`, {
        method: "POST",
        body: formData
    });
    const data = await respuesta.json();

    if (!respuesta.ok || !data.success) {
        throw new Error(data.message || "No se pudo subir la imagen");
    }

    return data.url;
}

async function cargarFeed() {
    const contenedor = document.getElementById("listaPublicaciones");
    contenedor.innerHTML = `<div class="card shadow-sm p-4 text-muted">Cargando publicaciones...</div>`;

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/feed/${usuario.id}`);
        const data = await respuesta.json();
        const publicaciones = data.success ? data.publicaciones : [];
        publicacionesFeed = publicaciones;

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
    const esMia = Number(autor.id) === Number(usuario.id);
    const botonesGestion = esMia
        ? `
            <button
                class="btn btn-sm btn-outline-primary btn-eliminar-publicacion me-2"
                onclick="editarPublicacion(${publicacion.id})"
            >
                Editar
            </button>
            <button
                class="btn btn-sm btn-outline-danger btn-eliminar-publicacion"
                onclick="eliminarPublicacion(${publicacion.id})"
            >
                Eliminar
            </button>
        `
        : "";
    const imagen = renderImagenesPublicacion(publicacion);
    const fecha = publicacion.fecha ? new Date(publicacion.fecha).toLocaleString("es-EC") : "Hoy";
    const likeClase = publicacion.likedByMe ? "btn-warning" : "btn-light";
    const likeTexto = publicacion.likedByMe ? "Te gusta" : "Me gusta";

    return `
        <article class="card shadow-sm mb-4 publicacion-card">
            <div class="card-body">
                <div class="d-flex align-items-start justify-content-between mb-3">
                    <div class="d-flex align-items-center">
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
                    <div>${botonesGestion}</div>
                </div>

                <p>${contenido}</p>
                ${imagen}

                <div class="border-top pt-2 d-flex justify-content-around">
                    <button
                        class="btn ${likeClase}"
                        onclick="alternarLike(${publicacion.id}, ${publicacion.likedByMe})"
                    >
                        ${likeTexto} (${publicacion.totalLikes})
                    </button>
                    <button class="btn btn-light" onclick="mostrarComentarios(${publicacion.id})">
                        Comentar (${publicacion.totalComentarios})
                    </button>
                    <button class="btn btn-light">Compartir</button>
                </div>

                <section class="comentarios-box mt-3" id="comentarios-${publicacion.id}">
                    <div class="comentarios-lista" id="comentarios-lista-${publicacion.id}"></div>
                    <form class="comentario-form" onsubmit="crearComentario(event, ${publicacion.id})">
                        <input
                            class="form-control"
                            id="comentario-input-${publicacion.id}"
                            placeholder="Escribe un comentario..."
                            autocomplete="off"
                        />
                        <button class="btn btn-warning" type="submit">Enviar</button>
                    </form>
                </section>
            </div>
        </article>
    `;
}

async function editarPublicacion(publicacionId) {
    const publicacion = publicacionesFeed.find((item) => Number(item.id) === Number(publicacionId));
    if (!publicacion) {
        mostrarToastAppSeguro("No se encontro la publicacion", "error");
        return;
    }

    const resultado = await abrirEditorPublicacionApp(publicacion, subirImagenes);
    if (!resultado) {
        return;
    }

    try {
        const payload = {
            usuarioId: usuario.id,
            contenido: resultado.contenido,
            imagenesUrls: resultado.imagenesUrls
        };

        const respuesta = await fetch(`${API_BASE}/api/auth/posts/${publicacionId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo editar la publicacion");
        }

        await cargarFeed();
    } catch (error) {
        mostrarToastAppSeguro(error.message, "error");
    }
}

function renderImagenesPublicacion(publicacion) {
    const imagenes = obtenerImagenesPublicacion(publicacion);

    if (!imagenes.length) {
        return "";
    }

    const clase = imagenes.length > 1 ? "publicacion-galeria multiple" : "publicacion-galeria";

    return `
        <div class="${clase}">
            ${imagenes.map((imagen) => `
                <img class="publicacion-img" src="${imagen}" alt="Imagen de publicacion">
            `).join("")}
        </div>
    `;
}

function obtenerImagenesPublicacion(publicacion) {
    if (Array.isArray(publicacion.imagenes) && publicacion.imagenes.length) {
        return publicacion.imagenes;
    }

    return publicacion.imagenUrl ? [publicacion.imagenUrl] : [];
}

function seleccionarYSubirImagenes(folder) {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.multiple = true;
        let resuelto = false;

        input.addEventListener("change", async () => {
            try {
                resuelto = true;
                const archivos = Array.from(input.files).slice(0, 6);
                resolve(await subirImagenes(archivos, folder));
            } catch (error) {
                reject(error);
            }
        });

        window.addEventListener("focus", () => {
            setTimeout(() => {
                if (!resuelto && !input.files.length) {
                    resuelto = true;
                    resolve(null);
                }
            }, 400);
        }, { once: true });

        input.click();
    });
}

async function eliminarPublicacion(publicacionId) {
    const confirmar = await confirmarAppSeguro("Quieres eliminar esta publicacion? Se borraran tambien sus comentarios y me gusta.");

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

        await cargarFeed();
    } catch (error) {
        mostrarToastAppSeguro(error.message, "error");
    }
}

async function alternarLike(publicacionId, likedByMe) {
    try {
        await fetch(`${API_BASE}/api/auth/posts/${publicacionId}/like`, {
            method: likedByMe ? "DELETE" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuario.id })
        });
        await cargarFeed();
    } catch (error) {
        mostrarToastAppSeguro("No se pudo actualizar el me gusta", "error");
    }
}

async function mostrarComentarios(publicacionId) {
    const caja = document.getElementById(`comentarios-${publicacionId}`);

    if (!caja) {
        return;
    }

    caja.classList.toggle("activo");

    if (caja.classList.contains("activo")) {
        await cargarComentarios(publicacionId);
    }
}

async function cargarComentarios(publicacionId) {
    const lista = document.getElementById(`comentarios-lista-${publicacionId}`);
    lista.innerHTML = `<p class="text-muted small mb-2">Cargando comentarios...</p>`;

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts/${publicacionId}/comments`);
        const data = await respuesta.json();
        const comentarios = data.success ? data.comentarios : [];

        if (!comentarios.length) {
            lista.innerHTML = `<p class="text-muted small mb-2">Se el primero en comentar.</p>`;
            return;
        }

        lista.innerHTML = comentarios.map(tarjetaComentario).join("");
    } catch (error) {
        lista.innerHTML = `<p class="text-muted small mb-2">No se pudieron cargar comentarios.</p>`;
    }
}

function tarjetaComentario(comentario) {
    const autor = comentario.autor || {};
    const fecha = comentario.fecha ? new Date(comentario.fecha).toLocaleString("es-EC") : "Hoy";

    return `
        <div class="comentario-item">
            <img src="${autor.fotoPerfil || "images/icono.png"}" alt="${autor.nombre || "Usuario"}">
            <div>
                <strong>${autor.nombre || "Usuario"}</strong>
                <p>${escaparHtml(comentario.contenido)}</p>
                <small>${fecha}</small>
            </div>
        </div>
    `;
}

async function crearComentario(evento, publicacionId) {
    evento.preventDefault();

    const input = document.getElementById(`comentario-input-${publicacionId}`);
    const contenido = input.value.trim();

    if (!contenido) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts/${publicacionId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: usuario.id,
                contenido
            })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo comentar");
        }

        input.value = "";
        await cargarComentarios(publicacionId);
        await cargarFeed();
        const caja = document.getElementById(`comentarios-${publicacionId}`);
        if (caja) {
            caja.classList.add("activo");
            await cargarComentarios(publicacionId);
        }
    } catch (error) {
        mostrarToastAppSeguro(error.message, "error");
    }
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

function confirmarAppSeguro(mensaje) {
    if (typeof confirmarApp === "function") {
        return confirmarApp(mensaje);
    }

    return Promise.resolve(window.confirm(mensaje));
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
