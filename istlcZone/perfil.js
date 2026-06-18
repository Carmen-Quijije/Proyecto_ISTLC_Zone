const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

let usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
let publicacionesPerfil = [];
const parametrosPerfil = new URLSearchParams(window.location.search);
const perfilObjetivoId = Number(parametrosPerfil.get("id") || usuario?.id || 0);
let perfilMostrado = usuario;
let esPerfilPropio = Number(perfilObjetivoId) === Number(usuario?.id);
let estadoSeguimientoPerfil = {
    siguiendo: false,
    solicitudPendiente: false
};

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", async () => {
    configurarLinksPerfil();
    prepararVistaPerfil();
    await cargarPerfilActualizado();
    await cargarAmigosPerfil();
    await cargarPublicacionesPerfil();
});

function prepararVistaPerfil() {
    esPerfilPropio = Number(perfilObjetivoId) === Number(usuario?.id);

    if (!esPerfilPropio) {
        document.querySelectorAll(".perfil-editar-link, .perfil-publicar-box").forEach((elemento) => {
            elemento.classList.add("d-none");
        });
        ponerTexto("tituloPublicacionesPerfil", "Publicaciones");
        renderAccionesPerfilAjeno();
    }
}

async function cargarPerfilActualizado() {
    if (!perfilObjetivoId) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/profile/${perfilObjetivoId}?currentUserId=${usuario.id}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            document
                .getElementById("perfilHeader")
                ?.classList.remove("perfil-cargando");
            return;
        }

        perfilMostrado = data.usuario;
        perfilMostrado.seguidores = data.seguidores;
        perfilMostrado.seguidos = data.seguidos;
        estadoSeguimientoPerfil = {
            siguiendo: !!data.siguiendo,
            solicitudPendiente: !!data.solicitudPendiente
        };

        if (esPerfilPropio) {
            usuario = perfilMostrado;
            localStorage.setItem("usuarioLogueado", JSON.stringify(usuario));
        }

        cargarDatosUsuario(perfilMostrado);
        cargarContadores(data.seguidores, data.seguidos);
        renderAccionesPerfilAjeno();
    } catch (error) {
        console.error("No se pudo cargar el perfil:", error);

        document
            .getElementById("perfilHeader")
            ?.classList.remove("perfil-cargando");
    }
}

function renderAccionesPerfilAjeno() {
    if (esPerfilPropio) {
        return;
    }

    const contenedor = document.querySelector(".perfil-acciones");
    if (!contenedor) {
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

    contenedor.classList.remove("d-none");
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
        <a href="mensajes.html?contacto=${perfilObjetivoId}" class="btn btn-light fw-bold">
            Mensaje
        </a>
        <button
            class="btn btn-outline-warning fw-bold"
            type="button"
            onclick="reportarPerfil()"
        >
            Reportar perfil
        </button>
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
                seguidoId: perfilObjetivoId
            })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo enviar la solicitud");
        }

        estadoSeguimientoPerfil.solicitudPendiente = true;
        renderAccionesPerfilAjeno();
        mostrarToastAppSeguro(data.message || "Solicitud enviada");

        if (typeof cargarNotificacionesApp === "function") {
            await cargarNotificacionesApp();
        }
    } catch (error) {
        mostrarToastAppSeguro(error.message || "No se pudo enviar la solicitud", "error");
        renderAccionesPerfilAjeno();
    }
}

async function reportarPerfil() {
    const motivo = window.prompt("Cuentanos el motivo del reporte");

    if (motivo === null) {
        return;
    }

    const texto = motivo.trim();

    if (!texto) {
        mostrarToastPerfil("Escribe un motivo para reportar", "error");
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tipo: "perfil",
                referenciaId: perfilObjetivoId,
                reportanteId: usuario.id,
                motivo: texto
            })
        });
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudo enviar el reporte");
        }

        mostrarToastPerfil("Reporte enviado. Gracias por avisar.");
    } catch (error) {
        mostrarToastPerfil(error.message, "error");
    }
}

function mostrarToastPerfil(mensaje, tipo) {
    if (typeof mostrarToastApp === "function") {
        mostrarToastApp(mensaje, tipo);
    } else {
        alert(mensaje);
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
    
    document.getElementById("perfilHeader")?.classList.remove("perfil-cargando");
}

function cargarContadores(seguidores = usuario?.seguidores || 0, seguidos = usuario?.seguidos || 0) {
    ponerTexto("contadorSeguidores", `${seguidores} seguidores - ${seguidos} seguidos`);
    ponerTexto("contadorAmigos", `${seguidos} amigos`);
}

async function cargarAmigosPerfil() {
    const listaAmigos = document.getElementById("listaAmigos");
    const contadorAmigos = document.getElementById("contadorAmigos");

    if (!listaAmigos || !perfilObjetivoId) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/following/${perfilObjetivoId}`);
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
                        <a href="perfil.html?id=${amigo.id}">
                            <img src="${amigo.fotoPerfil || "images/icono.png"}" alt="${amigo.nombre}">
                        </a>
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

    if (!contenedor || !perfilObjetivoId) {
        return;
    }

    contenedor.innerHTML = `<p class="text-muted">Cargando publicaciones...</p>`;

    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/posts/user/${perfilObjetivoId}?currentUserId=${usuario.id}`);
        const data = await respuesta.json();
        const publicaciones = data.success ? data.publicaciones : [];
        publicacionesPerfil = publicaciones;

        if (!publicaciones.length) {
            contenedor.innerHTML = `
                <p class="text-muted mb-0">
                    ${esPerfilPropio ? "Aun no tienes publicaciones. Crea una desde tu muro." : "Este perfil aun no tiene publicaciones."}
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
    const imagen = renderImagenesPublicacion(publicacion);
    const fecha = publicacion.fecha ? new Date(publicacion.fecha).toLocaleString("es-EC") : "Hoy";
    const autor = publicacion.autor || perfilMostrado || {};
    const botonesGestion = esPerfilPropio
        ? `
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
        `
        : "";

    return `
        <article class="perfil-publicacion">
            <div class="d-flex align-items-start justify-content-between mb-2">
                <div class="d-flex align-items-center">
                    <img
                        src="${autor.fotoPerfil || perfilMostrado?.fotoPerfil || "images/icono.png"}"
                        class="rounded-circle me-2"
                        width="44"
                        height="44"
                        alt="${autor.nombre || perfilMostrado?.nombre || "Usuario"}"
                    />
                    <div>
                        <h6 class="mb-0">${autor.nombre || perfilMostrado?.nombre || "Usuario"}</h6>
                        <small class="text-muted">${fecha}</small>
                    </div>
                </div>
                ${botonesGestion}
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

        await cargarPublicacionesPerfil();
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

async function eliminarPublicacionPerfil(publicacionId) {
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

        await cargarPublicacionesPerfil();
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

function configurarLinksPerfil() {
    const parametros = new URLSearchParams(window.location.search);
    const idPerfil = parametros.get("id") || usuario.id;

    document.getElementById("linkTodo").href = `perfil.html?id=${idPerfil}`;
    document.getElementById("linkInformacion").href = `informacion.html?id=${idPerfil}`;
    document.getElementById("linkFotos").href = `fotos.html?id=${idPerfil}`;
    document.getElementById("linkAmigos").href = `amigos.html?id=${idPerfil}`;
    document.getElementById("linkCumpleanos").href = `cumpleaños.html?id=${idPerfil}`;
    document.getElementById("linkActividad").href = `actividad.html?id=${idPerfil}`;
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}
