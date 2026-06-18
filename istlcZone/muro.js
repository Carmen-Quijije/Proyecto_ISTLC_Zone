const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

let usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
let publicacionesFeed = [];
let respuestasComentario = {};
let usuariosParaCompartir = [];

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    prepararEstilosSocialesMuro();
    prepararModalCompartir();
    prepararVisorImagenes();
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
        enfocarPublicacionDesdeUrl();
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
    const autorUrl = autor.id ? `perfil.html?id=${autor.id}` : "perfil.html";
    const nombreAutor = escaparHtml(autor.nombre || "Usuario");

    return `
        <article class="card shadow-sm mb-4 publicacion-card" id="publicacion-${publicacion.id}">
            <div class="card-body">
                <div class="d-flex align-items-start justify-content-between mb-3">
                    <div class="d-flex align-items-center">
                        <a href="${autorUrl}" class="perfil-link perfil-avatar-link" title="Ver perfil de ${nombreAutor}">
                            <img
                                src="${autor.fotoPerfil || "images/icono.png"}"
                                class="rounded-circle me-2"
                                width="50"
                                height="50"
                                alt="${nombreAutor}"
                            />
                        </a>
                        <div>
                            <h6 class="mb-0">
                                <a href="${autorUrl}" class="perfil-link" title="Ver perfil de ${nombreAutor}">
                                    ${nombreAutor}
                                </a>
                            </h6>
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
                    <button class="btn btn-light" onclick="abrirCompartirPublicacion(${publicacion.id})">
                        Compartir
                    </button>
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
            ${imagenes.map((imagen, indice) => `
                <button
                    class="publicacion-img-boton"
                    type="button"
                    onclick='abrirVisorImagenes(${JSON.stringify(imagenes)}, ${indice})'
                    title="Ver imagen en grande"
                >
                    <img class="publicacion-img" src="${imagen}" alt="Imagen de publicacion">
                </button>
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

        lista.innerHTML = comentarios.map((comentario) => tarjetaComentario(comentario, publicacionId)).join("");
    } catch (error) {
        lista.innerHTML = `<p class="text-muted small mb-2">No se pudieron cargar comentarios.</p>`;
    }
}

function tarjetaComentario(comentario, publicacionId) {
    const autor = comentario.autor || {};
    const respuestaA = comentario.respuestaA?.autor;
    const fecha = comentario.fecha ? new Date(comentario.fecha).toLocaleString("es-EC") : "Hoy";
    const nombreAutor = autor.nombre || "Usuario";
    const claseRespuesta = comentario.comentarioPadreId ? "respuesta" : "";
    const autorUrl = autor.id ? `perfil.html?id=${autor.id}` : "perfil.html";
    const nombreAutorSeguro = escaparHtml(nombreAutor);
    const esComentarioMio = Number(autor.id) === Number(usuario.id);
    const contenidoComentarioJson = JSON.stringify(comentario.contenido || "").replace(/'/g, "&#39;");
    const accionesComentario = esComentarioMio
        ? `
            <button
                class="comentario-accion"
                type="button"
                onclick='editarComentario(${publicacionId}, ${comentario.id}, ${contenidoComentarioJson})'
            >
                Editar
            </button>
            <button
                class="comentario-accion peligro"
                type="button"
                onclick="eliminarComentario(${publicacionId}, ${comentario.id})"
            >
                Eliminar
            </button>
        `
        : "";

    return `
        <div class="comentario-item ${claseRespuesta}">
            <a href="${autorUrl}" class="perfil-link comentario-avatar-link" title="Ver perfil de ${nombreAutorSeguro}">
                <img src="${autor.fotoPerfil || "images/icono.png"}" alt="${nombreAutorSeguro}">
            </a>
            <div>
                ${respuestaA ? `<small class="respuesta-a">Responde a ${escaparHtml(respuestaA.nombre || "Usuario")}</small>` : ""}
                <strong>
                    <a href="${autorUrl}" class="perfil-link" title="Ver perfil de ${nombreAutorSeguro}">
                        ${nombreAutorSeguro}
                    </a>
                </strong>
                <p>${escaparHtml(comentario.contenido)}</p>
                <small>${fecha}</small>
                <button
                    class="comentario-responder"
                    type="button"
                    onclick='prepararRespuestaComentario(${publicacionId}, ${comentario.id}, ${JSON.stringify(nombreAutor)})'
                >
                    Responder
                </button>
                ${accionesComentario}
            </div>
        </div>
    `;
}

async function editarComentario(publicacionId, comentarioId, contenidoActual) {
    const nuevoContenido = window.prompt("Editar comentario", contenidoActual || "");

    if (nuevoContenido === null) {
        return;
    }

    const contenido = nuevoContenido.trim();

    if (!contenido) {
        mostrarToastAppSeguro("El comentario no puede quedar vacio", "error");
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts/${publicacionId}/comments/${comentarioId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuario.id, contenido })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo editar el comentario");
        }

        await cargarComentarios(publicacionId);
        mostrarToastAppSeguro("Comentario actualizado");
    } catch (error) {
        mostrarToastAppSeguro(error.message, "error");
    }
}

async function eliminarComentario(publicacionId, comentarioId) {
    const confirmar = await confirmarAppSeguro("Quieres eliminar este comentario?");

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts/${publicacionId}/comments/${comentarioId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuario.id })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo eliminar el comentario");
        }

        await cargarComentarios(publicacionId);
        await cargarFeed();
        mostrarToastAppSeguro("Comentario eliminado");
    } catch (error) {
        mostrarToastAppSeguro(error.message, "error");
    }
}

function prepararRespuestaComentario(publicacionId, comentarioId, nombreAutor) {
    respuestasComentario[publicacionId] = comentarioId;
    const input = document.getElementById(`comentario-input-${publicacionId}`);
    const caja = document.getElementById(`comentarios-${publicacionId}`);
    let aviso = document.getElementById(`respuesta-activa-${publicacionId}`);

    if (!input || !caja) {
        return;
    }

    if (!aviso) {
        aviso = document.createElement("div");
        aviso.id = `respuesta-activa-${publicacionId}`;
        aviso.className = "respuesta-activa";
        caja.querySelector(".comentario-form")?.before(aviso);
    }

    aviso.innerHTML = `
        Respondiendo a <strong>${escaparHtml(nombreAutor)}</strong>
        <button type="button" onclick="cancelarRespuestaComentario(${publicacionId})">Cancelar</button>
    `;
    input.placeholder = `Respondiendo a ${nombreAutor}...`;
    input.focus();
}

function cancelarRespuestaComentario(publicacionId) {
    delete respuestasComentario[publicacionId];
    document.getElementById(`respuesta-activa-${publicacionId}`)?.remove();
    const input = document.getElementById(`comentario-input-${publicacionId}`);

    if (input) {
        input.placeholder = "Escribe un comentario...";
    }
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
                contenido,
                comentarioPadreId: respuestasComentario[publicacionId] || null
            })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo comentar");
        }

        input.value = "";
        cancelarRespuestaComentario(publicacionId);
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

function prepararModalCompartir() {
    if (document.getElementById("modalCompartirPublicacion")) {
        return;
    }

    const modal = document.createElement("section");
    modal.id = "modalCompartirPublicacion";
    modal.className = "modal-compartir d-none";
    modal.innerHTML = `
        <div class="modal-compartir-caja">
            <div class="modal-compartir-header">
                <div>
                    <h3>Compartir publicacion</h3>
                    <p>Elige donde quieres enviarla.</p>
                </div>
                <button type="button" class="modal-cerrar" onclick="cerrarCompartirPublicacion()">x</button>
            </div>

            <button id="btnCompartirPerfil" class="btn btn-warning w-100 mb-3" type="button">
                Compartir en mi perfil
            </button>

            <label class="form-label fw-bold">Enviar por mensaje</label>
            <input id="buscarCompartirUsuario" class="form-control mb-3" placeholder="Buscar persona..." autocomplete="off" />
            <div id="listaCompartirUsuarios" class="lista-compartir-usuarios">
                <p class="text-muted mb-0">Cargando personas...</p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("buscarCompartirUsuario").addEventListener("input", (evento) => {
        pintarUsuariosParaCompartir(evento.target.value);
    });
    document.getElementById("btnCompartirPerfil").addEventListener("click", compartirEnMiPerfil);
}

async function abrirCompartirPublicacion(publicacionId) {
    const modal = document.getElementById("modalCompartirPublicacion");

    if (!modal) {
        return;
    }

    modal.dataset.publicacionId = publicacionId;
    modal.classList.remove("d-none");
    document.getElementById("buscarCompartirUsuario").value = "";
    document.getElementById("listaCompartirUsuarios").innerHTML = `<p class="text-muted mb-0">Cargando personas...</p>`;

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/users?q=&currentUserId=${usuario.id}`);
        const data = await respuesta.json();
        usuariosParaCompartir = data.success
            ? data.usuarios.filter((persona) => Number(persona.id) !== Number(usuario.id))
            : [];
        pintarUsuariosParaCompartir("");
    } catch (error) {
        document.getElementById("listaCompartirUsuarios").innerHTML =
            `<p class="text-muted mb-0">No se pudieron cargar personas.</p>`;
    }
}

function cerrarCompartirPublicacion() {
    document.getElementById("modalCompartirPublicacion")?.classList.add("d-none");
}

function pintarUsuariosParaCompartir(busqueda) {
    const lista = document.getElementById("listaCompartirUsuarios");
    const filtro = String(busqueda || "").trim().toLowerCase();
    const personas = usuariosParaCompartir
        .filter((persona) => {
            const texto = `${persona.nombre || ""} ${persona.usuario || ""} ${persona.email || ""}`.toLowerCase();
            return texto.includes(filtro);
        })
        .slice(0, 8);

    if (!personas.length) {
        lista.innerHTML = `<p class="text-muted mb-0">No hay personas para mostrar.</p>`;
        return;
    }

    lista.innerHTML = personas.map((persona) => `
        <button class="compartir-persona" type="button" onclick="compartirPorMensaje(${persona.id})">
            <img src="${persona.fotoPerfil || "images/icono.png"}" alt="${escaparHtml(persona.nombre || "Usuario")}">
            <span>
                <strong>${escaparHtml(persona.nombre || "Usuario")}</strong>
                <small>@${escaparHtml(persona.usuario || "usuario")}</small>
            </span>
            <b>Enviar</b>
        </button>
    `).join("");
}

async function compartirEnMiPerfil() {
    const modal = document.getElementById("modalCompartirPublicacion");
    const publicacionId = modal?.dataset.publicacionId;

    if (!publicacionId) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts/${publicacionId}/share-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuarioId: usuario.id })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo compartir");
        }

        cerrarCompartirPublicacion();
        mostrarToastAppSeguro("Compartido en tu perfil");
        await cargarFeed();
    } catch (error) {
        mostrarToastAppSeguro(error.message, "error");
    }
}

async function compartirPorMensaje(receptorId) {
    const modal = document.getElementById("modalCompartirPublicacion");
    const publicacionId = modal?.dataset.publicacionId;

    if (!publicacionId) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts/${publicacionId}/share-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                emisorId: usuario.id,
                receptorId
            })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo enviar por mensaje");
        }

        cerrarCompartirPublicacion();
        mostrarToastAppSeguro("Publicacion enviada por mensaje");
    } catch (error) {
        mostrarToastAppSeguro(error.message, "error");
    }
}

function prepararEstilosSocialesMuro() {
    if (document.getElementById("estilosSocialesMuro")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "estilosSocialesMuro";
    style.textContent = `
        .publicacion-img-boton{display:block;width:100%;padding:0;border:0;background:transparent;border-radius:8px;cursor:zoom-in;overflow:hidden}
        .publicacion-galeria.multiple .publicacion-img-boton{height:100%}
        .publicacion-img-boton .publicacion-img{display:block;width:100%;height:100%}
        .visor-imagenes{position:fixed;inset:0;background:rgba(0,0,0,.86);z-index:4000;display:flex;align-items:center;justify-content:center;padding:22px}
        .visor-imagenes.d-none{display:none!important}
        .visor-imagenes img{max-width:min(1100px,92vw);max-height:84vh;border-radius:8px;box-shadow:0 20px 70px rgba(0,0,0,.55);object-fit:contain;background:#050914}
        .visor-imagenes-cerrar,.visor-imagenes-nav{position:absolute;border:1px solid rgba(255,193,7,.5);background:#061a38;color:white;border-radius:8px;font-weight:800}
        .visor-imagenes-cerrar{top:18px;right:18px;width:42px;height:42px;font-size:24px}
        .visor-imagenes-nav{top:50%;transform:translateY(-50%);width:46px;height:56px;font-size:30px}
        .visor-imagenes-prev{left:18px}
        .visor-imagenes-next{right:18px}
        .visor-imagenes-contador{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:#061a38;color:white;border:1px solid rgba(255,193,7,.5);border-radius:999px;padding:6px 14px;font-weight:700}
        .comentario-item.respuesta{margin-left:46px;border-left:3px solid #ffc107;padding-left:10px}
        .respuesta-a{display:block;color:#6c757d;font-size:12px;margin-bottom:2px}
        .comentario-responder{border:0;background:transparent;color:#0d6efd;font-weight:700;font-size:13px;padding:0;margin-left:8px}
        .comentario-responder:hover{text-decoration:underline}
        .comentario-accion{border:0;background:transparent;color:#0d6efd;font-weight:700;font-size:13px;padding:0;margin-left:8px}
        .comentario-accion.peligro{color:#dc3545}
        .comentario-accion:hover{text-decoration:underline}
        .respuesta-activa{background:#fff8df;border:1px solid #ffc107;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:14px}
        .respuesta-activa button{border:0;background:transparent;color:#a00000;font-weight:700;margin-left:8px}
        .modal-compartir{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:3000;display:flex;align-items:center;justify-content:center;padding:18px}
        .modal-compartir.d-none{display:none!important}
        .modal-compartir-caja{width:min(560px,100%);background:white;border-radius:8px;box-shadow:0 18px 50px rgba(0,0,0,.25);padding:20px}
        .modal-compartir-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
        .modal-compartir-header h3{font-size:26px;margin:0;color:#061a38;font-weight:800}
        .modal-compartir-header p{margin:2px 0 0;color:#6c757d}
        .modal-cerrar{border:0;background:#f1f3f5;border-radius:8px;width:34px;height:34px;font-weight:800}
        .lista-compartir-usuarios{max-height:310px;overflow:auto;display:grid;gap:8px}
        .compartir-persona{width:100%;border:1px solid #dee2e6;background:#fff;border-radius:8px;padding:10px;display:flex;align-items:center;gap:10px;text-align:left}
        .compartir-persona:hover{border-color:#ffc107;background:#fff8df}
        .compartir-persona img{width:46px;height:46px;border-radius:50%;object-fit:cover;border:2px solid #ffc107}
        .compartir-persona span{display:flex;flex-direction:column;flex:1}
        .compartir-persona small{color:#6c757d}
        .compartir-persona b{color:#061a38}
    `;
    document.head.appendChild(style);
}

function prepararVisorImagenes() {
    if (document.getElementById("visorImagenesMuro")) {
        return;
    }

    const visor = document.createElement("section");
    visor.id = "visorImagenesMuro";
    visor.className = "visor-imagenes d-none";
    visor.innerHTML = `
        <button class="visor-imagenes-cerrar" type="button" onclick="cerrarVisorImagenes()" title="Cerrar">&times;</button>
        <button class="visor-imagenes-nav visor-imagenes-prev" type="button" onclick="moverVisorImagenes(-1)" title="Anterior">&#8249;</button>
        <img id="visorImagenesImg" src="" alt="Imagen de publicacion ampliada">
        <button class="visor-imagenes-nav visor-imagenes-next" type="button" onclick="moverVisorImagenes(1)" title="Siguiente">&#8250;</button>
        <span id="visorImagenesContador" class="visor-imagenes-contador"></span>
    `;
    visor.addEventListener("click", (evento) => {
        if (evento.target === visor) {
            cerrarVisorImagenes();
        }
    });
    document.addEventListener("keydown", (evento) => {
        if (visor.classList.contains("d-none")) {
            return;
        }

        if (evento.key === "Escape") {
            cerrarVisorImagenes();
        }

        if (evento.key === "ArrowLeft") {
            moverVisorImagenes(-1);
        }

        if (evento.key === "ArrowRight") {
            moverVisorImagenes(1);
        }
    });
    document.body.appendChild(visor);
}

function abrirVisorImagenes(imagenes, indice = 0) {
    window.visorImagenesActual = {
        imagenes: Array.isArray(imagenes) ? imagenes : [imagenes],
        indice
    };
    actualizarVisorImagenes();
    document.getElementById("visorImagenesMuro")?.classList.remove("d-none");
}

function moverVisorImagenes(direccion) {
    const visor = window.visorImagenesActual;

    if (!visor?.imagenes?.length) {
        return;
    }

    visor.indice = (visor.indice + direccion + visor.imagenes.length) % visor.imagenes.length;
    actualizarVisorImagenes();
}

function actualizarVisorImagenes() {
    const visor = window.visorImagenesActual;
    const imagen = document.getElementById("visorImagenesImg");
    const contador = document.getElementById("visorImagenesContador");

    if (!visor || !imagen || !contador) {
        return;
    }

    imagen.src = visor.imagenes[visor.indice] || "";
    contador.textContent = `${visor.indice + 1} / ${visor.imagenes.length}`;
}

function cerrarVisorImagenes() {
    document.getElementById("visorImagenesMuro")?.classList.add("d-none");
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
                <a class="sugerido-linea" href="perfil.html?id=${persona.id}" title="Ver perfil de ${escaparHtml(persona.nombre)}">
                    <img src="${persona.fotoPerfil || "images/icono.png"}" alt="${persona.nombre}">
                    <div>
                        <strong>${persona.nombre}</strong>
                        <small>@${persona.usuario}</small>
                    </div>
                </a>
            `)
            .join("");
    } catch (error) {
        contenedor.innerHTML = `<p class="text-muted mb-0">No se pudieron cargar sugerencias.</p>`;
    }
}

async function enfocarPublicacionDesdeUrl() {
    const parametros = new URLSearchParams(window.location.search);
    const publicacionId = parametros.get("post");
    const abrirComentarios = parametros.get("comentarios");

    if (!publicacionId) {
        return;
    }

    const publicacion = document.getElementById(`publicacion-${publicacionId}`);

    if (!publicacion) {
        return;
    }

    publicacion.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    publicacion.classList.add("publicacion-resaltada");

    setTimeout(() => {
        publicacion.classList.remove("publicacion-resaltada");
    }, 2500);

    if (abrirComentarios === "1") {
        await mostrarComentarios(publicacionId);
    }
}


function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}
