const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuarioLogueado) {
    window.location.href = "index.html";
}

const parametros = new URLSearchParams(window.location.search);
const idPerfil = parametros.get("id") || usuarioLogueado.id;

let usuario = null;

document.addEventListener("DOMContentLoaded", async () => {
    configurarLinksPerfil();
    await cargarPerfilVisto();
});

function configurarLinksPerfil() {
    document.getElementById("linkTodo").href = `perfil.html?id=${idPerfil}`;
    document.getElementById("linkInformacion").href = `informacion.html?id=${idPerfil}`;
    document.getElementById("linkFotos").href = `fotos.html?id=${idPerfil}`;
    document.getElementById("linkAmigos").href = `amigos.html?id=${idPerfil}`;
    document.getElementById("linkCumpleanos").href = `cumpleaños.html?id=${idPerfil}`;
}

async function cargarPerfilVisto() {
    try {
        const respuesta = await fetch(`${API_BASE}/api/auth/profile/${idPerfil}`);
        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error("No se pudo cargar el perfil");
        }

        usuario = data.usuario;
        usuario.seguidores = data.seguidores;
        usuario.seguidos = data.seguidos;

        pintarInformacion();

    } catch (error) {
        console.error(error);
        alert("No se pudo cargar la información del usuario.");
    }
}

function pintarInformacion() {
    document.getElementById("fotoPerfil").src =
        usuario.fotoPerfil || "images/icono.png";

    document.getElementById("nombrePerfil").textContent =
        usuario.nombre || "Usuario";

    document.getElementById("contadorSeguidores").textContent =
        `${usuario.seguidores || 0} seguidores - ${usuario.seguidos || 0} seguidos`;

    document.getElementById("bioPerfil").textContent =
        usuario.bio || "Bienvenido a mi perfil de ISTLC Zone.";

    document.getElementById("detalleViveEn").textContent =
        usuario.viveEn || "No registrado";

    document.getElementById("detalleCarrera").textContent =
        usuario.carrera || "No registrado";

    document.getElementById("detalleSemestre").textContent =
        usuario.semestre || "No registrado";

    document.getElementById("bioInfo").textContent =
        usuario.bio || "Bienvenido a mi perfil de ISTLC Zone.";

    document.getElementById("nombreInfo").textContent =
        usuario.nombre || "No registrado";

    document.getElementById("usuarioInfo").textContent =
        usuario.usuario || "No registrado";

    document.getElementById("viveEn").textContent =
        usuario.viveEn || "No registrado";

    document.getElementById("lugarOrigen").textContent =
        usuario.lugarOrigen || "No registrado";

    document.getElementById("fechaNacimiento").textContent =
        usuario.fechaNacimiento || "No registrado";

    document.getElementById("estadoCivil").textContent =
        usuario.estadoCivil || "No registrado";

    document.getElementById("carrera").textContent =
        usuario.carrera || "No registrado";

    document.getElementById("semestre").textContent =
        usuario.semestre || "No registrado";

    document.getElementById("seguidoresInfo").textContent =
        usuario.seguidores || 0;

    document.getElementById("seguidosInfo").textContent =
        usuario.seguidos || 0;
    
    document.getElementById("perfilHeader")?.classList.remove("perfil-cargando");
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}