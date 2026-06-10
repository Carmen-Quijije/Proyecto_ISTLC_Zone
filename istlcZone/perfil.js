const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));

if (!usuario) {
    window.location.href = "index.html";
}

const nombreUsuario =
    usuario?.nombre || usuario?.nombreCompleto || usuario?.usuario || "Usuario";

document.addEventListener("DOMContentLoaded", () => {
    cargarDatosUsuario();
    cargarContadores();
    cargarAmigosPerfil();
});

function cargarDatosUsuario() {
    document.getElementById("nombrePerfil").textContent = nombreUsuario;
    document.getElementById("nombrePost").textContent = nombreUsuario;

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

    if (usuario.fotoPerfil) {
        document.getElementById("fotoPerfil").src = usuario.fotoPerfil;
    }
}

function cargarContadores() {
    document.getElementById("contadorSeguidores").textContent =
        "0 seguidores - 0 seguidos";
}

function cargarAmigosPerfil() {
    const listaAmigos = document.getElementById("listaAmigos");
    const contadorAmigos = document.getElementById("contadorAmigos");

    contadorAmigos.textContent = "0 amigos";
    listaAmigos.innerHTML = `
        <div class="col-12">
            <p class="text-muted mb-2">
                Aun no tienes amigos agregados.
            </p>

            <a href="amigos.html" class="btn btn-warning w-100">
                Buscar amigos
            </a>
        </div>
    `;
}

function cerrarSesion() {
    localStorage.removeItem("usuarioLogueado");
    window.location.href = "index.html";
}
