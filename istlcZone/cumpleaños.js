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
let perfilMostrado = null;

if (!usuario) {
    window.location.href = "index.html";
}

const listaCumpleaños = document.getElementById("listaCumpleaños");

document.addEventListener("DOMContentLoaded", async () => {
    configurarLinksPerfil();
    await cargarPerfilConsultado();
    cargarCumpleañosAmigos();
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
        perfilMostrado = perfil;
        const nombrePerfil = perfil?.nombre || perfil?.usuario || "Usuario";
        estadoSeguimientoPerfil = {
            siguiendo: !!data.siguiendo,
            solicitudPendiente: !!data.solicitudPendiente
        };

        ponerTexto("nombrePerfil", nombrePerfil);
        ponerTexto("contadorSeguidores", `${data.seguidores || 0} seguidores - ${data.seguidos || 0} seguidos`);
        ponerTexto("bioPerfil", perfil?.bio || "Bienvenido a mi perfil de ISTLC Zone.");
        ponerTexto("detalleViveEn", texto(perfil?.viveEn));
        ponerTexto("detalleCarrera", texto(perfil?.carrera));
        ponerTexto("detalleSemestre", texto(perfil?.semestre));

        const fotoPerfil = document.getElementById("fotoPerfil");
        if (fotoPerfil) {
            fotoPerfil.src = perfil?.fotoPerfil || "images/icono.png";
            fotoPerfil.alt = `Foto de ${nombrePerfil}`;
        }

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

function texto(valor) {
    return valor && String(valor).trim() ? valor : "No registrado";
}

function ponerTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = valor;
    }
}

function mostrarToastAppSeguro(mensaje, tipo) {
    if (typeof mostrarToastApp === "function") {
        mostrarToastApp(mensaje, tipo);
    } else {
        alert(mensaje);
    }
}

async function cargarCumpleañosAmigos() {
    const esMiPerfil = Number(perfilConsultadoId) === Number(usuario.id);
    ponerTexto("tituloCumpleanos", esMiPerfil ? "Próximos cumpleaños" : "Cumpleaños del perfil");
    listaCumpleaños.innerHTML = `
        <p class="text-muted">Cargando cumpleaños...</p>
    `;

    if (!esMiPerfil) {
        if (!perfilMostrado?.fechaNacimiento) {
            listaCumpleaños.innerHTML = `
                <p class="text-muted">
                    Este perfil aún no tiene fecha de cumpleaños registrada.
                </p>
            `;
            return;
        }

        listaCumpleaños.innerHTML = tarjetaCumpleaños(perfilMostrado);
        return;
    }

    try {
        const respuesta = await fetch(
            `${API_BASE}/api/auth/following/${perfilConsultadoId}?currentUserId=${usuario.id}`
        );

        const data = await respuesta.json();

        console.log("Usuarios recibidos:", data);

        if (!respuesta.ok || !data.success) {
            throw new Error(data.message || "No se pudieron cargar los usuarios");
        }

        const amigos = data.usuarios
            .filter((persona) => persona.fechaNacimiento);

        if (!amigos.length) {
            listaCumpleaños.innerHTML = `
                <p class="text-muted">
                    Tus amigos aún no tienen fecha de cumpleaños registrada.
                </p>
            `;
            return;
        }

        amigos.sort((a, b) => {
            return diasHastaCumpleaños(a.fechaNacimiento) -
                   diasHastaCumpleaños(b.fechaNacimiento);
        });

        listaCumpleaños.innerHTML = amigos.map(tarjetaCumpleaños).join("");

    } catch (error) {
        console.error("Error cargando cumpleaños:", error);

        listaCumpleaños.innerHTML = `
            <p class="text-danger">
                No se pudieron cargar los cumpleaños.
            </p>
        `;
    }
}

function tarjetaCumpleaños(persona) {
    return `
        <div class="cumple-card">
            <img
                src="${persona.fotoPerfil || "images/icono.png"}"
                alt="${persona.nombre || "Usuario"}"
            >

            <div class="flex-grow-1">
                <h5>${persona.nombre || "Usuario"}</h5>

                <p class="mb-1">
                    Cumpleaños: ${formatearFecha(persona.fechaNacimiento)}
                </p>

                <small>
                    Faltan ${diasHastaCumpleaños(persona.fechaNacimiento)} días
                </small>
            </div>

            <a
                href="perfil.html?id=${persona.id}"
                class="btn btn-warning btn-sm">
                Ver perfil
            </a>
        </div>
    `;
}

function diasHastaCumpleaños(fechaNacimiento) {
    const fechaTexto = fechaNacimiento.substring(0, 10);
    const partes = fechaTexto.split("-");

    const hoy = new Date();
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);

    let proximoCumple = new Date(hoy.getFullYear(), mes, dia);

    if (proximoCumple < hoy) {
        proximoCumple.setFullYear(hoy.getFullYear() + 1);
    }

    const diferencia = proximoCumple - hoy;

    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

function formatearFecha(fechaNacimiento) {
    const fechaTexto = fechaNacimiento.substring(0, 10);
    const partes = fechaTexto.split("-");

    const fecha = new Date(
        2026,
        parseInt(partes[1], 10) - 1,
        parseInt(partes[2], 10)
    );

    return fecha.toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "long"
    });
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}
