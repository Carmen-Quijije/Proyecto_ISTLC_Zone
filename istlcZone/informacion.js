const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {

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
});

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}