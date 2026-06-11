const API_BASE =
    window.location.hostname.includes("onrender.com")
        ? window.location.origin
        : "http://localhost:3000";

const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
    cargarDatosPerfil();
    cargarContadores();
});

function cargarDatosPerfil() {
    document.getElementById("fotoPerfil").src =
        usuario.fotoPerfil || "images/icono.png";

    document.getElementById("nombrePerfil").textContent =
        usuario.nombre || "Usuario";

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
}

async function cargarContadores() {
    try {
        const respuesta = await fetch(
            `${API_BASE}/api/auth/users?q=&currentUserId=${usuario.id}`
        );

        const data = await respuesta.json();

        if (!respuesta.ok || !data.success) {
            throw new Error("No se pudieron cargar los seguidores");
        }

        const usuarioActual = data.usuarios.find((u) => u.id === usuario.id);

        const seguidores = usuarioActual?.seguidores || usuario.seguidores || 0;
        const seguidos = usuarioActual?.seguidos || usuario.seguidos || 0;

        document.getElementById("contadorSeguidores").textContent =
            `${seguidores} seguidores - ${seguidos} seguidos`;

        document.getElementById("seguidoresInfo").textContent = seguidores;
        document.getElementById("seguidosInfo").textContent = seguidos;

    } catch (error) {
        console.error(error);

        document.getElementById("contadorSeguidores").textContent =
            `${usuario.seguidores || 0} seguidores - ${usuario.seguidos || 0} seguidos`;

        document.getElementById("seguidoresInfo").textContent =
            usuario.seguidores || 0;

        document.getElementById("seguidosInfo").textContent =
            usuario.seguidos || 0;
    }
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}